import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ProjectDetail, ProjectPatch, Status, Priority, Effort } from '../../types';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  EFFORT_OPTIONS,
  STATUS_LABEL,
  PRIORITY_LABEL,
  EFFORT_LABEL,
  formatDate,
} from '../../lib/format';
import { Select, ProgressBar, Avatar, Icon, IconButton } from '../ui';

const STATUS_SELECT = STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
const PRIORITY_SELECT = PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));
const EFFORT_SELECT = EFFORT_OPTIONS.map((e) => ({ value: e, label: EFFORT_LABEL[e] }));

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="meta-row">
      <span className="upper meta-row__label">{label}</span>
      <div className="meta-row__control">{children}</div>
    </div>
  );
}

interface MetaPanelProps {
  project: ProjectDetail;
  onPatch: (patch: ProjectPatch) => void;
}

export function MetaPanel({ project, onPatch }: MetaPanelProps) {
  const [newCollab, setNewCollab] = useState('');
  const [newTag, setNewTag] = useState('');

  const addCollab = () => {
    const name = newCollab.trim();
    if (!name || project.collaborators.includes(name)) {
      setNewCollab('');
      return;
    }
    onPatch({ collaborators: [...project.collaborators, name] });
    setNewCollab('');
  };
  const removeCollab = (name: string) =>
    onPatch({ collaborators: project.collaborators.filter((c) => c !== name) });

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag || project.tags.includes(tag)) {
      setNewTag('');
      return;
    }
    onPatch({ tags: [...project.tags, tag] });
    setNewTag('');
  };
  const removeTag = (tag: string) => onPatch({ tags: project.tags.filter((t) => t !== tag) });

  return (
    <div className="card meta-panel">
      <h2 className="meta-panel__title serif">Ledger</h2>

      <MetaRow label="Status">
        <Select
          aria-label="Status"
          options={STATUS_SELECT}
          value={project.status}
          onChange={(e) => onPatch({ status: e.target.value as Status })}
        />
      </MetaRow>

      <MetaRow label="Priority">
        <Select
          aria-label="Priority"
          options={PRIORITY_SELECT}
          value={project.priority}
          onChange={(e) => onPatch({ priority: e.target.value as Priority })}
        />
      </MetaRow>

      <MetaRow label="Effort">
        <Select
          aria-label="Effort"
          options={EFFORT_SELECT}
          value={project.effort}
          onChange={(e) => onPatch({ effort: e.target.value as Effort })}
        />
      </MetaRow>

      <MetaRow label="Progress">
        <ProgressBar
          value={project.progress}
          editable
          onCommit={(progress) => onPatch({ progress })}
        />
      </MetaRow>

      <MetaRow label="Due date">
        <div className="row gap-6 meta-due">
          <Icon name="calendar" size={15} className="muted" />
          <input
            type="date"
            className="input"
            aria-label="Due date"
            value={project.dueDate ?? ''}
            onChange={(e) => onPatch({ dueDate: e.target.value || null })}
          />
        </div>
      </MetaRow>

      <hr className="hairline meta-panel__rule" />

      <MetaRow label="Collaborators">
        <div className="chip-editor">
          {project.collaborators.length === 0 && (
            <span className="tiny faint">No collaborators yet</span>
          )}
          {project.collaborators.map((name) => (
            <span className="chip chip--person" key={name}>
              <Avatar name={name} />
              <span className="truncate">{name}</span>
              <button
                type="button"
                className="chip__x"
                aria-label={`Remove ${name}`}
                onClick={() => removeCollab(name)}
              >
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <form
            className="chip-add"
            onSubmit={(e) => {
              e.preventDefault();
              addCollab();
            }}
          >
            <input
              className="input"
              placeholder="Add collaborator…"
              aria-label="Add collaborator"
              value={newCollab}
              onChange={(e) => setNewCollab(e.target.value)}
            />
            <IconButton icon="plus" size={15} label="Add collaborator" type="submit" />
          </form>
        </div>
      </MetaRow>

      <MetaRow label="Tags">
        <div className="chip-editor">
          {project.tags.length === 0 && <span className="tiny faint">No tags yet</span>}
          {project.tags.map((tag) => (
            <span className="chip" key={tag}>
              <span className="truncate">{tag}</span>
              <button
                type="button"
                className="chip__x"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
              >
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <form
            className="chip-add"
            onSubmit={(e) => {
              e.preventDefault();
              addTag();
            }}
          >
            <input
              className="input"
              placeholder="Add tag…"
              aria-label="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <IconButton icon="plus" size={15} label="Add tag" type="submit" />
          </form>
        </div>
      </MetaRow>

      <hr className="hairline meta-panel__rule" />

      <div className="meta-stamps">
        <span className="tiny muted">
          Created <span className="mono">{formatDate(project.createdAt)}</span>
        </span>
        <span className="tiny muted">
          Last updated <span className="mono">{formatDate(project.updatedAt)}</span>
        </span>
      </div>
    </div>
  );
}
