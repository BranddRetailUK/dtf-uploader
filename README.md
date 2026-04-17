# DTF Uploader

Railway-ready Next.js app for customer PDF uploads, Cloudinary storage, PostgreSQL-backed auth, profile history, and an admin inbox.

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
