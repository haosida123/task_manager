import type { Priority, Effort, Status } from '../../types';
import { PRIORITY_LABEL, EFFORT_LABEL, STATUS_LABEL } from '../../lib/format';

type Tone = 'red' | 'amber' | 'green' | 'blue' | 'slate' | 'plum';

const PRIORITY_TONE: Record<Priority, Tone> = { high: 'red', medium: 'amber', low: 'slate' };
const EFFORT_TONE: Record<Effort, Tone> = { high: 'plum', medium: 'blue', low: 'slate' };
const STATUS_TONE: Record<Status, Tone> = {
  active: 'green',
  planning: 'blue',
  in_review: 'plum',
  on_hold: 'slate',
  done: 'slate',
};

interface BadgeProps {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  title?: string;
}

export function Badge({ tone, children, dot, title }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

export function PriorityBadge({ value }: { value: Priority }) {
  return (
    <Badge tone={PRIORITY_TONE[value]} dot title={`Priority: ${PRIORITY_LABEL[value]}`}>
      {PRIORITY_LABEL[value]}
    </Badge>
  );
}

export function EffortBadge({ value }: { value: Effort }) {
  return (
    <Badge tone={EFFORT_TONE[value]} title={`Effort: ${EFFORT_LABEL[value]}`}>
      {EFFORT_LABEL[value]}
    </Badge>
  );
}

export function StatusBadge({ value }: { value: Status }) {
  return (
    <Badge tone={STATUS_TONE[value]} dot title={`Status: ${STATUS_LABEL[value]}`}>
      {STATUS_LABEL[value]}
    </Badge>
  );
}
