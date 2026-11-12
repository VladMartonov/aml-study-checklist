# AML Study Checklist

A small web application built for a university assignment. Code lives in this GitHub repository, the app is hosted on Railway, and data is stored in a Railway PostgreSQL database.

## Tech stack

- Next.js with TypeScript
- Tailwind CSS for styling
- Prisma ORM with PostgreSQL

## Deployment

- Railway automatically deploys the `main` branch of this repository.
- The app reads its database connection from the `DATABASE_URL` environment variable, which is already configured in the Railway app service.
- We test the running application through its public Railway URL.

## Secrets and environment

- Never hard-code database credentials or commit secrets of any kind.
- Keep `.env` files git-ignored. Provide a safe `.env.example` with placeholder values only.

## Local environment

- Do not install a local database.
- Do not start a local development server.

## Build

- Once the application exists, run `npm run build` successfully before pushing application changes.
- The build must work without connecting to the live database. Database operations happen at runtime only (no database queries during build or static generation).

## Database and migrations

- Commit Prisma migration files to the repository.
- Apply migrations during deployment or startup on Railway (e.g. `prisma migrate deploy`).
- Preserve existing database records across deployments. Never reset the database, and never recreate demo data on every startup.

## Workflow

- After completing and checking a development task, commit and push the changes unless explicitly instructed otherwise.
- Keep the application small and focused on the agreed requirements. Do not add features beyond what has been agreed.
