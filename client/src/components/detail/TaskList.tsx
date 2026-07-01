import { useMemo, useState } from 'react';
import type { Task, NewTask, TaskPatch, Priority, Effort } from '../../types';
import {
  PRIORITY_OPTIONS,
  EFFORT_OPTIONS,
  PRIORITY_LABEL,
  EFFORT_LABEL,
} from '../../lib/format';
import { PriorityBadge, EffortBadge, IconButton, Select, Icon } from '../ui';
import { EditableText } from './EditableText';

const PRIORITY_SELECT = PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));
const EFFORT_SELECT = EFFORT_OPTIONS.map((e) => ({ value: e, label: EFFORT_LABEL[e] }));

function cycle<T>(options: readonly T[], current: T): T {
  const idx = options.indexOf(current);
  return options[(idx + 1) % options.length];
}

interface TaskRowProps {
  task: Task;
  onPatch: (id: string, patch: TaskPatch) => void;
  onDelete: (id: string) => void;
}

function TaskRow({ task, onPatch, onDelete }: TaskRowProps) {
  return (
    <li className={`task-row ${task.done ? 'is-done' : ''}`}>
      <button
        type="button"
        className={`task-check ${task.done ? 'is-done' : ''}`}
        aria-pressed={task.done}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        title={task.done ? 'Mark as not done' : 'Mark as done'}
        onClick={() => onPatch(task.id, { done: !task.done })}
      >
        {task.done && <Icon name="check" size={13} />}
      </button>

      <EditableText
        tag="span"
        className="task-title grow"
        value={task.title}
        emptyText="Untitled task"
        ariaLabel="Task title"
        onCommit={(title) => title && onPatch(task.id, { title })}
      />

      <div className="task-badges">
        <button
          type="button"
          className="badge-btn"
          title={`Priority: ${PRIORITY_LABEL[task.priority]} — click to change`}
          aria-label="Change priority"
          onClick={() => onPatch(task.id, { priority: cycle(PRIORITY_OPTIONS, task.priority) })}
        >
          <PriorityBadge value={task.priority} />
        </button>
        <button
          type="button"
          className="badge-btn"
          title={`Effort: ${EFFORT_LABEL[task.effort]} — click to change`}
          aria-label="Change effort"
          onClick={() => onPatch(task.id, { effort: cycle(EFFORT_OPTIONS, task.effort) })}
        >
          <EffortBadge value={task.effort} />
        </button>
        <IconButton
          icon="trash"
          size={15}
          label="Delete task"
          className="task-del"
          onClick={() => onDelete(task.id)}
        />
      </div>
    </li>
  );
}

interface TaskListProps {
  tasks: Task[];
  onAdd: (payload: NewTask) => void;
  onPatch: (id: string, patch: TaskPatch) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ tasks, onAdd, onPatch, onDelete }: TaskListProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [effort, setEffort] = useState<Effort>('medium');
  const [showDone, setShowDone] = useState(true);

  const { open, done } = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => a.order - b.order);
    return {
      open: sorted.filter((t) => !t.done),
      done: sorted.filter((t) => t.done),
    };
  }, [tasks]);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd({ title: t, priority, effort });
    setTitle('');
    setPriority('medium');
    setEffort('medium');
  };

  return (
    <section className="card task-list">
      <header className="task-list__head">
        <h2 className="serif">Next steps</h2>
        <span className="tiny muted mono">
          {done.length} of {tasks.length} done
        </span>
      </header>

      {open.length === 0 && done.length === 0 && (
        <p className="task-empty muted small">
          No tasks yet — add the first concrete next step below.
        </p>
      )}

      {open.length > 0 && (
        <ul className="task-rows">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} onPatch={onPatch} onDelete={onDelete} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="task-done-block">
          <button
            type="button"
            className="task-done-toggle upper"
            onClick={() => setShowDone((s) => !s)}
          >
            <Icon name={showDone ? 'chevron-down' : 'chevron-right'} size={13} />
            Completed ({done.length})
          </button>
          {showDone && (
            <ul className="task-rows task-rows--done">
              {done.map((task) => (
                <TaskRow key={task.id} task={task} onPatch={onPatch} onDelete={onDelete} />
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        className="task-add"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className="input grow"
          placeholder="Add a next step…"
          aria-label="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select
          aria-label="New task priority"
          className="task-add__select"
          options={PRIORITY_SELECT}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        />
        <Select
          aria-label="New task effort"
          className="task-add__select"
          options={EFFORT_SELECT}
          value={effort}
          onChange={(e) => setEffort(e.target.value as Effort)}
        />
        <IconButton icon="plus" label="Add task" type="submit" disabled={!title.trim()} />
      </form>
    </section>
  );
}
