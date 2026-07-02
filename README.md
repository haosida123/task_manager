# Research Ledger — Task Manager

An academic-style task manager for tracking research projects, their latest updates,
next steps, priority, and effort. Built for keeping a growing portfolio of computational
mechanics / ML projects legible at a glance — inspired by Asana, styled like a journal.

Seeded with **your real projects and dated updates**, extracted from the weekly-update
slide deck (17 projects, 57 tasks, 92 dated log entries).

## What's inside

- **Portfolio dashboard** — every project in one ledger with priority + effort badges,
  progress bars, the latest update, and next steps. Search, filter (status / priority /
  area), and sort. Drag rows to reorder (the page auto-scrolls when you drag near an edge).
- **Edit straight from the dashboard** — area, priority, effort, progress, and status are
  editable **inline** in each row (click a badge to change it, drag the progress slider).
  Expand a row to edit the overview, manage next steps (add / check off / delete), and
  **log an update** — without leaving the page.
- **Binary status** — everything that isn't finished is **Undone** (the default view);
  **Done** acts like an archive and is hidden until you switch the Status filter to Done
  or All.
- **Project pages** — an editable "lab notebook": rename/describe, set status /
  priority / effort / progress / due date / collaborators / tags, a task checklist
  (with per-task priority & effort, drag to reorder), and a dated progress log.
- **Everything is editable and persists** — every field is editable in place and saved
  locally to a JSON file (`server/data/db.json`), with a green **"Saved locally"**
  confirmation — no more editing in PowerPoint.
- **Export for slides** — the **Export** button gives you (1) a **copy-paste table** that
  pastes into PowerPoint or Word as a real, editable table, (2) a **plain-text outline**,
  and (3) a downloadable **.xlsx / .csv** spreadsheet. For the table and text formats you
  can choose which columns to include (priority / effort / progress / status).
- **Backup & restore** — the **Data** button downloads a complete, re-importable JSON
  backup and restores from one (a snapshot is taken automatically before any restore).
  The server also keeps rolling local backups in `server/data/backups/`.

## Tech

React 18 + TypeScript + Vite (client) · Express + JSON file store (server). No database
to install, no native dependencies.

## Getting started

```bash
# 1. install dependencies (root + client)
npm run setup

# 2a. development — API on :4000, hot-reloading client on :5173
npm run dev
#    then open http://localhost:5173

# 2b. or production — build the client and serve everything from one port
npm run build
npm start
#    then open http://localhost:4000
```

On first launch the server copies `server/seed.json` into `server/data/db.json`.
Your edits go to `server/data/db.json` (git-ignored). To start over from the seed,
delete that file or `POST /api/reset`.

## Layout

```
server/
  index.js      Express REST API (projects / tasks / updates) + serves the built client
  db.js         JSON-file persistence (atomic writes)
  seed.json     your real projects, tasks, and dated updates
client/
  src/
    types.ts             shared domain types
    api.ts               typed REST client
    theme.css            design tokens (the academic palette + type)
    index.css            global styles + component classes
    lib/format.ts        date / label helpers
    components/ui/        shared primitives (Badge, Modal, ProgressBar, …)
    components/dashboard/ portfolio dashboard
    components/detail/    project detail page
    pages/               Dashboard, ProjectDetail
```

## API reference

| Method | Path                         | Purpose                        |
| ------ | ---------------------------- | ------------------------------ |
| GET    | `/api/projects`              | list projects (with summaries) |
| POST   | `/api/projects`              | create a project               |
| GET    | `/api/projects/:id`          | project detail (+tasks/updates)|
| PATCH  | `/api/projects/:id`          | edit project fields            |
| DELETE | `/api/projects/:id`          | delete a project               |
| POST   | `/api/projects/:id/tasks`    | add a task                     |
| PATCH  | `/api/tasks/:id`             | edit / toggle a task           |
| DELETE | `/api/tasks/:id`             | delete a task                  |
| POST   | `/api/projects/:id/updates`  | log a dated update             |
| PATCH  | `/api/updates/:id`           | edit an update                 |
| DELETE | `/api/updates/:id`           | delete an update               |
| POST   | `/api/projects/reorder`      | reorder projects               |
| POST   | `/api/projects/:id/tasks/reorder` | reorder a project's tasks |
| GET    | `/api/export`                | portfolio as export-ready JSON |
| GET    | `/api/export.xlsx`           | download the portfolio as .xlsx|
| GET    | `/api/backup`                | download a re-importable backup|
| POST   | `/api/import`                | restore from a backup (replaces all) |
| POST   | `/api/reset`                 | reset data back to the seed    |
