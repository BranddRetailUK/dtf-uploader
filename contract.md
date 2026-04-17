# DTF Uploader Contract

## Purpose

- Provide a customer-facing PDF upload flow for DTF jobs.
- Store uploads in Cloudinary under a `DTF/` folder hierarchy.
- Persist users, orders, files, and statuses in PostgreSQL.
- Expose a simple admin inbox for received work.
- Reserve `/layout` as the V2 artwork layout workspace scaffold.

## Scope

- V1 includes auth, PDF uploads, Cloudinary persistence, profile history, pricing display, and admin status updates.
- V1 does not include online payment.
- V2 behavior is scaffolded visually only; no auto-arrange or duplication logic is implemented yet.

## Business Rules

- Price per PDF: `£14.00`.
- VAT: `20%`.
- Totals are stored in pence.
- Order subtotal = `fileCount * 1400`.
- Order VAT = `round(subtotal * 0.20)`.
- Order total = `subtotal + vat`.
- Only PDF files are accepted in V1 upload creation.
- Upload UX is optimistic:
  - after order creation, the UI shows a fixed 4-second animation
  - the animation is not tied to the real Cloudinary upload duration
  - real upload failures are persisted and surfaced later in profile/admin
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
- `uploadStatus: PENDING | UPLOADING | UPLOADED | FAILED`
- `cloudinaryPublicId: string | null`
- `cloudinaryUrl: string | null`
- `errorMessage: string | null`
- `createdAt: datetime`
- `updatedAt: datetime`

## Page Contract

### `/`

- Logged out:
  - centered customer auth card with signup/login switching
  - Lami logo above the auth card
- Logged in:
  - two-column upload layout
  - left-column selected PDF preview window
  - right-column multi-file PDF selection box
  - price summary below the upload box
  - send button below the price summary
  - fixed 4-second upload modal

### `/signup`

- same customer auth screen as `/`, with signup selected by default

### `/login`

- same customer auth screen as `/`, with login selected by default

### `/profile`

- Show only the signed-in user’s orders.
- Show all files within each order.
- Show collated subtotal, VAT, and total per order.
- Show file/order failure states if background upload later failed.

### `/admin/login`

- Admin-only login entrypoint.

### `/admin`

- Admin-only order inbox.
- Show customer details, totals, files, and current status.
- Allow status updates to:
  - `RECEIVED`
  - `IN_PRODUCTION`
  - `COMPLETED`
  - `FAILED`

### `/layout`

- Authenticated V2 scaffold page.
- Fixed `560mm x 1000mm` template preview area.
- Light/dark background toggle.
- Placeholder artwork tray.
- Placeholder `Arrange` and `Duplicate` controls.

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
  - reject duplicates
  - hash password
  - create `USER`
  - create session + cookie
- Response:
  - `user`

### `POST /api/auth/login`

- Request:
  - `email`
  - `password`
  - `adminOnly?: boolean`
- Logic:
  - validate payload
  - lookup user
  - verify password hash
  - if `adminOnly`, require role `ADMIN`
  - create session + cookie
- Response:
  - `user`

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
  - `files: [{ clientId, name, size, type }]`
- Logic:
  - validate PDF metadata
  - calculate totals
  - create one `Order`
  - create one `OrderFile` per input file
- Response:
  - `orderId`
  - `pricing`
  - `files: [{ id, clientId, originalName }]`

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

### `POST /api/uploads/finalize`

- Auth:
  - logged-in user required
- Request:
  - `orderId`
  - `orderFileId`
  - `success`
  - success payload: `cloudinaryPublicId`, `cloudinaryUrl`, `bytes`
  - failure payload: `errorMessage`
- Logic:
  - update the file row
  - recalculate the parent order status from all file states
- Response:
  - updated order summary

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
- Public-facing UI uses a white background, `#1c1c1c` text, Poppins typography, and `#7e00ff` as the primary accent.
- `contract.md` must be updated whenever APIs, business rules, or scope change.
