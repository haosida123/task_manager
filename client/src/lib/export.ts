// Builders that turn the portfolio into copy/paste-ready formats:
//  - an HTML table (paste straight into PowerPoint / Word as a real table)
//  - a TSV string (paste into Excel / Google Sheets, or plain-text)
//  - a plain-text outline
//  - a CSV string (download)
import type { ExportProject } from '../types';
import { formatDate } from './format';

// Columns for the "weekly" copy-table — mirrors the PowerPoint deck plus the
// priority / effort / progress the portfolio tracks.
export interface TableColumn {
  key: string;
  label: string;
  /** value for delimited (TSV/CSV) formats — newlines allowed, they get quoted */
  text: (p: ExportProject) => string;
  /** cell inner HTML for the rich table */
  html: (p: ExportProject) => string;
  align?: 'left' | 'center';
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function updateText(p: ExportProject): string {
  if (!p.latestUpdate) return '';
  return `${formatDate(p.latestUpdate.date)} — ${p.latestUpdate.body}`;
}

function updateHtml(p: ExportProject): string {
  if (!p.latestUpdate) return '<span style="color:#999">—</span>';
  return `<strong>${esc(formatDate(p.latestUpdate.date))}</strong><br>${esc(p.latestUpdate.body)}`;
}

function stepsHtml(p: ExportProject): string {
  if (p.nextSteps.length === 0) return '<span style="color:#999">—</span>';
  return p.nextSteps.map((s) => `• ${esc(s)}`).join('<br>');
}

export const TABLE_COLUMNS: TableColumn[] = [
  {
    key: 'name',
    label: 'Project',
    text: (p) => (p.area ? `${p.name} (${p.area})` : p.name),
    html: (p) =>
      `<strong>${esc(p.name)}</strong>` +
      (p.area ? `<br><span style="color:#6b6459;font-size:9pt">${esc(p.area)}</span>` : ''),
  },
  { key: 'priority', label: 'Priority', text: (p) => p.priorityLabel, html: (p) => esc(p.priorityLabel), align: 'center' },
  { key: 'effort', label: 'Effort', text: (p) => p.effortLabel, html: (p) => esc(p.effortLabel), align: 'center' },
  { key: 'progress', label: 'Progress', text: (p) => `${p.progress}%`, html: (p) => `${p.progress}%`, align: 'center' },
  { key: 'status', label: 'Status', text: (p) => p.statusLabel, html: (p) => esc(p.statusLabel), align: 'center' },
  { key: 'update', label: 'Latest update', text: updateText, html: updateHtml },
  { key: 'next', label: 'Next steps', text: (p) => p.nextSteps.join('\n'), html: stepsHtml },
];

// The optional meta columns the user can include/exclude in the table + text
// exports. Project / Latest update / Next steps are always included.
export interface ExportFields {
  priority: boolean;
  effort: boolean;
  progress: boolean;
  status: boolean;
}
export const ALL_FIELDS: ExportFields = {
  priority: true,
  effort: true,
  progress: true,
  status: true,
};
const TOGGLEABLE_KEYS = ['priority', 'effort', 'progress', 'status'];

function pickColumns(fields: ExportFields): TableColumn[] {
  return TABLE_COLUMNS.filter((c) =>
    TOGGLEABLE_KEYS.includes(c.key) ? fields[c.key as keyof ExportFields] : true,
  );
}

// --- Rich HTML table (for PowerPoint / Word) --------------------------------
export function toHtmlTable(projects: ExportProject[], fields: ExportFields = ALL_FIELDS): string {
  const columns = pickColumns(fields);
  const th = columns
    .map(
      (c) =>
        `<th style="border:1px solid #b8ad95;padding:6px 10px;text-align:${c.align || 'left'};background:#efe9dd;color:#3a3630">${esc(
          c.label,
        )}</th>`,
    )
    .join('');
  const trs = projects
    .map((p) => {
      const tds = columns
        .map(
          (c) =>
            `<td style="border:1px solid #cabfa6;padding:6px 10px;vertical-align:top;text-align:${
              c.align || 'left'
            }">${c.html(p)}</td>`,
        )
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  return (
    `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#21201c">` +
    `<thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`
  );
}

// --- Delimited (TSV / CSV) --------------------------------------------------
function delimitedCell(value: string, delim: string): string {
  if (value.includes(delim) || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toDelimited(projects: ExportProject[], delim: string, fields: ExportFields): string {
  const columns = pickColumns(fields);
  const header = columns.map((c) => delimitedCell(c.label, delim)).join(delim);
  const rows = projects.map((p) =>
    columns.map((c) => delimitedCell(c.text(p), delim)).join(delim),
  );
  return [header, ...rows].join('\r\n');
}

export function toTSV(projects: ExportProject[], fields: ExportFields = ALL_FIELDS): string {
  return toDelimited(projects, '\t', fields);
}

export function toCSV(projects: ExportProject[], fields: ExportFields = ALL_FIELDS): string {
  return toDelimited(projects, ',', fields);
}

// --- Plain-text outline -----------------------------------------------------
export function toPlainText(projects: ExportProject[], fields: ExportFields = ALL_FIELDS): string {
  const lines: string[] = [];
  projects.forEach((p, i) => {
    if (i > 0) lines.push('');
    lines.push(p.area ? `${p.name}  —  ${p.area}` : p.name);
    const meta: string[] = [];
    if (fields.priority) meta.push(`Priority: ${p.priorityLabel}`);
    if (fields.effort) meta.push(`Effort: ${p.effortLabel}`);
    if (fields.progress) meta.push(`Progress: ${p.progress}%`);
    if (fields.status) meta.push(`Status: ${p.statusLabel}`);
    if (meta.length) lines.push(meta.join(' · '));
    if (p.latestUpdate) {
      lines.push(`Latest update (${formatDate(p.latestUpdate.date)}): ${p.latestUpdate.body}`);
    }
    if (p.nextSteps.length) {
      lines.push('Next steps:');
      p.nextSteps.forEach((s) => lines.push(`  - ${s}`));
    }
  });
  return lines.join('\n');
}

// --- Clipboard + download helpers -------------------------------------------

// Copy a rich table: HTML for apps that accept it (PowerPoint/Word/Sheets),
// with a TSV plain-text fallback. Returns false if the browser blocks it.
export async function copyTable(
  projects: ExportProject[],
  fields: ExportFields = ALL_FIELDS,
): Promise<boolean> {
  const html = toHtmlTable(projects, fields);
  const tsv = toTSV(projects, fields);
  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
        }),
      ]);
      return true;
    }
  } catch {
    /* fall through to plain-text copy */
  }
  return copyText(tsv);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Legacy fallback via a hidden textarea.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
