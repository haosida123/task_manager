// ProjectTable — the CSS-grid "ledger" of projects.
import type { ProjectSummary, ProjectPatch } from '../../types';
import { ProjectRow } from './ProjectRow';

interface ProjectTableProps {
  projects: ProjectSummary[];
  refYear: number;
  onPatch: (id: string, patch: ProjectPatch) => Promise<void>;
}

export function ProjectTable({ projects, refYear, onPatch }: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <div className="card dash-state">
        <h3 className="serif">No projects match</h3>
        <p className="muted">Try clearing the search or relaxing a filter.</p>
      </div>
    );
  }

  return (
    <div className="ledger" role="table" aria-label="Projects">
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
          <ProjectRow key={p.id} project={p} refYear={refYear} onPatch={onPatch} />
        ))}
      </div>
    </div>
  );
}
