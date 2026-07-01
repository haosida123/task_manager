// ProjectRow — one project as a ledger row with an inline expandable panel.
import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AvatarStack,
  EffortBadge,
  Icon,
  PriorityBadge,
  ProgressBar,
  Select,
  Spinner,
  StatusBadge,
} from '../ui';
import type { ProjectSummary, ProjectPatch, Status, Priority } from '../../types';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_LABEL,
  PRIORITY_LABEL,
  formatDate,
} from '../../lib/format';

interface ProjectRowProps {
  project: ProjectSummary;
  refYear: number;
  onPatch: (id: string, patch: ProjectPatch) => Promise<void>;
}

export function ProjectRow({ project, refYear, onPatch }: ProjectRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const projectPath = `/project/${project.id}`;

  async function patch(p: ProjectPatch) {
    setSaving(true);
    setErr(null);
    try {
      await onPatch(project.id, p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    setExpanded((v) => !v);
  }

  function onRowKey(e: KeyboardEvent<HTMLDivElement>) {
    // Only act on keys aimed at the row itself — let the chevron, pin button,
    // and project-name link handle their own Enter/Space without interference.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }

  // Stop a click on interactive children from also toggling the row.
  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  const statusOpts = STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const priorityOpts = PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));
  const nextTop = project.nextSteps.slice(0, 3);

  return (
    <div className={`ledger-row${project.pinned ? ' ledger-row--pinned' : ''}`}>
      <div
        className="ledger-row__main"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={onRowKey}
      >
        {/* chevron */}
        <button
          type="button"
          className="btn btn--icon row-chevron"
          aria-label={expanded ? 'Collapse row' : 'Expand row'}
          onClick={(e) => {
            stop(e);
            toggle();
          }}
        >
          <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={16} />
        </button>

        {/* project */}
        <div className="col-project">
          <div className="proj-title">
            <button
              type="button"
              className={`btn btn--icon proj-pin${project.pinned ? ' is-pinned' : ''}`}
              aria-label={project.pinned ? 'Unpin project' : 'Pin project'}
              title={project.pinned ? 'Unpin' : 'Pin to top'}
              onClick={(e) => {
                stop(e);
                void patch({ pinned: !project.pinned });
              }}
            >
              <Icon name="pin" size={13} />
            </button>
            <Link
              to={projectPath}
              className="proj-name truncate link-plain"
              onClick={stop}
              title={project.name}
            >
              {project.name}
            </Link>
          </div>
          <div className="proj-meta">
            {project.area && <span className="proj-area truncate">{project.area}</span>}
            <span className="proj-tags">
              {project.tags.slice(0, 2).map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* priority */}
        <div className="col-priority">
          <PriorityBadge value={project.priority} />
        </div>

        {/* effort */}
        <div className="col-effort">
          <EffortBadge value={project.effort} />
        </div>

        {/* progress */}
        <div className="col-progress">
          <ProgressBar value={project.progress} showLabel />
        </div>

        {/* latest update */}
        <div className="col-update">
          {project.latestUpdate ? (
            <>
              <div className="upd-date mono">{formatDate(project.latestUpdate.date, refYear)}</div>
              <div className="upd-body truncate">{project.latestUpdate.body}</div>
            </>
          ) : (
            <span className="cell-empty">No updates</span>
          )}
        </div>

        {/* next steps */}
        <div className="col-next">
          {nextTop.length > 0 ? (
            <ul className="nextsteps">
              {nextTop.map((s, i) => (
                <li className="nextsteps__item truncate" key={i} title={s}>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <span className="cell-empty">—</span>
          )}
        </div>

        {/* team */}
        <div className="col-team">
          {project.collaborators.length > 0 ? (
            <AvatarStack names={project.collaborators} max={3} />
          ) : (
            <span className="cell-empty">—</span>
          )}
        </div>

        {/* status */}
        <div className="col-status">
          <StatusBadge value={project.status} />
        </div>
      </div>

      {expanded && (
        <div className="ledger-row__panel fade-in">
          <div className="panel-grid">
            <div className="panel-main">
              <p className="panel-desc">
                {project.description || <span className="muted">No description yet.</span>}
              </p>

              <div className="panel-block">
                <span className="panel-cap">Next steps</span>
                {project.nextSteps.length > 0 ? (
                  <ul className="panel-steps">
                    {project.nextSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="muted small">No open next steps.</span>
                )}
              </div>

              <div className="panel-block">
                <span className="panel-cap">Latest update</span>
                {project.latestUpdate ? (
                  <div>
                    <span className="panel-update__date upper">
                      {formatDate(project.latestUpdate.date, refYear)}
                    </span>
                    <p className="panel-update__body">{project.latestUpdate.body}</p>
                  </div>
                ) : (
                  <span className="muted small">No updates logged yet.</span>
                )}
              </div>
            </div>

            <aside className="panel-side">
              <div className="panel-ctl">
                <span className="panel-cap">Progress</span>
                <ProgressBar
                  value={project.progress}
                  editable
                  onCommit={(v) => void patch({ progress: v })}
                />
              </div>

              <div className="panel-ctl">
                <span className="panel-cap">Status</span>
                <Select
                  options={statusOpts}
                  value={project.status}
                  onChange={(e) => void patch({ status: e.target.value as Status })}
                  aria-label="Change status"
                />
              </div>

              <div className="panel-ctl">
                <span className="panel-cap">Priority</span>
                <Select
                  options={priorityOpts}
                  value={project.priority}
                  onChange={(e) => void patch({ priority: e.target.value as Priority })}
                  aria-label="Change priority"
                />
              </div>

              <div className="panel-foot">
                {err ? (
                  <span className="panel-err">{err}</span>
                ) : saving ? (
                  <span className="row gap-6 tiny panel-saving">
                    <Spinner size={13} /> Saving…
                  </span>
                ) : (
                  <span />
                )}
                <Link to={projectPath} className="panel-open">
                  Open full project →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
