// Dashboard — the "Research Portfolio" home screen.
// Owns data fetching, filter/sort state, and inline-edit plumbing.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, LoadingBlock } from '../components/ui';
import { StatStrip } from '../components/dashboard/StatStrip';
import { ControlBar } from '../components/dashboard/ControlBar';
import type { SortKey } from '../components/dashboard/ControlBar';
import { ProjectTable } from '../components/dashboard/ProjectTable';
import { NewProjectModal } from '../components/dashboard/NewProjectModal';
import { ExportModal } from '../components/dashboard/ExportModal';
import { api } from '../api';
import type { ProjectSummary, ProjectPatch } from '../types';
import { PRIORITY_RANK } from '../lib/format';
import '../components/dashboard/dashboard.css';

function matchesSearch(p: ProjectSummary, q: string): boolean {
  if (!q) return true;
  const hay = [p.name, p.area, ...p.tags, ...p.collaborators].join(' ').toLowerCase();
  return hay.includes(q);
}

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [area, setArea] = useState('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [modalOpen, setModalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the portfolio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Replace a single project in state with the record returned by a mutation.
  const handlePatch = useCallback(async (id: string, patch: ProjectPatch) => {
    const updated = await api.updateProject(id, patch);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const handleCreated = useCallback((created: ProjectSummary) => {
    setProjects((prev) => [created, ...prev]);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStatus('all');
    setPriority('all');
    setArea('all');
  }, []);

  const refYear = new Date().getFullYear();

  // Aggregates for the StatStrip + subtitle (computed over the whole portfolio).
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'active').length;
    const highPriority = projects.filter((p) => p.priority === 'high').length;
    const openTasks = projects.reduce((sum, p) => sum + p.openTasks, 0);
    const avgProgress = total
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / total)
      : 0;
    return { total, active, highPriority, openTasks, avgProgress };
  }, [projects]);

  const areas = useMemo(
    () =>
      Array.from(new Set(projects.map((p) => p.area).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [projects],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = projects.filter(
      (p) =>
        matchesSearch(p, q) &&
        (status === 'all' || p.status === status) &&
        (priority === 'all' || p.priority === priority) &&
        (area === 'all' || p.area === area),
    );

    const bySort = (a: ProjectSummary, b: ProjectSummary): number => {
      switch (sort) {
        case 'priority': {
          const d = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          return d !== 0 ? d : b.updatedAt.localeCompare(a.updatedAt);
        }
        case 'progress':
          return b.progress - a.progress;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    };

    // Pinned projects float to the top within the chosen sort.
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return bySort(a, b);
    });
  }, [projects, search, status, priority, area, sort]);

  const subtitle = loading
    ? 'Loading portfolio…'
    : `${stats.total} ${stats.total === 1 ? 'project' : 'projects'}` +
      ` · ${stats.active} active · ${stats.highPriority} high priority`;

  return (
    <div className="container dashboard fade-in">
      <header className="dash-head">
        <div>
          <h1 className="dash-head__title serif">Research Portfolio</h1>
          <p className="dash-head__sub muted">{subtitle}</p>
        </div>
        <div className="row gap-8">
          <Button icon="archive" onClick={() => setExportOpen(true)}>
            Export
          </Button>
          <Button variant="primary" icon="plus" onClick={() => setModalOpen(true)}>
            New project
          </Button>
        </div>
      </header>

      {loading && <LoadingBlock label="Loading portfolio…" />}

      {!loading && error && (
        <div className="card dash-state">
          <h3 className="serif">Couldn’t load the portfolio</h3>
          <p className="muted">{error}</p>
          <Button variant="primary" icon="reset" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <StatStrip
            total={stats.total}
            active={stats.active}
            highPriority={stats.highPriority}
            avgProgress={stats.avgProgress}
            openTasks={stats.openTasks}
          />

          <ControlBar
            search={search}
            status={status}
            priority={priority}
            area={area}
            sort={sort}
            areas={areas}
            onSearch={setSearch}
            onStatus={setStatus}
            onPriority={setPriority}
            onArea={setArea}
            onSort={setSort}
            onReset={resetFilters}
          />

          {projects.length === 0 ? (
            <div className="card dash-state">
              <h3 className="serif">No projects yet</h3>
              <p className="muted">
                Start your ledger by adding the first research project.
              </p>
              <Button variant="primary" icon="plus" onClick={() => setModalOpen(true)}>
                New project
              </Button>
            </div>
          ) : (
            <ProjectTable projects={visible} refYear={refYear} onPatch={handlePatch} />
          )}
        </>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        projectIds={visible.map((p) => p.id)}
      />
    </div>
  );
}
