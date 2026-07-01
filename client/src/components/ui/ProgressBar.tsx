import { useEffect, useState } from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  showLabel?: boolean;
  editable?: boolean;
  onCommit?: (value: number) => void;
  width?: number | string;
}

// A slim progress bar. When `editable`, renders a range slider overlay and
// commits the value on release (mouse up / change).
export function ProgressBar({
  value,
  showLabel = false,
  editable = false,
  onCommit,
  width,
}: ProgressBarProps) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  if (editable) {
    return (
      <div className="progress-edit" style={{ width }}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={local}
          onChange={(e) => setLocal(Number(e.target.value))}
          onMouseUp={() => onCommit && local !== value && onCommit(local)}
          onKeyUp={() => onCommit && local !== value && onCommit(local)}
          onTouchEnd={() => onCommit && local !== value && onCommit(local)}
          aria-label="Progress"
        />
        <span className="mono small" style={{ minWidth: 34, textAlign: 'right' }}>
          {local}%
        </span>
      </div>
    );
  }

  return (
    <div className="row gap-8" style={{ width }}>
      <div className="progress grow" title={`${Math.round(value)}% complete`}>
        <div className="progress__bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {showLabel && (
        <span className="mono tiny muted" style={{ minWidth: 30, textAlign: 'right' }}>
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
