// ProjectTable — the CSS-grid "ledger" of projects, with drag-to-reorder.
import { useState } from 'react';
import type { ProjectSummary, ProjectPatch } from '../../types';
import { ProjectRow } from './ProjectRow';
import { Icon } from '../ui';

interface ProjectTableProps {
  projects: ProjectSummary[];
  refYear: number;
  onPatch: (id: string, patch: ProjectPatch) => Promise<void>;
  reorderable: boolean;
  onReorder: (ids: string[]) => void;
}

export function ProjectTable({
  projects,
  refYear,
  onPatch,
  reorderable,
  onReorder,
}: ProjectTableProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function commitDrop() {
    if (dragId && overId && dragId !== overId) {
      const ids = projects.map((p) => p.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(overId);
      if (from !== -1 && to !== -1) {
        const next = [...ids];
        next.splice(from, 1);
        next.splice(to, 0, dragId);
        onReorder(next);
      }
    }
    setDragId(null);
    setOverId(null);
  }

  if (projects.length === 0) {
    return (
      <div className="card dash-state">
        <h3 className="serif">No projects match</h3>
        <p className="muted">Try clearing the search or relaxing a filter.</p>
      </div>
    );
  }

  return (
    <>
      {reorderable && (
        <p className="ledger-hint tiny muted">
          <Icon name="grip" size={13} /> Drag the handle at the start of a row to reorder.
        </p>
      )}
      <div className={`ledger ${reorderable ? 'is-reorderable' : ''}`} role="table" aria-label="Projects">
        <div className="ledger__head" role="row">
          <span className="h-cell" aria-hidden="true" />
          <span className="h-cell col-project">Project</span>
          <span className="h-cell col-priority">Priority</span>
          <span className="h-cell col-effort">Effort</span>
          <span className="h-cell col-progress">Progress</span>
          <span className="h-cell col-update">Latest update</span>
          <span className="h-cell col-next">Next steps</span>
          <span className="h-cell col-team">Team</span>
          <span className="h-cell col-status">Status</span>
        </div>

        <div className="ledger__body">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              refYear={refYear}
              onPatch={onPatch}
              reorderable={reorderable}
              dragging={dragId === p.id}
              dropTarget={reorderable && overId === p.id && dragId !== null && dragId !== p.id}
              onDragStartRow={() => setDragId(p.id)}
              onDragOverRow={() => {
                if (dragId && dragId !== p.id) setOverId(p.id);
              }}
              onDropRow={commitDrop}
              onDragEndRow={() => {
                setDragId(null);
                setOverId(null);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
