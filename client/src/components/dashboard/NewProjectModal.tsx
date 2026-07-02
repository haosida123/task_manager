// NewProjectModal — create a project from the portfolio page.
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Field,
  Modal,
  ProgressBar,
  Select,
  TextArea,
  TextInput,
} from '../ui';
import { api } from '../../api';
import type { ProjectSummary, NewProject, Status, Priority, Effort } from '../../types';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  EFFORT_OPTIONS,
  STATUS_LABEL,
  PRIORITY_LABEL,
  EFFORT_LABEL,
} from '../../lib/format';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectSummary) => void;
}

const FORM_ID = 'new-project-form';

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('planning');
  const [priority, setPriority] = useState<Priority>('medium');
  const [effort, setEffort] = useState<Effort>('medium');
  const [progress, setProgress] = useState(0);
  const [collaborators, setCollaborators] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the modal is opened.
  useEffect(() => {
    if (!open) return;
    setName('');
    setArea('');
    setDescription('');
    setStatus('planning');
    setPriority('medium');
    setEffort('medium');
    setProgress(0);
    setCollaborators('');
    setTags('');
    setSubmitting(false);
    setError(null);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please give the project a name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: NewProject = {
      name: name.trim(),
      area: area.trim(),
      description: description.trim(),
      status,
      priority,
      effort,
      progress,
      collaborators: splitList(collaborators),
      tags: splitList(tags),
    };
    try {
      const created = await api.createProject(payload);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
      setSubmitting(false);
    }
  }

  const statusOpts = STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const priorityOpts = PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));
  const effortOpts = EFFORT_OPTIONS.map((ef) => ({ value: ef, label: EFFORT_LABEL[ef] }));

  return (
    <Modal
      open={open}
      title="New project"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="npm-form" onSubmit={handleSubmit}>
        {error && <div className="npm-error">{error}</div>}

        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Solver benchmark suite"
            autoFocus
            required
          />
        </Field>

        <Field label="Area">
          <TextInput
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Cohesive Zone Modeling"
          />
        </Field>

        <Field label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short abstract of the project…"
          />
        </Field>

        <div className="npm-grid">
          <Field label="Status">
            <Select
              options={statusOpts}
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            />
          </Field>
          <Field label="Priority">
            <Select
              options={priorityOpts}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            />
          </Field>
          <Field label="Effort">
            <Select
              options={effortOpts}
              value={effort}
              onChange={(e) => setEffort(e.target.value as Effort)}
            />
          </Field>
        </div>

        <div className="npm-progress">
          <span className="cb-cap" style={{ color: 'var(--ink-3)' }}>
            Progress
          </span>
          <ProgressBar value={progress} editable onCommit={setProgress} />
        </div>

        <div className="npm-grid-2">
          <Field label="Collaborators">
            <TextInput
              value={collaborators}
              onChange={(e) => setCollaborators(e.target.value)}
              placeholder="Comma separated"
            />
          </Field>
          <Field label="Tags">
            <TextInput
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma separated"
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
