'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const {
  load,
  persist,
  reset,
  replaceAll,
  backupNow,
  backupToDir,
  listSources,
  readSource,
  getSettings,
  updateSettings,
  dirStatus,
  id,
  now,
} = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const PORT = process.env.PORT || 4000;

// ---- helpers ---------------------------------------------------------------

const PRIORITIES = ['high', 'medium', 'low'];
const EFFORTS = ['high', 'medium', 'low'];
const STATUSES = ['active', 'planning', 'in_review', 'on_hold', 'done'];

function clampProgress(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sortByDateDesc(a, b) {
  if (a.date < b.date) return 1;
  if (a.date > b.date) return -1;
  // tie-break by createdAt desc
  return (a.createdAt < b.createdAt ? 1 : -1);
}

// Attach derived fields the dashboard needs: latest update, next steps, task stats.
function summarize(db, project) {
  const updates = db.updates
    .filter((u) => u.projectId === project.id)
    .sort(sortByDateDesc);
  const tasks = db.tasks
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => a.order - b.order);
  const openTasks = tasks.filter((t) => !t.done);
  return {
    ...project,
    latestUpdate: updates[0] ? { date: updates[0].date, body: updates[0].body } : null,
    nextSteps: openTasks.slice(0, 3).map((t) => t.title),
    openTasks: openTasks.length,
    totalTasks: tasks.length,
  };
}

function findProject(db, id) {
  return db.projects.find((p) => p.id === id);
}

// ---- project routes --------------------------------------------------------

app.get('/api/projects', (req, res) => {
  // `?source=` previews the seed or a backup snapshot read-only; default = live.
  const db = readSource(req.query.source);
  if (!db) return res.status(404).json({ error: 'Unknown data source' });
  const list = db.projects
    .slice()
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    })
    .map((p) => summarize(db, p));
  res.json(list);
});

app.post('/api/projects', (req, res) => {
  const db = load();
  const body = req.body || {};
  const ts = now();
  const maxOrder = db.projects.reduce((m, p) => Math.max(m, p.order ?? 0), -1);
  const project = {
    id: id('p'),
    name: (body.name || 'Untitled project').toString().slice(0, 200),
    area: (body.area || 'General').toString().slice(0, 120),
    description: (body.description || '').toString(),
    status: STATUSES.includes(body.status) ? body.status : 'planning',
    priority: PRIORITIES.includes(body.priority) ? body.priority : 'medium',
    effort: EFFORTS.includes(body.effort) ? body.effort : 'medium',
    progress: clampProgress(body.progress ?? 0),
    collaborators: Array.isArray(body.collaborators) ? body.collaborators : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    dueDate: body.dueDate || null,
    pinned: !!body.pinned,
    archived: !!body.archived,
    order: maxOrder + 1,
    createdAt: ts,
    updatedAt: ts,
  };
  db.projects.push(project);
  persist();
  res.status(201).json(summarize(db, project));
});

// Reorder projects: body { ids: [...] } sets each project's order to its index.
// Defined before the :id routes so the literal path matches cleanly.
app.post('/api/projects/reorder', (req, res) => {
  const db = load();
  const ids = (req.body && req.body.ids) || [];
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const orderMap = new Map(ids.map((id, i) => [id, i]));
  db.projects.forEach((p) => {
    if (orderMap.has(p.id)) p.order = orderMap.get(p.id);
  });
  persist();
  res.json({ ok: true });
});

app.get('/api/projects/:id', (req, res) => {
  const db = readSource(req.query.source);
  if (!db) return res.status(404).json({ error: 'Unknown data source' });
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const tasks = db.tasks
    .filter((t) => t.projectId === project.id)
    .sort((a, b) => a.order - b.order);
  const updates = db.updates
    .filter((u) => u.projectId === project.id)
    .sort(sortByDateDesc);
  res.json({ ...project, tasks, updates });
});

app.patch('/api/projects/:id', (req, res) => {
  const db = load();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = req.body || {};
  const editable = ['name', 'area', 'description', 'dueDate', 'collaborators', 'tags', 'pinned', 'archived'];
  editable.forEach((k) => {
    if (k in body) project[k] = body[k];
  });
  if ('status' in body && STATUSES.includes(body.status)) project.status = body.status;
  if ('priority' in body && PRIORITIES.includes(body.priority)) project.priority = body.priority;
  if ('effort' in body && EFFORTS.includes(body.effort)) project.effort = body.effort;
  if ('progress' in body) project.progress = clampProgress(body.progress);
  project.updatedAt = now();
  persist();
  res.json(summarize(db, project));
});

app.delete('/api/projects/:id', (req, res) => {
  const db = load();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.projects = db.projects.filter((p) => p.id !== project.id);
  db.tasks = db.tasks.filter((t) => t.projectId !== project.id);
  db.updates = db.updates.filter((u) => u.projectId !== project.id);
  persist();
  res.json({ ok: true });
});

// ---- task routes -----------------------------------------------------------

app.post('/api/projects/:id/tasks', (req, res) => {
  const db = load();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = req.body || {};
  const maxOrder = db.tasks
    .filter((t) => t.projectId === project.id)
    .reduce((m, t) => Math.max(m, t.order ?? 0), -1);
  const task = {
    id: id('t'),
    projectId: project.id,
    title: (body.title || 'New task').toString(),
    done: !!body.done,
    priority: PRIORITIES.includes(body.priority) ? body.priority : 'medium',
    effort: EFFORTS.includes(body.effort) ? body.effort : 'medium',
    order: maxOrder + 1,
    createdAt: now(),
    completedAt: body.done ? now() : null,
  };
  db.tasks.push(task);
  project.updatedAt = now();
  persist();
  res.status(201).json(task);
});

// Reorder a project's tasks: body { ids: [...] } sets each task's order.
app.post('/api/projects/:id/tasks/reorder', (req, res) => {
  const db = load();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const ids = (req.body && req.body.ids) || [];
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const orderMap = new Map(ids.map((id, i) => [id, i]));
  db.tasks.forEach((t) => {
    if (t.projectId === project.id && orderMap.has(t.id)) t.order = orderMap.get(t.id);
  });
  project.updatedAt = now();
  persist();
  res.json({ ok: true });
});

app.patch('/api/tasks/:id', (req, res) => {
  const db = load();
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const body = req.body || {};
  if ('title' in body) task.title = body.title.toString();
  if ('order' in body) task.order = Number(body.order);
  if ('priority' in body && PRIORITIES.includes(body.priority)) task.priority = body.priority;
  if ('effort' in body && EFFORTS.includes(body.effort)) task.effort = body.effort;
  if ('done' in body) {
    task.done = !!body.done;
    task.completedAt = task.done ? now() : null;
  }
  const project = findProject(db, task.projectId);
  if (project) project.updatedAt = now();
  persist();
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const db = load();
  const before = db.tasks.length;
  const task = db.tasks.find((t) => t.id === req.params.id);
  db.tasks = db.tasks.filter((t) => t.id !== req.params.id);
  if (db.tasks.length === before) return res.status(404).json({ error: 'Task not found' });
  if (task) {
    const project = findProject(db, task.projectId);
    if (project) project.updatedAt = now();
  }
  persist();
  res.json({ ok: true });
});

// ---- update routes ---------------------------------------------------------

app.post('/api/projects/:id/updates', (req, res) => {
  const db = load();
  const project = findProject(db, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const body = req.body || {};
  const ts = now();
  const update = {
    id: id('u'),
    projectId: project.id,
    date: (body.date || ts.slice(0, 10)).toString().slice(0, 10),
    body: (body.body || '').toString(),
    createdAt: ts,
  };
  db.updates.push(update);
  project.updatedAt = ts;
  persist();
  res.status(201).json(update);
});

app.patch('/api/updates/:id', (req, res) => {
  const db = load();
  const update = db.updates.find((u) => u.id === req.params.id);
  if (!update) return res.status(404).json({ error: 'Update not found' });
  const body = req.body || {};
  if ('body' in body) update.body = body.body.toString();
  if ('date' in body) update.date = body.date.toString().slice(0, 10);
  persist();
  res.json(update);
});

app.delete('/api/updates/:id', (req, res) => {
  const db = load();
  const before = db.updates.length;
  db.updates = db.updates.filter((u) => u.id !== req.params.id);
  if (db.updates.length === before) return res.status(404).json({ error: 'Update not found' });
  persist();
  res.json({ ok: true });
});

// ---- utility ---------------------------------------------------------------

app.post('/api/reset', (req, res) => {
  reset();
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---- data sources (read-only preview of seed / backups) --------------------

// List the sources the ledger can switch to: live, default seed, and backups.
app.get('/api/sources', (req, res) => {
  res.json(listSources());
});

// Restore the live db from a preview source (seed or a backup snapshot).
// Destructive: replaces ALL live data (replaceAll snapshots the current data
// first so this is itself undoable).
app.post('/api/restore', (req, res) => {
  const source = req.body && req.body.source;
  if (!source || source === 'live') {
    return res.status(400).json({ error: 'Choose a seed or backup snapshot to restore from.' });
  }
  const src = readSource(source);
  if (!src) return res.status(404).json({ error: 'Unknown data source' });
  const db = replaceAll(src);
  res.json({
    ok: true,
    projects: db.projects.length,
    tasks: db.tasks.length,
    updates: db.updates.length,
  });
});

// ---- backup / restore (full, round-trippable data) -------------------------

// Read/update settings stored inside the database (e.g. the backup folder).
app.get('/api/settings', (req, res) => {
  const settings = getSettings();
  res.json({ ...settings, folder: dirStatus(settings.backupDir) });
});

app.patch('/api/settings', (req, res) => {
  const body = req.body || {};
  const patch = {};
  if ('backupDir' in body) {
    const v = body.backupDir;
    if (v !== null && typeof v !== 'string') {
      return res.status(400).json({ error: 'backupDir must be a folder path string, or null to clear it.' });
    }
    patch.backupDir = v && v.trim() ? v.trim() : null;
  }
  const settings = updateSettings(patch);
  res.json({ ...settings, folder: dirStatus(settings.backupDir) });
});

// Create an on-demand local snapshot in data/backups/ (also appears in the
// ledger source switcher and can be restored from there). If a backup folder
// is configured, a copy is also written there (e.g. a cloud-synced folder).
app.post('/api/backup', (req, res) => {
  load();
  const file = backupNow('manual');
  if (!file) return res.status(500).json({ error: 'Could not write a backup snapshot.' });
  const backupDir = getSettings().backupDir;
  const external = backupDir ? backupToDir(backupDir) : null;
  res.json({ ok: true, file, external });
});

// Raw, re-importable snapshot of the whole database.
app.get('/api/backup', (req, res) => {
  const db = load();
  const payload = {
    version: 1,
    exportedAt: now(),
    projects: db.projects,
    tasks: db.tasks,
    updates: db.updates,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="research-ledger-backup-${stamp}.json"`,
  );
  res.send(JSON.stringify(payload, null, 2));
});

// Restore from a backup file. Destructive: replaces ALL data (a pre-import
// snapshot is taken automatically). Accepts the shape produced by /api/backup.
app.post('/api/import', (req, res) => {
  const body = req.body || {};
  const { projects, tasks, updates } = body;
  if (!Array.isArray(projects) || !Array.isArray(tasks) || !Array.isArray(updates)) {
    return res.status(400).json({
      error: 'Invalid backup file: expected "projects", "tasks", and "updates" arrays.',
    });
  }
  if (projects.some((p) => !p || typeof p.id !== 'string')) {
    return res.status(400).json({ error: 'Invalid backup file: a project is missing an id.' });
  }
  if (tasks.some((t) => !t || typeof t.id !== 'string' || typeof t.projectId !== 'string')) {
    return res.status(400).json({ error: 'Invalid backup file: a task is missing an id/projectId.' });
  }
  // Guarantee the numeric ordering fields exist so summaries/sorts stay stable.
  projects.forEach((p, i) => {
    if (typeof p.order !== 'number') p.order = i;
  });
  tasks.forEach((t, i) => {
    if (typeof t.order !== 'number') t.order = i;
  });
  const db = replaceAll({ projects, tasks, updates });
  res.json({
    ok: true,
    projects: db.projects.length,
    tasks: db.tasks.length,
    updates: db.updates.length,
  });
});

// ---- export ----------------------------------------------------------------

const STATUS_LABEL = {
  active: 'Active',
  planning: 'Planning',
  in_review: 'In review',
  on_hold: 'On hold',
  done: 'Done',
};
const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
const EFFORT_LABEL = { high: 'Heavy', medium: 'Moderate', low: 'Light' };

// Build a rich, export-ready view of every project: full open-task list as
// "next steps", the latest update, and the most recent updates.
function buildExport(db) {
  const projects = db.projects
    .slice()
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    })
    .map((p) => {
      const updates = db.updates
        .filter((u) => u.projectId === p.id)
        .sort(sortByDateDesc);
      const tasks = db.tasks
        .filter((t) => t.projectId === p.id)
        .sort((a, b) => a.order - b.order);
      const openTasks = tasks.filter((t) => !t.done);
      return {
        id: p.id,
        name: p.name,
        area: p.area,
        status: p.status,
        statusLabel: STATUS_LABEL[p.status] || p.status,
        priority: p.priority,
        priorityLabel: PRIORITY_LABEL[p.priority] || p.priority,
        effort: p.effort,
        effortLabel: EFFORT_LABEL[p.effort] || p.effort,
        progress: p.progress,
        collaborators: p.collaborators || [],
        tags: p.tags || [],
        dueDate: p.dueDate || null,
        latestUpdate: updates[0] ? { date: updates[0].date, body: updates[0].body } : null,
        nextSteps: openTasks.map((t) => t.title),
        doneSteps: tasks.filter((t) => t.done).map((t) => t.title),
        recentUpdates: updates.slice(0, 6).map((u) => ({ date: u.date, body: u.body })),
        openTasks: openTasks.length,
        totalTasks: tasks.length,
      };
    });
  return { generatedAt: now(), projects };
}

app.get('/api/export', (req, res) => {
  res.json(buildExport(load()));
});

app.get('/api/export.xlsx', (req, res) => {
  const { projects } = buildExport(load());
  const header = [
    'Project',
    'Area',
    'Status',
    'Priority',
    'Effort',
    'Progress (%)',
    'Latest update (date)',
    'Latest update',
    'Next steps',
    'Collaborators',
    'Tags',
    'Due date',
  ];
  const rows = projects.map((p) => [
    p.name,
    p.area,
    p.statusLabel,
    p.priorityLabel,
    p.effortLabel,
    p.progress,
    p.latestUpdate ? p.latestUpdate.date : '',
    p.latestUpdate ? p.latestUpdate.body : '',
    p.nextSteps.join('\n'),
    p.collaborators.join(', '),
    p.tags.join(', '),
    p.dueDate || '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 30 }, { wch: 22 }, { wch: 11 }, { wch: 9 }, { wch: 9 }, { wch: 11 },
    { wch: 16 }, { wch: 48 }, { wch: 48 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Portfolio');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="research-portfolio-${stamp}.xlsx"`);
  res.send(buf);
});

// ---- static client (production build) --------------------------------------

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Research Task Manager API running on http://localhost:${PORT}`);
});
