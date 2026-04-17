# Read This First

Read `AGENTS.md` before starting any new task in this repository.
Update `AGENTS.md` after any meaningful codebase change.

`AGENTS.md` is the operational source of truth for codebase structure, architecture, routes, data model, conventions, and current behavior.
If APIs, business rules, or feature scope change, update `contract.md` in the same task.

## Current App Map

- `src/app/page.tsx`
  Primary upload page.
  Logged-out users see a centered signup/login card with the Lami logo above it.
  Logged-in users see the PDF uploader with a left-column preview window, right-column file box, price block, send button, and timed optimistic upload modal.
- `src/app/signup/page.tsx`
  Customer auth screen with signup selected by default.
- `src/app/login/page.tsx`
  Customer auth screen with login selected by default.
- `src/app/profile/page.tsx`
  Authenticated order history with per-order totals and file-level status.
- `src/app/admin/login/page.tsx`
  Admin-only login entrypoint.
- `src/app/admin/page.tsx`
  Admin inbox with customer details, order totals, file links, and status controls.
- `src/app/layout/page.tsx`
  V2 scaffold for artwork layout on a `560mm x 1000mm` template canvas.
- `src/app/api/**`
  JSON API surface for auth, order creation, Cloudinary signing/finalization, and admin status updates.

## Main Flows

- Auth:
  Signup creates a normal `USER`, hashes the password with bcrypt, creates a DB-backed session, and sets an HTTP-only cookie.
  Login validates the password, optionally enforces admin-only access, and sets the same session cookie.
  Logout deletes the persisted session and clears the cookie.
- Upload:
  The client validates/selects PDFs, previews the selected file locally, and calculates price client-side using shared pricing constants.
  On upload, the app first creates an order plus `order_files` records in PostgreSQL.
  After the order exists, the UI starts the fixed 4-second optimistic modal and background-upload flow.
  Each file gets a signed Cloudinary upload config from the server, uploads directly to Cloudinary under `DTF/{userId}/{orderId}`, then reports success/failure back to the app.
  Order status is derived from file upload states: any failure -> `FAILED`, all uploaded -> `RECEIVED`, otherwise `UPLOADING`.
- Layout and branding:
  The public customer entry is a logo-plus-auth screen rather than a marketing landing page.
  The shared customer theme uses a white background, `#1c1c1c` text, Poppins typography, and `#7e00ff` accents.
  The signed-in header uses a separate logo asset from the public auth screen.
- Admin:
  Admins can review all orders and move them through `RECEIVED`, `IN_PRODUCTION`, `COMPLETED`, or `FAILED`.
- V2 layout scaffold:
  `/layout` currently provides the shell, fixed template area, background toggle, and placeholder controls only.

## Data Model Summary

- `User`
  `role`, `firstName`, `lastName`, `companyName`, `email`, `passwordHash`
- `Session`
  DB-backed session token hash with expiry
- `Order`
  `status`, `fileCount`, `subtotalPence`, `vatPence`, `totalPence`
- `OrderFile`
  Original filename, mime type, size, Cloudinary identifiers/URL, upload status, optional error

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

## Conventions

- Prices are stored in pence, never floats.
- VAT is fixed at 20%.
- Only PDFs are accepted in V1 uploads.
- The optimistic upload modal is intentionally decoupled from real upload completion.
- The public home page has no header; the header appears only after authentication.
- Shared business rules live in `src/lib/*`.
- Route handlers return JSON and perform server-side validation with Zod.
- Git hygiene:
  Commit `.env.example`.
  Never commit `.env`.
  Root `.gitignore` is the source of truth for local secret/build-file exclusions.

## Known Placeholders

- `/layout` is scaffold-only for V2.
- No checkout/payment flow exists in V1.
- Cloudinary uploads are direct-to-cloud; no local file persistence exists on the app server.

## Canonical References

- Feature/API/business-rule contract: `contract.md`
- Database schema and enums: `prisma/schema.prisma`
- Initial migration history: `prisma/migrations/`
- Environment template: `.env.example`
