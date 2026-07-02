import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Icon, LoadingBlock } from '../ui';
import { api } from '../../api';
import type { ExportData, ExportProject } from '../../types';
import {
  toHtmlTable,
  toPlainText,
  toTSV,
  toCSV,
  copyTable,
  copyText,
  downloadBlob,
  ALL_FIELDS,
} from '../../lib/export';
import type { ExportFields } from '../../lib/export';

type Tab = 'table' | 'text' | 'excel';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  /** Ordered ids of the projects currently shown; undefined = all. */
  projectIds?: string[];
}

// Tiny copy button that flips to a "Copied" confirmation for a moment.
function CopyButton({
  label,
  onCopy,
  icon = 'layers',
}: {
  label: string;
  onCopy: () => Promise<boolean>;
  icon?: string;
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <Button
      variant="primary"
      icon={state === 'ok' ? 'check' : state === 'fail' ? 'x' : icon}
      onClick={async () => setState((await onCopy()) ? 'ok' : 'fail')}
    >
      {state === 'ok' ? 'Copied!' : state === 'fail' ? 'Copy failed' : label}
    </Button>
  );
}

export function ExportModal({ open, onClose, projectIds }: ExportModalProps) {
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('table');
  const [fields, setFields] = useState<ExportFields>(ALL_FIELDS);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    api
      .getExport()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to build export.'))
      .finally(() => setLoading(false));
  }, [open]);

  // Order/filter the export to match the projects currently shown.
  const projects: ExportProject[] = useMemo(() => {
    if (!data) return [];
    if (!projectIds) return data.projects;
    const byId = new Map(data.projects.map((p) => [p.id, p]));
    return projectIds.map((id) => byId.get(id)).filter((p): p is ExportProject => Boolean(p));
  }, [data, projectIds]);

  const tableHtml = useMemo(() => toHtmlTable(projects, fields), [projects, fields]);
  const plain = useMemo(() => toPlainText(projects, fields), [projects, fields]);
  const stamp = (data?.generatedAt || new Date().toISOString()).slice(0, 10);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'table', label: 'Table', icon: 'layers' },
    { key: 'text', label: 'Text', icon: 'book' },
    { key: 'excel', label: 'Excel / CSV', icon: 'archive' },
  ];

  const FIELD_TOGGLES: { key: keyof ExportFields; label: string }[] = [
    { key: 'priority', label: 'Priority' },
    { key: 'effort', label: 'Effort' },
    { key: 'progress', label: 'Progress' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <Modal open={open} title="Export portfolio" onClose={onClose} width={860}>
      <div className="export">
        <div className="export__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`export__tab ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
          <span className="export__count tiny muted">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {(tab === 'table' || tab === 'text') && (
          <div className="export__fields">
            <span className="tiny muted">Include:</span>
            {FIELD_TOGGLES.map((f) => (
              <label key={f.key} className="export__field">
                <input
                  type="checkbox"
                  checked={fields[f.key]}
                  onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                />
                {f.label}
              </label>
            ))}
          </div>
        )}

        {loading && <LoadingBlock label="Building export…" />}
        {!loading && error && <p className="export__error">{error}</p>}

        {!loading && !error && data && (
          <>
            {tab === 'table' && (
              <div className="export__panel">
                <p className="export__hint muted small">
                  Copy, then paste directly into PowerPoint or Word — it arrives as an
                  editable table. Pasting into a text editor gives tab-separated values.
                </p>
                <div className="export__preview" aria-hidden="true">
                  <div dangerouslySetInnerHTML={{ __html: tableHtml }} />
                </div>
                <div className="export__actions">
                  <CopyButton label="Copy table" onCopy={() => copyTable(projects, fields)} />
                  <Button icon="layers" onClick={() => void copyText(toTSV(projects, fields))}>
                    Copy as TSV
                  </Button>
                </div>
              </div>
            )}

            {tab === 'text' && (
              <div className="export__panel">
                <p className="export__hint muted small">
                  A plain-text outline — paste into a slide's text box, notes, email, or
                  anywhere.
                </p>
                <pre className="export__text">{plain}</pre>
                <div className="export__actions">
                  <CopyButton label="Copy text" onCopy={() => copyText(plain)} icon="book" />
                </div>
              </div>
            )}

            {tab === 'excel' && (
              <div className="export__panel">
                <p className="export__hint muted small">
                  Download a spreadsheet (full data incl. area, collaborators, tags, due
                  date), then copy any range into PowerPoint. Excel opens either file.
                </p>
                <div className="export__downloads">
                  <a className="btn btn--primary" href={api.xlsxUrl} download>
                    <Icon name="archive" size={15} /> Download .xlsx
                  </a>
                  <Button
                    icon="archive"
                    onClick={() =>
                      downloadBlob(
                        toCSV(projects),
                        `research-portfolio-${stamp}.csv`,
                        'text/csv;charset=utf-8',
                      )
                    }
                  >
                    Download .csv
                  </Button>
                </div>
                <p className="tiny faint" style={{ marginTop: 12 }}>
                  The .xlsx always contains the full portfolio; .csv follows the projects
                  shown here. Both include every column — use the Table or Text tab to pick
                  which columns to include.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
