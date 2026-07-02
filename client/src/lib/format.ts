import type { Priority, Effort, Status } from '../types';

// Human-readable labels for enum-ish fields.
export const STATUS_LABEL: Record<Status, string> = {
  active: 'Active',
  planning: 'Planning',
  in_review: 'In review',
  on_hold: 'On hold',
  done: 'Done',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const EFFORT_LABEL: Record<Effort, string> = {
  high: 'Heavy',
  medium: 'Moderate',
  low: 'Light',
};

export const STATUS_OPTIONS: Status[] = ['active', 'planning', 'in_review', 'on_hold', 'done'];

// "Undone" is a filter/view — every status except done. It is NOT a status a
// project can be set to; it just groups all not-done work (the default view).
export const UNDONE_FILTER = 'undone';
export const PRIORITY_OPTIONS: Priority[] = ['high', 'medium', 'low'];
export const EFFORT_OPTIONS: Effort[] = ['high', 'medium', 'low'];

// Rank helpers so callers can sort by priority/effort/status weight.
export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
export const EFFORT_RANK: Record<Effort, number> = { high: 0, medium: 1, low: 2 };
// Workflow-ish ordering: active work first, done last.
export const STATUS_RANK: Record<Status, number> = {
  active: 0,
  planning: 1,
  in_review: 2,
  on_hold: 3,
  done: 4,
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Parse a YYYY-MM-DD (or ISO) string as a local date without timezone drift.
function parseDate(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "Jun 24" or "Jun 24, 2026" when the year differs from `refYear`.
export function formatDate(value: string, refYear?: number): string {
  const d = parseDate(value);
  if (!d) return value;
  const y = d.getFullYear();
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (refYear !== undefined && y === refYear) return base;
  return `${base}, ${y}`;
}

// Relative age, e.g. "today", "3d ago", "2w ago".
export function relativeDate(value: string, today = new Date()): string {
  const d = parseDate(value);
  if (!d) return '';
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const t1 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((t0 - t1) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
