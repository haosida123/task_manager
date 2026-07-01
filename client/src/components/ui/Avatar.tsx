import { initials } from '../../lib/format';

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" title={name}>
      {initials(name)}
    </span>
  );
}

// Overlapping stack of collaborator avatars, with a "+N" overflow chip.
export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  if (!names || names.length === 0) return null;
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="avatar-stack" title={names.join(', ')}>
      {shown.map((n, i) => (
        <span className="avatar-stack__item" key={n + i} style={{ zIndex: shown.length - i }}>
          <Avatar name={n} />
        </span>
      ))}
      {extra > 0 && <span className="avatar avatar--more">+{extra}</span>}
    </span>
  );
}
