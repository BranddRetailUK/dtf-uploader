# Read This First

Read `AGENTS.md` before starting any new task in this repository.
Update `AGENTS.md` after any meaningful codebase change.

`AGENTS.md` is the operational source of truth for codebase structure, architecture, routes, data model, conventions, and current behavior.
If APIs, business rules, or feature scope change, update `contract.md` in the same task.

## Current App Map

- `src/app/page.tsx`
  Primary upload page.
  Logged-out users see a centered signup/login card with the Lami logo above it.
  Logged-in users see the artwork uploader with a left-column preview window, right-column file box, price block, send button, and an upload modal tied to real upload completion.
  Each uploaded artwork card now includes a styled arrow-stepper quantity control; the billed upload count and price summary use the summed per-file quantities rather than unique file count alone.
  The upload page no longer shows an introductory heading/copy above the two-column workspace.
  The preview window uses a custom rendered file preview with no browser PDF toolbar, accepts drag/drop uploads directly, shows left/right controls when multiple files are loaded, and renders PDFs as a fit-to-window first-page canvas to avoid scrollbar re-render loops.
- `src/app/signup/page.tsx`
  Customer auth screen with signup selected by default.
- `src/app/login/page.tsx`
  Customer auth screen with login selected by default.
- `src/app/profile/page.tsx`
  Authenticated order history with per-order totals plus file-level status and quantity.
  The logout button lives on this page rather than in the shared header.
- `src/app/admin/login/page.tsx`
  Admin-only login entrypoint.
- `src/app/admin/page.tsx`
  Admin inbox with customer details, order totals, file links, per-file quantity, and status controls.
- `src/app/layout/page.tsx`
  V2 saved-layout workspace for artwork layout on a `560mm x 1000mm` template canvas.
  The page auto-provisions a saved layout shell when needed, persists background-mode changes through authenticated APIs, and removes developer-facing placeholder copy.
  The preview window now acts as the artwork intake area: users can drag/drop or choose image artwork directly into the canvas, select pieces, drag them, arrange all pieces, and duplicate the selected piece into a bounded grid.
  Artwork sizing is now controlled from grouped `W` and `H` millimetre steppers in the left-hand artwork list instead of preview-side resize chrome, and the number between the arrows is directly editable.
  Parent artwork rows now also include an editable copy-count stepper; changing that value adds or removes grouped duplicates directly from the child list.
  Duplicates are grouped under their original artwork in the list, and parent size changes resize the whole duplicate group.
  New artwork auto-lands from the top-left across the row, then below when the row is full; arrange and duplicate both respect the printable bounds, and duplicate spacing uses a `10mm` gap.
  Artwork pieces on `/layout` still use browser object URLs only for now; Cloudinary-backed V2 asset uploads and persisted layout items are still pending.
- `src/app/api/**`
  JSON/API surface for auth, order creation, authenticated file delivery, Cloudinary signing/finalization, admin status updates, and V2 layout create/list/update routes.

## Main Flows

- Auth:
  Signup creates a normal `USER`, hashes the password with bcrypt, creates a DB-backed session, and sets an HTTP-only cookie.
  Login validates the password, optionally enforces admin-only access, and sets the same session cookie.
  Logout deletes the persisted session and clears the cookie.
- Upload:
  The client selects artwork files, previews the selected file locally when possible, and calculates price client-side using shared pricing constants.
  Each selected artwork keeps a non-editable quantity that is adjusted with left/right arrow controls on the artwork card.
  The preview panel renders PDFs without the browser PDF toolbar, renders images inline, falls back to a file placeholder for unsupported preview types, and acts as a drag/drop target when empty or populated.
  On upload, the app first creates an order plus `order_files` records in PostgreSQL.
  Each `order_files` row stores the original upload plus its billed quantity; `Order.fileCount` stores the summed quantity across the order.
  After the order exists, the UI starts the upload modal and background-upload flow.
  Each file gets a signed Cloudinary upload config from the server and uploads directly to Cloudinary under `DTF/{userId}/{orderId}`.
  Successful upload finalization is verified server-side against Cloudinary before URL/bytes are persisted by checking the expected Cloudinary public ID and trusted raw-upload URL; browser-supplied file URLs are never trusted.
  Profile/admin file opening goes through an authenticated app route that redirects to a signed Cloudinary raw delivery URL, because the stored raw upload URLs are not relied on as customer-facing links.
  Order status is derived from file upload states: any failure -> `FAILED`, all uploaded -> `RECEIVED`, otherwise `UPLOADING`.
- Layout V2:
  Authenticated users land directly in the canvas without needing a visible create-layout action; a saved layout shell is created automatically when needed.
  Layout background mode saves through `/api/layouts/:layoutId` and reloads on revisit.
  The preview canvas accepts direct artwork intake, supports selection, drag, arrange, and duplicate interactions, and keeps artwork inside the printable bounds.
  Piece sizing and copy count are adjusted from editable steppers in the artwork list, duplicates are grouped beneath their original artwork, and parent size changes resize the entire duplicate group.
  The preview canvas no longer shows a bounding box, resize handle, or file-title badge on each artwork.
  The V2 artwork pieces still use browser object URLs only; Cloudinary-backed asset upload and persisted layout items are not implemented yet.
- Layout and branding:
  The public customer entry is a logo-plus-auth screen rather than a marketing landing page.
  The shared customer theme uses a white background, `#1c1c1c` text, Poppins typography, and `#7e00ff` accents.
  The signed-in header uses a separate logo asset from the public auth screen.
  In the signed-in header, upload/layout/admin navigation sits directly to the right of the logo, and the profile link is a right-aligned icon button.
- Admin:
  Admins can review all orders and move them through `RECEIVED`, `IN_PRODUCTION`, `COMPLETED`, or `FAILED`.
- V2 canvas:
  `/layout` now provides the interactive template area, background toggle, direct artwork intake, duplicate grouping under parent artworks, and local arrange/duplicate controls with left-list width/height/copy steppers.

## Data Model Summary

- `User`
  `role`, `firstName`, `lastName`, `companyName`, `email`, `passwordHash`
- `Session`
  DB-backed session token hash with expiry
- `Order`
  `status`, `fileCount`, `subtotalPence`, `vatPence`, `totalPence`
- `OrderFile`
  Original filename, mime type, size, billed `quantity`, Cloudinary identifiers/URL, upload status, optional error
- `Layout`
  `name`, `backgroundMode`, `canvasWidthMm`, `canvasHeightMm`
- `LayoutItem`
  `artworkAssetId`, `xMm`, `yMm`, `widthMm`, `heightMm`, `rotationDeg`, `quantity`, `zIndex`
- `ArtworkAsset`
  Original filename, mime type, size, optional dimensions/dpi metadata, upload status, Cloudinary identifiers/URL, optional error
- `RateLimitBucket`
  DB-backed fixed-window request throttle buckets for auth and upload mutations

## Routes And Guards

- Public:
  `/`, `/signup`, `/login`, `/admin/login`
- Authenticated user:
  `/profile`, `/layout`
- Authenticated admin:
  `/admin`

Guards are implemented in server-side page loaders and API route checks, not middleware, because Prisma-backed auth needs the Node runtime.

## Environment Requirements

- `DATABASE_URL`
- `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- Admin bootstrap values for the seed flow:
  `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_COMPANY_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Railway deploy behavior:
  `npm start` runs `prisma migrate deploy` before `next start`, so production boots against an up-to-date schema.

## Conventions

- Prices are stored in pence, never floats.
- VAT is fixed at 20%.
- `Order.fileCount` is the summed billed quantity across all order files, not just the number of unique uploaded assets.
- V1 accepts any file type up to the existing per-file size limit.
- Direct Cloudinary uploads are verified as trusted raw assets during finalize; the server no longer restricts uploads to PDFs.
- The upload modal follows real upload completion instead of a fixed timer.
- The public home page has no header; the header appears only after authentication.
- Shared business rules live in `src/lib/*`.
- Route handlers return JSON and perform server-side validation with Zod.
- Public auth/upload mutation routes are rate-limited in PostgreSQL-backed fixed windows.
- Only trusted `https://res.cloudinary.com/<cloud_name>/raw/upload/...` URLs are exposed back to the UI.
- V2 reserves `DTF_LAYOUT/...` for layout artwork assets and `DTF_LAYOUT_OUTPUT/...` for generated layout outputs.
- Git hygiene:
  Commit `.env.example`.
  Never commit `.env`.
  Root `.gitignore` is the source of truth for local secret/build-file exclusions.

## Known Placeholders

- `/layout` now supports direct artwork intake plus local drag/arrange/duplicate interactions with parent-controlled size and copy steppers, but V2 artwork asset uploads and persisted layout items are still pending.
- No checkout/payment flow exists in V1.
- Cloudinary uploads are direct-to-cloud; no local file persistence exists on the app server.

## Canonical References

- Feature/API/business-rule contract: `contract.md`
- Delivery setup and V2 roadmap: `README.md`
- Database schema and enums: `prisma/schema.prisma`
- Initial migration history: `prisma/migrations/`
- Environment template: `.env.example`
