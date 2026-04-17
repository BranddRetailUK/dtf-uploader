# DTF Uploader

Railway-ready Next.js app for customer artwork uploads, Cloudinary storage, PostgreSQL-backed auth, profile history, and an admin inbox.

## Stack

- Next.js App Router
- Prisma + PostgreSQL
- Direct signed browser uploads to Cloudinary
- Cookie sessions with hashed passwords
- Tailwind CSS v4

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set a PostgreSQL `DATABASE_URL`.
3. Configure the Cloudinary credentials.
4. Run `npm install`.
5. Run `npm run db:generate`.
6. Run `npm run db:migrate`.
7. Optionally seed the first admin with `npm run db:seed`.
8. Start the app with `npm run dev`.

## Important Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:deploy`
- `npm run db:seed`

## Railway Deploys

- `npm start` now runs `prisma migrate deploy` before `next start`.
- Railway must have a valid `DATABASE_URL` attached to the service.
- If a deploy was already built before this change, redeploy after pushing so the migration step runs on boot.

## Project Contracts

- `AGENTS.md` is the operational source of truth for structure, flows, and conventions.
- `contract.md` is the feature/API/business-rule contract.

Read `AGENTS.md` before making changes and update it after meaningful changes.

## V2 Next Steps

The next phase is the layout workspace on `/layout`. The current route is only a shell. The next build sequence should be:

1. Artwork intake for layout mode
   - add a dedicated artwork tray for individual assets
   - upload layout assets to Cloudinary under a separate V2 folder path
   - capture real artwork dimensions, aspect ratio, and dpi metadata where possible
2. Layout data model
   - add database tables for saved layouts, layout items, and uploaded artwork assets
   - store canvas size, background mode, item position, item size, rotation, quantity, and z-order
   - associate each saved layout with the authenticated user
3. Template canvas interactions
   - drag, resize, and select artwork inside the `560mm x 1000mm` template
   - constrain placements to the printable bounds
   - show dimensions and spacing clearly while editing
4. Arrange feature
   - implement a packing algorithm that places all uploaded artworks in the most space-efficient way
   - keep orientation rules configurable so rotation can be allowed or blocked per asset type
   - return deterministic placement results so the same input produces the same layout
5. Duplicate feature
   - duplicate a selected artwork into a grid layout from the current size
   - let the user control rows, columns, gap, and fill direction
   - stop duplication when the next item would exceed the template bounds
6. Save and reload workflow
   - persist layouts to PostgreSQL
   - show saved layouts in the user profile or a dedicated layouts page
   - restore the exact item arrangement and background mode on reopen
7. Production output
   - export the finished layout as a print-ready file or generation job
   - store a final output artifact in Cloudinary
   - attach the output to the related order or a new layout-order flow

## Next Service Work

The next backend and platform work on this Railway service should be:

- Add new Prisma models and migrations for:
  - `Layout`
  - `LayoutItem`
  - `ArtworkAsset`
- Add authenticated API routes for:
  - create layout
  - update layout
  - list user layouts
  - upload/sign/finalize layout artwork assets
  - duplicate selected artwork
  - arrange all artwork
- Separate Cloudinary conventions:
  - keep upload-order files under `DTF/...`
  - store V2 layout assets under a distinct path such as `DTF_LAYOUT/...`
  - store generated final layout outputs under a dedicated output path
- Add background-safe job handling for heavier work:
  - layout arrangement retries
  - output generation
  - large-asset processing
- Add validation and limits for V2:
  - max artwork count per layout
  - max individual asset size
  - allowed mime types for layout assets
  - print-area boundary enforcement
- Add auditability and support tooling:
  - admin visibility into saved layouts and generated outputs
  - clear failure states when arrangement or export fails
  - logging around Cloudinary asset creation and output generation

## Recommended Build Order

To keep momentum and reduce rework, the next implementation order should be:

1. Prisma schema for layouts and assets
2. Cloudinary folder strategy for V2 assets and outputs
3. Layout artwork upload flow
4. Persisted canvas item model
5. Manual drag/resize placement
6. Duplicate tool
7. Arrange algorithm
8. Save/reload layouts
9. Final output generation
