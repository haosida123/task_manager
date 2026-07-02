// ControlBar — search + filters + sort for the portfolio ledger.
import { Icon, IconButton, Select, TextInput } from '../ui';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_LABEL,
  PRIORITY_LABEL,
} from '../../lib/format';

export type SortKey = 'manual' | 'updated' | 'priority' | 'progress' | 'status' | 'name';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'manual', label: 'Custom order' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'priority', label: 'Priority' },
  { value: 'progress', label: 'Progress' },
  { value: 'status', label: 'Status' },
  { value: 'name', label: 'Name (A–Z)' },
];

interface ControlBarProps {
  search: string;
  status: string;
  priority: string;
  area: string;
  sort: SortKey;
  areas: string[];
  source: string;
  sourceOpts: { value: string; label: string }[];
  onSearch: (v: string) => void;
  onStatus: (v: string) => void;
  onPriority: (v: string) => void;
  onArea: (v: string) => void;
  onSort: (v: SortKey) => void;
  onSource: (v: string) => void;
  onReset: () => void;
}

export function ControlBar({
  search,
  status,
  priority,
  area,
  sort,
  areas,
  source,
  sourceOpts,
  onSearch,
  onStatus,
  onPriority,
  onArea,
  onSort,
  onSource,
  onReset,
}: ControlBarProps) {
  // "Undone" is a view over all not-done statuses (the default), not a status.
  const statusOpts = [
    { value: 'all', label: 'All statuses' },
    { value: 'undone', label: 'Undone (not done)' },
    ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];
  const priorityOpts = [
    { value: 'all', label: 'All priorities' },
    ...PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })),
  ];
  const areaOpts = [
    { value: 'all', label: 'All areas' },
    ...areas.map((a) => ({ value: a, label: a })),
  ];

  const dirty =
    search.trim() !== '' || status !== 'undone' || priority !== 'all' || area !== 'all';

  return (
    <div className="controlbar">
      <div className="cb-field cb-field--source">
        <span className="cb-cap">Ledger</span>
        <Select
          options={sourceOpts}
          value={source}
          onChange={(e) => onSource(e.target.value)}
          aria-label="Data source"
        />
      </div>

      <div className="cb-search">
        <Icon name="search" size={15} className="icon-lead" />
        <TextInput
          type="search"
          placeholder="Search projects, areas, tags, collaborators…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search projects"
        />
      </div>

      <div className="cb-field">
        <span className="cb-cap">Status</span>
        <Select
          options={statusOpts}
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          aria-label="Filter by status"
        />
      </div>

      <div className="cb-field">
        <span className="cb-cap">Priority</span>
        <Select
          options={priorityOpts}
          value={priority}
          onChange={(e) => onPriority(e.target.value)}
          aria-label="Filter by priority"
        />
      </div>

      <div className="cb-field">
        <span className="cb-cap">Area</span>
        <Select
          options={areaOpts}
          value={area}
          onChange={(e) => onArea(e.target.value)}
          aria-label="Filter by area"
        />
      </div>

      <span className="cb-spacer" />

      <div className="cb-field">
        <span className="cb-cap">Sort</span>
        <Select
          options={SORT_OPTIONS}
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          aria-label="Sort projects"
        />
      </div>

      {dirty && (
        <IconButton
          icon="reset"
          label="Clear filters"
          className="cb-reset"
          onClick={onReset}
        />
      )}
    </div>
  );
}
