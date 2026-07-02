// Shared domain types — the single source of truth for the client.
// Kept in sync with the Express API in server/index.js.

export type Priority = 'high' | 'medium' | 'low';
export type Effort = 'high' | 'medium' | 'low';
export type Status = 'active' | 'planning' | 'in_review' | 'on_hold' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  done: boolean;
  priority: Priority;
  effort: Effort;
  order: number;
  createdAt: string;
  completedAt?: string | null;
}

export interface Update {
  id: string;
  projectId: string;
  date: string; // ISO calendar date, YYYY-MM-DD
  body: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  area: string;
  description: string;
  status: Status;
  priority: Priority;
  effort: Effort;
  progress: number; // 0-100
  collaborators: string[];
  tags: string[];
  dueDate?: string | null;
  pinned: boolean;
  archived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// GET /api/projects returns this shape (Project + derived dashboard fields).
export interface ProjectSummary extends Project {
  latestUpdate: { date: string; body: string } | null;
  nextSteps: string[];
  openTasks: number;
  totalTasks: number;
}

// GET /api/projects/:id returns this shape.
export interface ProjectDetail extends Project {
  tasks: Task[];
  updates: Update[];
}

// Payload types for creating/updating records.
export type NewProject = Partial<
  Pick<
    Project,
    | 'name'
    | 'area'
    | 'description'
    | 'status'
    | 'priority'
    | 'effort'
    | 'progress'
    | 'collaborators'
    | 'tags'
    | 'dueDate'
    | 'pinned'
  >
>;

export type ProjectPatch = Partial<
  Pick<
    Project,
    | 'name'
    | 'area'
    | 'description'
    | 'status'
    | 'priority'
    | 'effort'
    | 'progress'
    | 'collaborators'
    | 'tags'
    | 'dueDate'
    | 'pinned'
    | 'archived'
  >
>;

export type NewTask = Partial<Pick<Task, 'title' | 'priority' | 'effort' | 'done'>>;
export type TaskPatch = Partial<Pick<Task, 'title' | 'priority' | 'effort' | 'done' | 'order'>>;

export type NewUpdate = Partial<Pick<Update, 'date' | 'body'>>;
export type UpdatePatch = Partial<Pick<Update, 'date' | 'body'>>;

// GET /api/export — a rich, export-ready snapshot of the whole portfolio.
export interface ExportProject {
  id: string;
  name: string;
  area: string;
  status: Status;
  statusLabel: string;
  priority: Priority;
  priorityLabel: string;
  effort: Effort;
  effortLabel: string;
  progress: number;
  collaborators: string[];
  tags: string[];
  dueDate?: string | null;
  latestUpdate: { date: string; body: string } | null;
  nextSteps: string[];
  doneSteps: string[];
  recentUpdates: { date: string; body: string }[];
  openTasks: number;
  totalTasks: number;
}

export interface ExportData {
  generatedAt: string;
  projects: ExportProject[];
}

// GET /api/backup — the raw, re-importable database snapshot.
export interface BackupData {
  version?: number;
  exportedAt?: string;
  projects: Project[];
  tasks: Task[];
  updates: Update[];
}

// POST /api/import result.
export interface ImportResult {
  ok: true;
  projects: number;
  tasks: number;
  updates: number;
}

// GET/PATCH /api/settings — configuration stored inside the database.
export interface Settings {
  backupDir: string | null;
  brandLine: string | null; // masthead tagline
  portfolioTitle: string | null; // dashboard heading
}

export interface FolderStatus {
  configured: boolean;
  exists: boolean;
  writable: boolean;
}

export interface SettingsResult extends Settings {
  folder: FolderStatus;
}

// POST /api/backup — result of an on-demand snapshot.
export interface BackupResult {
  ok: true;
  file: string;
  external: { ok: boolean; path?: string; error?: string } | null;
}

// GET /api/sources — a read-only data source the ledger can preview.
export interface DataSource {
  id: string; // 'live' | 'seed' | 'backup:<file>'
  kind: 'live' | 'seed' | 'backup';
  file?: string | null;
  savedAt?: string | null; // ISO timestamp for backups
  count: number; // number of projects in the source
}
