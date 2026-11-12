# AML Study Checklist

A small, responsive web app that helps AML Certification Centre learners keep track of their study tasks.

## Features

- **View tasks** stored in PostgreSQL, newest first.
- **Add tasks** with the "Add task" button or by pressing Enter. Titles are trimmed and must be 1–200 characters (checked in the browser and on the server).
- **Complete / reopen tasks** with a checkbox. The change shows instantly, is saved to the database, and is rolled back with an error message if saving fails.
- **Delete tasks** after a confirmation prompt.
- **Progress** counter ("3 of 5 tasks completed") with a progress bar.
- Loading, saving and error states; the typed task is kept if saving fails.

## How to use

1. **Add a study task.** Type a title in the **New study task** field and select **Add task** (or press Enter). The task appears at the top of the list and the field clears, ready for the next one.
2. **Mark a task complete.** Tick the checkbox next to the task. Its title is struck through. To **reopen** it, untick the checkbox.
3. **Delete a task.** Select the bin icon on the right of the task. Your browser asks you to confirm; choose **OK** to delete it permanently or **Cancel** to keep it. Deletion cannot be undone.
4. **Track your progress.** Above the list, the counter shows how many tasks are done (for example, "3 of 5 tasks completed"), and the progress bar fills in proportion to the completed share.

### Shared demo behaviour

This is a **shared demonstration checklist**. There are no user accounts: everyone who opens the app sees and edits the same tasks, so anything you add, complete or delete changes the list for all visitors. The page refreshes the list from the server every 10 seconds (and when you return to the tab), so changes made on another device appear automatically. The database starts empty; no example tasks are created.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes (at runtime) | PostgreSQL connection string. On Railway, reference the PostgreSQL service's `DATABASE_URL`. |
| `PORT` | Set by Railway | Port the server listens on (defaults to 3000). |

See `.env.example` for the format. Never commit a real `.env` file.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies and generates the Prisma client. |
| `npm run build` | Generates the Prisma client and builds the app. Does **not** need a database connection. |
| `npm start` | Applies committed migrations (`prisma migrate deploy`), then starts the production server on `0.0.0.0:$PORT`. |
| `npm run lint` | Runs ESLint. |
| `npm run typecheck` | Runs the TypeScript compiler without emitting files. |

`prisma migrate deploy` only applies new, committed migrations. It never resets the database, so existing tasks are preserved across deployments.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/tasks` | List tasks (newest first). |
| `POST` | `/api/tasks` | Create a task: `{ "title": "..." }`. |
| `PATCH` | `/api/tasks/:id` | Set completion: `{ "completed": true }`. |
| `DELETE` | `/api/tasks/:id` | Delete a task. |

Server errors are logged on the server; the browser only receives a generic message.

## Deploying on Railway

1. Create a Railway project with a **PostgreSQL** service and an app service connected to this GitHub repository.
2. In the app service **Variables**, set `DATABASE_URL` to reference the PostgreSQL service (e.g. `${{Postgres.DATABASE_URL}}`).
3. Leave the build command as the default (`npm run build`) and the start command as the default (`npm start`). No pre-deploy command is needed: migrations run at startup.
4. Under **Settings → Networking**, generate a public domain.
5. Push to `main`. Railway builds and deploys automatically.

## Testing the deployed app

- [ ] The page loads with the title, subtitle, "Shared demo checklist" label and the empty-state message (on a fresh database).
- [ ] Add a task with the button, and another by pressing Enter. Both appear at the top and the input clears.
- [ ] Submitting an empty or spaces-only title shows "Please enter a task title." A 201-character title is rejected.
- [ ] Tick a task: the title is struck through and the counter/progress bar update. Untick it to reopen it.
- [ ] Delete a task: a confirmation appears; cancelling keeps it, confirming removes it.
- [ ] Refresh the page: tasks and completion states are unchanged.
- [ ] Redeploy the app on Railway: tasks are still there afterwards.
- [ ] Open the URL on a phone and a computer: both show the same tasks, and a change on one appears on the other within about 10 seconds. The phone layout has no horizontal scrolling and long titles wrap.
