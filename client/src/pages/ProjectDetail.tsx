import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  ProjectDetail as ProjectDetailType,
  ProjectPatch,
  NewTask,
  TaskPatch,
  NewUpdate,
  UpdatePatch,
  Update,
} from '../types';
import { api } from '../api';
import { Icon, Spinner, LoadingBlock } from '../components/ui';
import { ProjectHeaderCard } from '../components/detail/ProjectHeaderCard';
import { MetaPanel } from '../components/detail/MetaPanel';
import { TaskList } from '../components/detail/TaskList';
import { UpdateTimeline } from '../components/detail/UpdateTimeline';
import '../components/detail/detail.css';

function sortUpdates(list: Update[]): Update[] {
  return [...list].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);

  // Briefly show a "Saved" confirmation after each successful edit.
  useEffect(() => {
    if (!savedTick) return;
    const t = setTimeout(() => setSavedTick(false), 1600);
    return () => clearTimeout(t);
  }, [savedTick]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api
      .getProject(id)
      .then((p) => {
        if (!cancelled) setProject({ ...p, updates: sortUpdates(p.updates) });
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Wrap a mutation so we surface a subtle saving indicator and swallow errors.
  async function withSaving(fn: () => Promise<void>): Promise<void> {
    setSaving(true);
    setSaveError(null);
    try {
      await fn();
      setSavedTick(true);
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Couldn’t save your change.');
    } finally {
      setSaving(false);
    }
  }

  const patchProject = (patch: ProjectPatch) =>
    withSaving(async () => {
      if (!id) return;
      const updated = await api.updateProject(id, patch);
      // updateProject returns a ProjectSummary (superset of Project); merge its
      // project-level fields while preserving local tasks[]/updates[].
      setProject((prev) => (prev ? { ...prev, ...updated } : prev));
    });

  const removeProject = () =>
    withSaving(async () => {
      if (!id) return;
      await api.deleteProject(id);
      navigate('/');
    });

  const addTask = (payload: NewTask) =>
    withSaving(async () => {
      if (!id) return;
      const task = await api.createTask(id, payload);
      setProject((prev) => (prev ? { ...prev, tasks: [...prev.tasks, task] } : prev));
    });

  const patchTask = (taskId: string, patch: TaskPatch) =>
    withSaving(async () => {
      const task = await api.updateTask(taskId, patch);
      setProject((prev) =>
        prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? task : t)) } : prev,
      );
    });

  const deleteTask = (taskId: string) =>
    withSaving(async () => {
      await api.deleteTask(taskId);
      setProject((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : prev,
      );
    });

  const reorderTasks = (ids: string[]) =>
    withSaving(async () => {
      if (!id) return;
      // Optimistically apply the new order (index within `ids`), then persist.
      setProject((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => {
                const i = ids.indexOf(t.id);
                return i === -1 ? t : { ...t, order: i };
              }),
            }
          : prev,
      );
      await api.reorderTasks(id, ids);
    });

  const addUpdate = (payload: NewUpdate) =>
    withSaving(async () => {
      if (!id) return;
      const update = await api.createUpdate(id, payload);
      setProject((prev) =>
        prev ? { ...prev, updates: sortUpdates([update, ...prev.updates]) } : prev,
      );
    });

  const patchUpdate = (updateId: string, patch: UpdatePatch) =>
    withSaving(async () => {
      const update = await api.updateUpdate(updateId, patch);
      setProject((prev) =>
        prev
          ? {
              ...prev,
              updates: sortUpdates(prev.updates.map((u) => (u.id === updateId ? update : u))),
            }
          : prev,
      );
    });

  const deleteUpdate = (updateId: string) =>
    withSaving(async () => {
      await api.deleteUpdate(updateId);
      setProject((prev) =>
        prev ? { ...prev, updates: prev.updates.filter((u) => u.id !== updateId) } : prev,
      );
    });

  if (loading) {
    return (
      <div className="container detail-page">
        <LoadingBlock label="Loading project…" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="container detail-page">
        <div className="card detail-missing">
          <h2 className="serif">Project not found</h2>
          <p className="muted">
            This project may have been deleted or the link is out of date.
          </p>
          <Link to="/" className="detail-back">
            <Icon name="arrow-left" size={15} /> Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container detail-page fade-in">
      <div className="detail-topbar">
        <Link to="/" className="detail-back">
          <Icon name="arrow-left" size={15} /> Portfolio
        </Link>
        {saveError ? (
          <span className="detail-saving detail-saving--error is-visible" role="alert">
            <Icon name="x" size={13} /> {saveError}
          </span>
        ) : saving ? (
          <span className="detail-saving is-visible" aria-live="polite">
            <Spinner size={13} /> Saving…
          </span>
        ) : (
          <span
            className={`detail-saving detail-saving--saved ${savedTick ? 'is-visible' : ''}`}
            aria-live="polite"
          >
            <Icon name="check" size={13} /> Saved locally
          </span>
        )}
      </div>

      <ProjectHeaderCard project={project} onPatch={patchProject} onDelete={removeProject} />

      <div className="detail-grid">
        <div className="detail-main">
          <TaskList
            tasks={project.tasks}
            onAdd={addTask}
            onPatch={patchTask}
            onDelete={deleteTask}
            onReorder={reorderTasks}
          />
          <UpdateTimeline
            updates={project.updates}
            onAdd={addUpdate}
            onPatch={patchUpdate}
            onDelete={deleteUpdate}
          />
        </div>
        <aside className="detail-side">
          <MetaPanel project={project} onPatch={patchProject} />
        </aside>
      </div>
    </div>
  );
}
