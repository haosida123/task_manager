// ProjectRow — one project as a ledger row with an inline expandable panel.
// The collapsed row edits the "at-a-glance" fields (area, priority, effort,
// progress, status) in place. The expanded panel lazily loads the full project
// so you can edit the description, manage next steps (add / check / delete),
// and log an update — all without leaving the dashboard.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AvatarStack,
  BadgeSelect,
  EffortBadge,
  Icon,
  IconButton,
  PriorityBadge,
  ProgressBar,
  Spinner,
  StatusBadge,
} from '../ui';
import type {
  ProjectSummary,
  ProjectPatch,
  ProjectDetail,
  Task,
  Priority,
  Effort,
  Status,
} from '../../types';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  EFFORT_OPTIONS,
  STATUS_LABEL,
  PRIORITY_LABEL,
  EFFORT_LABEL,
  formatDate,
  relativeDate,
} from '../../lib/format';
import { api } from '../../api';
import { EditableText } from '../detail/EditableText';

// Dropdown option lists for the inline badge selects (built once).
const PRIORITY_MENU = PRIORITY_OPTIONS.map((v) => ({ value: v, label: PRIORITY_LABEL[v] }));
const EFFORT_MENU = EFFORT_OPTIONS.map((v) => ({ value: v, label: EFFORT_LABEL[v] }));
const STATUS_MENU = STATUS_OPTIONS.map((v) => ({ value: v, label: STATUS_LABEL[v] }));

interface ProjectRowProps {
  project: ProjectSummary;
  refYear: number;
  onPatch: (id: string, patch: ProjectPatch) => Promise<void>;
  /** Merge derived summary fields (next steps, latest update…) back into the
   *  dashboard list after edits made inside the expanded panel. */
  onSummaryPatch: (id: string, patch: Partial<ProjectSummary>) => void;
  /** Read-only preview (viewing the seed or a backup snapshot). */
  readOnly?: boolean;
  /** Data source id to load the expanded detail from (default 'live'). */
  source?: string;
  reorderable: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onDragStartRow: () => void;
  onDragOverRow: () => void;
  onDropRow: () => void;
  onDragEndRow: () => void;
}

// Today as YYYY-MM-DD in local time (no timezone drift).
function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Recompute the derived dashboard fields from a freshly-mutated detail so the
// collapsed row stays in sync with edits made in the panel.
function summaryFromDetail(d: ProjectDetail): Partial<ProjectSummary> {
  const open = d.tasks.filter((t) => !t.done).sort((a, b) => a.order - b.order);
  const updates = [...d.updates].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  return {
    latestUpdate: updates[0] ? { date: updates[0].date, body: updates[0].body } : null,
    nextSteps: open.slice(0, 3).map((t) => t.title),
    openTasks: open.length,
    totalTasks: d.tasks.length,
  };
}

export function ProjectRow({
  project,
  refYear,
  onPatch,
  onSummaryPatch,
  readOnly = false,
  source = 'live',
  reorderable,
  dragging,
  dropTarget,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow,
}: ProjectRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Lazily-loaded full project (tasks + updates) for the expanded panel.
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [newStep, setNewStep] = useState('');
  const [logBody, setLogBody] = useState('');
  const [logDate, setLogDate] = useState(todayISO());
  const [showDone, setShowDone] = useState(false);

  const projectPath = `/project/${project.id}`;

  // Fetch the detail the first time the row is opened. Deps are intentionally
  // just [expanded, project.id]: `detail`/`detailLoading` are read through the
  // guard but must NOT be deps, or setting `detailLoading` would re-run and
  // cancel this very fetch. The guard still prevents duplicate loads.
  useEffect(() => {
    if (!expanded || detail || detailLoading) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailErr(null);
    api
      .getProject(project.id, source)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setDetailErr(e instanceof Error ? e.message : 'Could not load project.');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, project.id]);

  function handleDragStart(e: DragEvent) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', project.id);
    if (rowRef.current) e.dataTransfer.setDragImage(rowRef.current, 24, 20);
    onDragStartRow();
  }

  // Run a mutation while surfacing a subtle saving/error state.
  async function run(fn: () => Promise<void>) {
    setSaving(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  const patch = (p: ProjectPatch) => run(() => onPatch(project.id, p));

  // Apply a task-list transform to the local detail and sync the collapsed row.
  function applyTasks(transform: (tasks: Task[]) => Task[]) {
    setDetail((prev) => {
      if (!prev) return prev;
      const nd = { ...prev, tasks: transform(prev.tasks) };
      onSummaryPatch(project.id, summaryFromDetail(nd));
      return nd;
    });
  }

  const replaceTask = (updated: Task) =>
    applyTasks((tasks) => tasks.map((x) => (x.id === updated.id ? updated : x)));

  const toggleTaskDone = (t: Task) =>
    run(async () => {
      replaceTask(await api.updateTask(t.id, { done: !t.done }));
    });

  const editTaskTitle = (t: Task, title: string) =>
    run(async () => {
      replaceTask(await api.updateTask(t.id, { title }));
    });

  const patchTaskField = (t: Task, taskPatch: Partial<Pick<Task, 'priority' | 'effort'>>) =>
    run(async () => {
      replaceTask(await api.updateTask(t.id, taskPatch));
    });

  const deleteTask = (t: Task) =>
    run(async () => {
      await api.deleteTask(t.id);
      applyTasks((tasks) => tasks.filter((x) => x.id !== t.id));
    });

  const addStep = () =>
    run(async () => {
      const title = newStep.trim();
      if (!title) return;
      const task = await api.createTask(project.id, { title });
      applyTasks((tasks) => [...tasks, task]);
      setNewStep('');
    });

  const submitLog = () =>
    run(async () => {
      const body = logBody.trim();
      if (!body) return;
      const upd = await api.createUpdate(project.id, { date: logDate || todayISO(), body });
      setDetail((prev) => {
        if (!prev) return prev;
        const nd = { ...prev, updates: [upd, ...prev.updates] };
        onSummaryPatch(project.id, summaryFromDetail(nd));
        return nd;
      });
      setLogBody('');
      setLogDate(todayISO());
    });

  function toggle() {
    setExpanded((v) => !v);
  }

  function onRowKey(e: KeyboardEvent<HTMLDivElement>) {
    // Only act on keys aimed at the row itself — let inline controls (badges,
    // editable text, the chevron, links) handle their own Enter/Space.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }

  // Stop a click on an interactive child from also toggling the row.
  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  const openTasks = useMemo(
    () => (detail ? detail.tasks.filter((t) => !t.done).sort((a, b) => a.order - b.order) : []),
    [detail],
  );
  const doneTasks = useMemo(
    () => (detail ? detail.tasks.filter((t) => t.done).sort((a, b) => a.order - b.order) : []),
    [detail],
  );
  const recentUpdates = useMemo(
    () =>
      detail
        ? [...detail.updates]
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
            .slice(0, 3)
        : [],
    [detail],
  );

  const nextTop = project.nextSteps.slice(0, 3);

  return (
    <div
      ref={rowRef}
      className={
        `ledger-row${project.pinned ? ' ledger-row--pinned' : ''}` +
        `${dragging ? ' is-dragging' : ''}${dropTarget ? ' is-drop-target' : ''}`
      }
      onDragOver={(e) => {
        if (reorderable) {
          e.preventDefault();
          onDragOverRow();
        }
      }}
      onDrop={(e) => {
        if (reorderable) {
          e.preventDefault();
          onDropRow();
        }
      }}
    >
      <div
        className="ledger-row__main"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={onRowKey}
      >
        {/* drag handle + chevron */}
        <div className="row-controls">
          {reorderable && (
            <button
              type="button"
              className="drag-handle"
              aria-label="Drag to reorder"
              title="Drag to reorder"
              draggable
              onDragStart={handleDragStart}
              onDragEnd={onDragEndRow}
              onClick={stop}
            >
              <Icon name="grip" size={15} />
            </button>
          )}
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
        </div>

        {/* project */}
        <div className="col-project">
          <div className="proj-title">
            {!readOnly && (
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
            )}
            <Link
              to={projectPath}
              className="proj-name link-plain"
              onClick={stop}
              title={project.name}
            >
              {project.name}
            </Link>
          </div>
          <div className="proj-meta">
            <span className="cell-edit" onClick={stop}>
              <EditableText
                tag="span"
                className="proj-area"
                value={project.area}
                emptyText="Add area…"
                ariaLabel="Project area"
                readOnly={readOnly}
                onCommit={(v) => void patch({ area: v })}
              />
            </span>
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
        <div className="col-priority" onClick={stop}>
          {readOnly ? (
            <PriorityBadge value={project.priority} />
          ) : (
            <BadgeSelect
              value={project.priority}
              options={PRIORITY_MENU}
              onChange={(v) => void patch({ priority: v })}
              renderBadge={(v) => <PriorityBadge value={v} />}
              ariaLabel="Change priority"
            />
          )}
        </div>

        {/* effort */}
        <div className="col-effort" onClick={stop}>
          {readOnly ? (
            <EffortBadge value={project.effort} />
          ) : (
            <BadgeSelect
              value={project.effort}
              options={EFFORT_MENU}
              onChange={(v) => void patch({ effort: v })}
              renderBadge={(v) => <EffortBadge value={v} />}
              ariaLabel="Change effort"
            />
          )}
        </div>

        {/* progress */}
        <div className="col-progress">
          {readOnly ? (
            <ProgressBar value={project.progress} showLabel />
          ) : (
            <div className="cell-edit" onClick={stop} onKeyDown={(e) => e.stopPropagation()}>
              <ProgressBar
                value={project.progress}
                editable
                onCommit={(v) => void patch({ progress: v })}
              />
            </div>
          )}
        </div>

        {/* latest update */}
        <div className="col-update">
          {project.latestUpdate ? (
            <>
              <div className="upd-date mono">{formatDate(project.latestUpdate.date, refYear)}</div>
              <div className="upd-body">{project.latestUpdate.body}</div>
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
                <li className="nextsteps__item" key={i} title={s}>
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
        <div className="col-status" onClick={stop}>
          {readOnly ? (
            <StatusBadge value={project.status} />
          ) : (
            <BadgeSelect
              value={project.status}
              options={STATUS_MENU}
              onChange={(v) => void patch({ status: v })}
              renderBadge={(v) => <StatusBadge value={v} />}
              ariaLabel="Change status"
            />
          )}
        </div>
      </div>

      {expanded && (
        <div className="ledger-row__panel fade-in">
          <div className="panel-grid">
            <div className="panel-main">
              <div className="panel-block panel-block--first">
                <span className="panel-cap">Overview</span>
                <EditableText
                  tag="p"
                  multiline
                  className="panel-desc"
                  value={project.description}
                  emptyText="Add a short description…"
                  ariaLabel="Project description"
                  readOnly={readOnly}
                  onCommit={(v) => void patch({ description: v })}
                />
              </div>

              <div className="panel-block">
                <span className="panel-cap">Next steps</span>
                {detailLoading && !detail ? (
                  <span className="row gap-6 tiny muted">
                    <Spinner size={13} /> Loading…
                  </span>
                ) : detailErr && !detail ? (
                  <span className="panel-err">{detailErr}</span>
                ) : (
                  <>
                    {openTasks.length > 0 ? (
                      <ul className="psteps">
                        {openTasks.map((t) => (
                          <li className="pstep" key={t.id}>
                            {readOnly ? (
                              <span className="pstep__check is-static" aria-hidden="true" />
                            ) : (
                              <button
                                type="button"
                                className="pstep__check"
                                aria-label="Mark step complete"
                                title="Mark complete"
                                onClick={() => void toggleTaskDone(t)}
                              />
                            )}
                            <EditableText
                              tag="span"
                              className="pstep__title grow"
                              value={t.title}
                              emptyText="Untitled step"
                              ariaLabel="Step title"
                              readOnly={readOnly}
                              onCommit={(v) => v && void editTaskTitle(t, v)}
                            />
                            {readOnly ? (
                              <PriorityBadge value={t.priority} />
                            ) : (
                              <BadgeSelect
                                value={t.priority}
                                options={PRIORITY_MENU}
                                onChange={(v) => void patchTaskField(t, { priority: v })}
                                renderBadge={(v) => <PriorityBadge value={v} />}
                                ariaLabel="Change step priority"
                                className="pstep__badge"
                              />
                            )}
                            {!readOnly && (
                              <IconButton
                                icon="trash"
                                size={14}
                                label="Delete step"
                                className="pstep__del"
                                onClick={() => void deleteTask(t)}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted small">No open next steps.</span>
                    )}

                    {!readOnly && (
                      <form
                        className="pstep-add"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void addStep();
                        }}
                      >
                        <input
                          className="input grow"
                          placeholder="Add a next step…"
                          aria-label="New next step"
                          value={newStep}
                          onChange={(e) => setNewStep(e.target.value)}
                        />
                        <IconButton icon="plus" label="Add step" type="submit" disabled={!newStep.trim()} />
                      </form>
                    )}

                    {doneTasks.length > 0 && (
                      <div className="pdone">
                        <button
                          type="button"
                          className="pdone__toggle upper"
                          onClick={() => setShowDone((s) => !s)}
                        >
                          <Icon name={showDone ? 'chevron-down' : 'chevron-right'} size={12} />
                          Completed ({doneTasks.length})
                        </button>
                        {showDone && (
                          <ul className="psteps psteps--done">
                            {doneTasks.map((t) => (
                              <li className="pstep is-done" key={t.id}>
                                {readOnly ? (
                                  <span className="pstep__check is-done is-static">
                                    <Icon name="check" size={11} />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="pstep__check is-done"
                                    aria-label="Mark step not complete"
                                    title="Mark not complete"
                                    onClick={() => void toggleTaskDone(t)}
                                  >
                                    <Icon name="check" size={11} />
                                  </button>
                                )}
                                <span className="pstep__title grow">{t.title}</span>
                                {!readOnly && (
                                  <IconButton
                                    icon="trash"
                                    size={14}
                                    label="Delete step"
                                    className="pstep__del"
                                    onClick={() => void deleteTask(t)}
                                  />
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <aside className="panel-side">
              {!readOnly && (
                <div className="panel-block panel-block--first">
                  <span className="panel-cap">Log an update</span>
                  <form
                    className="panel-log"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitLog();
                    }}
                  >
                    <textarea
                      className="textarea"
                      placeholder="What moved forward? Results, blockers, decisions…"
                      aria-label="New update"
                      value={logBody}
                      onChange={(e) => setLogBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void submitLog();
                        }
                      }}
                    />
                    <div className="panel-log__row">
                      <div className="row gap-6">
                        <Icon name="calendar" size={14} className="muted" />
                        <input
                          type="date"
                          className="input"
                          aria-label="Update date"
                          value={logDate}
                          onChange={(e) => setLogDate(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn--primary btn--sm"
                        disabled={!logBody.trim()}
                      >
                        <Icon name="plus" size={13} /> Log
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {recentUpdates.length > 0 && (
                <div className={`panel-block${readOnly ? ' panel-block--first' : ''}`}>
                  <span className="panel-cap">Recent log</span>
                  <ul className="precent">
                    {recentUpdates.map((u) => (
                      <li className="precent__item" key={u.id}>
                        <div className="precent__meta">
                          <span className="mono">{formatDate(u.date, refYear)}</span>
                          <span className="tiny faint">{relativeDate(u.date)}</span>
                        </div>
                        <p className="precent__body">{u.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="panel-foot">
                {readOnly ? (
                  <span className="row gap-6 tiny panel-saving">
                    <Icon name="clock" size={13} /> Read-only snapshot
                  </span>
                ) : err ? (
                  <span className="panel-err">{err}</span>
                ) : saving ? (
                  <span className="row gap-6 tiny panel-saving">
                    <Spinner size={13} /> Saving…
                  </span>
                ) : (
                  <span className="tiny panel-saving">Saved locally</span>
                )}
                {!readOnly && (
                  <Link to={projectPath} className="panel-open">
                    Open full project →
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
