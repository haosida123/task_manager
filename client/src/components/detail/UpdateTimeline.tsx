import { useState } from 'react';
import type { Update, NewUpdate, UpdatePatch } from '../../types';
import { formatDate, relativeDate } from '../../lib/format';
import { Button, IconButton, TextArea, Icon } from '../ui';

// Today as YYYY-MM-DD in local time (no timezone drift).
function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Seed bodies pack several notes into one string with " · " separators.
function segments(body: string): string[] {
  return body
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface UpdateEntryProps {
  update: Update;
  onPatch: (id: string, patch: UpdatePatch) => void;
  onDelete: (id: string) => void;
}

function UpdateEntry({ update, onPatch, onDelete }: UpdateEntryProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(update.body);

  const save = () => {
    setEditing(false);
    if (draft.trim() !== update.body) onPatch(update.id, { body: draft.trim() });
  };

  const parts = segments(update.body);

  return (
    <li className="tl-entry">
      <span className="tl-dot" aria-hidden="true" />
      <div className="tl-content">
        <div className="tl-head">
          <span className="tl-date serif">{formatDate(update.date)}</span>
          <span className="tl-rel tiny muted">{relativeDate(update.date)}</span>
          <span className="grow" />
          {!editing && (
            <div className="tl-actions">
              <IconButton
                icon="edit"
                size={14}
                label="Edit update"
                onClick={() => {
                  setDraft(update.body);
                  setEditing(true);
                }}
              />
              <IconButton
                icon="trash"
                size={14}
                label="Delete update"
                onClick={() => onDelete(update.id)}
              />
            </div>
          )}
        </div>

        {editing ? (
          <div className="tl-edit">
            <TextArea
              autoFocus
              value={draft}
              aria-label="Update body"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditing(false);
                  setDraft(update.body);
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  save();
                }
              }}
            />
            <div className="row gap-6">
              <Button size="sm" variant="primary" onClick={save}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(update.body);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : parts.length > 1 ? (
          <ul className="tl-bullets">
            {parts.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        ) : (
          <p className="tl-body">{update.body || <span className="faint">Empty note</span>}</p>
        )}
      </div>
    </li>
  );
}

interface UpdateTimelineProps {
  updates: Update[];
  onAdd: (payload: NewUpdate) => void;
  onPatch: (id: string, patch: UpdatePatch) => void;
  onDelete: (id: string) => void;
}

export function UpdateTimeline({ updates, onAdd, onPatch, onDelete }: UpdateTimelineProps) {
  const [date, setDate] = useState(todayISO());
  const [body, setBody] = useState('');

  const submit = () => {
    const b = body.trim();
    if (!b) return;
    onAdd({ date: date || todayISO(), body: b });
    setBody('');
    setDate(todayISO());
  };

  return (
    <section className="card timeline">
      <header className="timeline__head">
        <h2 className="serif">Progress log</h2>
        <span className="tiny muted mono">{updates.length} entries</span>
      </header>

      <form
        className="update-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="update-form__row">
          <div className="row gap-6 update-form__date">
            <Icon name="calendar" size={15} className="muted" />
            <input
              type="date"
              className="input"
              aria-label="Update date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" icon="plus" disabled={!body.trim()}>
            Log update
          </Button>
        </div>
        <TextArea
          placeholder="What moved forward? Note results, blockers, decisions…"
          aria-label="New update body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </form>

      {updates.length === 0 ? (
        <p className="muted small" style={{ paddingTop: 6 }}>
          No log entries yet. Record the first note above.
        </p>
      ) : (
        <ul className="tl-rail">
          {updates.map((u) => (
            <UpdateEntry key={u.id} update={u} onPatch={onPatch} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}
