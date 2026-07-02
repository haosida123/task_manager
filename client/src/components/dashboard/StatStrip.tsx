// StatStrip — the "at a glance" band of portfolio figures.
// Presentational: receives already-computed aggregates from the Dashboard.

interface StatStripProps {
  total: number;
  undone: number;
  highPriority: number;
  avgProgress: number; // 0-100
  openTasks: number;
}

interface Figure {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}

export function StatStrip({ total, undone, highPriority, avgProgress, openTasks }: StatStripProps) {
  const figures: Figure[] = [
    { label: 'Projects', value: String(total) },
    { label: 'Undone', value: String(undone) },
    { label: 'High priority', value: String(highPriority) },
    { label: 'Avg progress', value: String(avgProgress), unit: '%', accent: true },
    { label: 'Open tasks', value: String(openTasks) },
  ];

  return (
    <div className="statstrip card" role="group" aria-label="Portfolio summary">
      {figures.map((f) => (
        <div
          key={f.label}
          className={`statstrip__item${f.accent ? ' statstrip__item--accent' : ''}`}
        >
          <span className="statstrip__value">
            {f.value}
            {f.unit && <span className="unit">{f.unit}</span>}
          </span>
          <span className="statstrip__label">{f.label}</span>
        </div>
      ))}
    </div>
  );
}
