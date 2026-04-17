# DTF Uploader Contract

## Purpose

- Provide a customer-facing artwork upload flow for DTF jobs.
- Store uploads in Cloudinary under a `DTF/` folder hierarchy.
- Persist users, orders, files, and statuses in PostgreSQL.
- Expose a simple admin inbox for received work.
- Provide the first persisted V2 layout workspace on `/layout`, with saved layout shells and background mode.

## Scope

- V1 includes auth, artwork uploads, Cloudinary persistence, profile history, pricing display, and admin status updates.
- V1 does not include online payment.
- V2 now includes an interactive layout canvas with persisted background mode.
- V2 does not yet include Cloudinary-backed layout asset uploads or persisted layout items across reloads.

## Business Rules

- Price per file: `£14.00`.
- VAT: `20%`.
- Totals are stored in pence.
- Each uploaded artwork has a quantity of at least `1`.
- Order `fileCount` = `sum(orderFile.quantity)`.
- Order subtotal = `fileCount * 1400`.
- Order VAT = `round(subtotal * 0.20)`.
- Order total = `subtotal + vat`.
- A successful upload is not accepted from browser metadata alone:
  - the browser reports only the Cloudinary `public_id`
  - the server verifies the asset exists in Cloudinary
  - the server verifies the asset is a trusted `raw` upload URL
  - the stored URL/bytes come from verified Cloudinary metadata, not the browser payload
- Only trusted Cloudinary HTTPS raw-upload URLs are exposed back to profile/admin responses.
- Customer/admin file opening is served through an authenticated app route that redirects to a signed Cloudinary raw delivery URL.
- Public auth and upload mutation endpoints are rate-limited.
- Upload UX:
  - each artwork card has a quantity stepper with arrow buttons; manual number entry is not allowed
  - after order creation, the UI shows an upload modal while background uploads are running
  - the success state is shown only after the real upload completes
  - the success tick remains visible briefly before the order view refreshes
  - real upload failures are persisted and surfaced later in profile/admin
- V2 layout UX:
  - authenticated users land directly in the layout canvas without a visible create-layout step
  - layout background mode persists to PostgreSQL
  - artwork can be added directly onto the preview by drag/drop or file picker
  - each artwork can be selected, dragged, arranged, and duplicated in a bounded grid
  - each parent artwork row in the left-hand list exposes `W` and `H` millimetre steppers with a directly editable number field between the arrows
  - manual size entry allows `0mm` while typing instead of snapping to a `40mm` minimum
  - each parent artwork row also exposes a copy-count stepper with arrow buttons and direct number entry
  - duplicate rows are grouped under their original artwork in the left-hand list
  - parent size changes resize the entire duplicate group while keeping duplicate spacing at `10mm`
  - changing the copy count adds or removes child duplicates directly from the grouped list
  - new artwork is placed top-left first, then across the row, then below when horizontal space runs out
  - duplicated artwork uses a `10mm` gap
  - the V2 artwork pieces are still local-only until layout asset uploads are implemented
- Order status derivation during upload finalization:
  - any file `FAILED` => order `FAILED`
  - all files `UPLOADED` => order `RECEIVED`
  - otherwise => order `UPLOADING`

## Data Contract

### User

- `id: string`
- `role: USER | ADMIN`
- `firstName: string`
- `lastName: string`
- `companyName: string`
- `email: string (unique, lowercase)`
- `passwordHash: string`
- `createdAt: datetime`
- `updatedAt: datetime`

### Session

- `id: string`
- `userId: string`
- `tokenHash: string (unique)`
- `expiresAt: datetime`
- `createdAt: datetime`
- `updatedAt: datetime`

### Order

- `id: string`
- `userId: string`
- `status: UPLOADING | RECEIVED | IN_PRODUCTION | COMPLETED | FAILED`
- `fileCount: integer`
- `subtotalPence: integer`
- `vatPence: integer`
- `totalPence: integer`
- `createdAt: datetime`
- `updatedAt: datetime`

### OrderFile

- `id: string`
- `orderId: string`
- `originalName: string`
- `mimeType: string`
- `bytes: integer`
- `quantity: integer`
- `uploadStatus: PENDING | UPLOADING | UPLOADED | FAILED`
- `cloudinaryPublicId: string | null`
- `cloudinaryUrl: string | null`
- `errorMessage: string | null`
- `createdAt: datetime`
- `updatedAt: datetime`

### Layout

- `id: string`
- `userId: string`
- `name: string`
- `backgroundMode: LIGHT | DARK`
- `canvasWidthMm: integer`
- `canvasHeightMm: integer`
- `createdAt: datetime`
- `updatedAt: datetime`

### ArtworkAsset

- `id: string`
- `userId: string`
- `originalName: string`
- `mimeType: string`
- `bytes: integer`
- `widthPx: integer | null`
- `heightPx: integer | null`
- `dpiX: integer | null`
- `dpiY: integer | null`
- `aspectRatio: number | null`
- `uploadStatus: PENDING | UPLOADING | UPLOADED | FAILED`
- `cloudinaryPublicId: string | null`
- `cloudinaryUrl: string | null`
- `errorMessage: string | null`
- `createdAt: datetime`
- `updatedAt: datetime`

### LayoutItem

- `id: string`
- `layoutId: string`
- `artworkAssetId: string`
- `xMm: number`
- `yMm: number`
- `widthMm: number`
- `heightMm: number`
- `rotationDeg: number`
- `quantity: integer`
- `zIndex: integer`
- `createdAt: datetime`
- `updatedAt: datetime`

### RateLimitBucket

- `id: string`
- `bucketKey: string`
- `windowStart: datetime`
- `count: integer`
- `createdAt: datetime`
- `updatedAt: datetime`

## Page Contract

### `/`

- Logged out:
  - centered customer auth card with signup/login switching
  - Lami logo above the auth card
- Logged in:
  - two-column upload layout
  - left-column selected file preview window with no browser PDF toolbar
  - PDF previews render the first page fitted inside the preview pane
  - the preview window accepts drag/drop file uploads
  - left/right preview arrows appear when multiple files are loaded
  - right-column multi-file artwork selection box
  - each artwork card includes a quantity stepper with left/right arrows
  - price summary below the upload box
  - price summary reflects the summed billed quantity across all artwork cards
  - send button below the price summary
  - upload modal tied to real upload completion

### `/signup`

- same customer auth screen as `/`, with signup selected by default

### `/login`

- same customer auth screen as `/`, with login selected by default

### `/profile`

- Show only the signed-in user’s orders.
- Show all files within each order.
- Show the quantity stored against each uploaded artwork.
- Show collated subtotal, VAT, and total per order.
- Show file/order failure states if background upload later failed.

### `/admin/login`

- Admin-only login entrypoint.

### `/admin`

- Admin-only order inbox.
- Show customer details, totals, files, and current status.
- Show the quantity stored against each uploaded artwork.
- Allow status updates to:
  - `RECEIVED`
  - `IN_PRODUCTION`
  - `COMPLETED`
  - `FAILED`

### `/layout`

- Authenticated V2 saved-layout workspace.
- Fixed `560mm x 1000mm` template preview area.
- Light/dark background toggle persisted to the selected layout.
- Direct artwork intake on the preview via drag/drop or file picker.
- Parent artwork sizing is edited from `W` and `H` steppers in the left-hand artwork list, with direct number entry between the arrows.
- Size inputs can be typed down to `0mm`, so entering values like `100mm` no longer snaps the artwork up to a `40mm` minimum mid-entry.
- Parent artwork copy count is edited from a matching stepper with direct number entry.
- The preview does not show file-title badges, resize handles, or bounding boxes on artwork.
- `Arrange` repacks current artwork inside the printable bounds.
- `Duplicate` adds another bounded-grid copy for the selected artwork group, respecting the `10mm` gap and preview bounds.
- Local artwork list groups duplicates beneath their original artwork and only exposes size/copy controls on the parent row.

## Endpoint Contract

### `POST /api/auth/signup`

- Request:
  - `firstName`
  - `lastName`
  - `companyName`
  - `email`
  - `password`
- Logic:
  - validate payload
  - lowercase email
  - apply fixed-window rate limits
  - reject duplicates
  - hash password
  - create `USER`
  - create session + cookie
- Response:
  - `user`
  - may return `429`

### `POST /api/auth/login`

- Request:
  - `email`
  - `password`
  - `adminOnly?: boolean`
- Logic:
  - validate payload
  - lookup user
  - verify password hash
  - apply fixed-window rate limits
  - if `adminOnly`, require role `ADMIN`
  - create session + cookie
- Response:
  - `user`
  - may return `429`

### `POST /api/auth/logout`

- Logic:
  - delete persisted session for current cookie token if present
  - clear cookie
- Response:
  - `ok: true`

### `POST /api/orders`

- Auth:
  - logged-in user required
- Request:
  - `files: [{ clientId, name, size, type, quantity }]`
- Logic:
  - validate file metadata
  - apply fixed-window rate limits
  - calculate totals from the summed file quantities
  - create one `Order`
  - create one `OrderFile` per input file and persist its quantity
- Response:
  - `orderId`
  - `pricing`
  - `files: [{ id, clientId, originalName }]`
  - may return `429`

### `GET /api/orders`

- Auth:
  - logged-in user required
- Response:
  - list of current user orders with file details and totals

### `POST /api/uploads/sign`

- Auth:
  - logged-in user required
- Request:
  - `orderId`
  - `orderFileId`
- Logic:
  - confirm the order/file belongs to the user
  - apply fixed-window rate limits
  - mark file `UPLOADING`
  - generate a signed Cloudinary upload payload
- Response:
  - `cloudName`
  - `apiKey`
  - `timestamp`
  - `signature`
  - `folder`
  - `publicId`
  - `tags`
  - `resourceType`
  - `uploadUrl`
  - may return `429`

### `POST /api/uploads/finalize`

- Auth:
  - logged-in user required
- Request:
  - `orderId`
  - `orderFileId`
  - `success`
  - success payload: `cloudinaryPublicId`
  - failure payload: `errorMessage`
- Logic:
  - apply fixed-window rate limits
  - verify successful uploads against Cloudinary using the expected per-file public ID
  - reject assets that are not verified trusted raw uploads
  - update the file row from verified Cloudinary metadata
  - recalculate the parent order status from all file states
- Response:
  - updated order summary
  - may return `422` when asset verification fails
  - may return `429`

### `GET /api/files/:fileId`

- Auth:
  - logged-in user required
- Access:
  - file owner or admin only
- Logic:
  - verify the file exists and belongs to the current user unless admin
  - require an uploaded file with trusted stored Cloudinary metadata
  - generate a signed Cloudinary raw delivery URL from the stored public ID
  - redirect the browser to that signed URL
- Response:
  - redirect to signed file delivery URL

### `GET /api/admin/orders`

- Auth:
  - admin required
- Response:
  - all orders with customer details, files, and totals

### `PATCH /api/admin/orders/:orderId`

- Auth:
  - admin required
- Request:
  - `status: RECEIVED | IN_PRODUCTION | COMPLETED | FAILED`
- Logic:
  - validate status
  - update order status
- Response:
  - updated order summary

### `GET /api/layouts`

- Auth:
  - logged-in user required
- Response:
  - list of current user layouts with layout items

### `POST /api/layouts`

- Auth:
  - logged-in user required
- Request:
  - `name?: string`
  - `backgroundMode?: LIGHT | DARK`
- Logic:
  - create a saved layout for the current user
  - default the canvas size to `560mm x 1000mm`
- Response:
  - `layout`

### `PATCH /api/layouts/:layoutId`

- Auth:
  - logged-in user required
- Request:
  - `name?: string`
  - `backgroundMode?: LIGHT | DARK`
  - `items?: [{ artworkAssetId, xMm, yMm, widthMm, heightMm, rotationDeg, quantity, zIndex }]`
- Logic:
  - ensure the layout belongs to the current user
  - optionally replace the saved layout items
  - reject artwork assets that are not owned by the current user
- Response:
  - updated layout

## Environment Contract

- `DATABASE_URL`
- `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- Optional admin bootstrap values for seed:
  - `ADMIN_FIRST_NAME`
  - `ADMIN_LAST_NAME`
  - `ADMIN_COMPANY_NAME`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`

## Invariants

- Emails are stored lowercase.
- Passwords are never stored in plaintext.
- Session cookies are HTTP-only and same-site lax.
- Monetary values are integers in pence.
- Users can only read their own orders.
- Only admins can read/update all orders.
- `Order.fileCount` must equal the summed `OrderFile.quantity` values.
- Stored Cloudinary links must be trusted `res.cloudinary.com/<cloud_name>/raw/upload` HTTPS URLs.
- V2 layout asset storage is reserved for `DTF_LAYOUT/...` and layout outputs for `DTF_LAYOUT_OUTPUT/...`.
- Public-facing UI uses a white background, `#1c1c1c` text, Poppins typography, and `#7e00ff` as the primary accent.
- `contract.md` must be updated whenever APIs, business rules, or scope change.
