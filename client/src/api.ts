// Thin typed wrapper over the REST API. All calls use a relative `/api` base so
// the same code works in dev (Vite proxy) and production (Express serves both).
import type {
  ProjectSummary,
  ProjectDetail,
  NewProject,
  ProjectPatch,
  Task,
  NewTask,
  TaskPatch,
  Update,
  NewUpdate,
  UpdatePatch,
  ExportData,
} from './types';

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {
      /* ignore body parse errors */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // projects
  listProjects: () => request<ProjectSummary[]>('/projects'),
  getProject: (id: string) => request<ProjectDetail>(`/projects/${id}`),
  createProject: (body: NewProject) =>
    request<ProjectSummary>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: string, body: ProjectPatch) =>
    request<ProjectSummary>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id: string) =>
    request<{ ok: true }>(`/projects/${id}`, { method: 'DELETE' }),
  reorderProjects: (ids: string[]) =>
    request<{ ok: true }>('/projects/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  // tasks
  createTask: (projectId: string, body: NewTask) =>
    request<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: string, body: TaskPatch) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<{ ok: true }>(`/tasks/${id}`, { method: 'DELETE' }),
  reorderTasks: (projectId: string, ids: string[]) =>
    request<{ ok: true }>(`/projects/${projectId}/tasks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // updates
  createUpdate: (projectId: string, body: NewUpdate) =>
    request<Update>(`/projects/${projectId}/updates`, { method: 'POST', body: JSON.stringify(body) }),
  updateUpdate: (id: string, body: UpdatePatch) =>
    request<Update>(`/updates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUpdate: (id: string) => request<{ ok: true }>(`/updates/${id}`, { method: 'DELETE' }),

  // export
  getExport: () => request<ExportData>('/export'),
  xlsxUrl: '/api/export.xlsx',
};
