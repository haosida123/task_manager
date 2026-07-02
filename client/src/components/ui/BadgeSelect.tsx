// BadgeSelect — a badge that opens a dropdown menu to pick a new value.
// Used for inline editing of priority / effort / status on the dashboard.
// The menu renders in a portal, positioned under the trigger, so it is not
// clipped by the ledger's `overflow: hidden`.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface BadgeSelectOption<T extends string> {
  value: T;
  label: string;
}

interface BadgeSelectProps<T extends string> {
  value: T;
  options: readonly BadgeSelectOption<T>[];
  onChange: (value: T) => void;
  /** Render the badge for a given value (used for both trigger and options). */
  renderBadge: (value: T) => React.ReactNode;
  ariaLabel: string;
  /** Extra class on the trigger button. */
  className?: string;
}

export function BadgeSelect<T extends string>({
  value,
  options,
  onChange,
  renderBadge,
  ariaLabel,
  className,
}: BadgeSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Anchor the menu under the trigger (fixed positioning, viewport coords).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }, [open]);

  // Dismiss on outside click, Escape, or any scroll/resize (the anchor moves).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const dismiss = () => setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`badge-btn${className ? ` ${className}` : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {renderBadge(value)}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="badge-menu fade-in"
            role="listbox"
            aria-label={ariaLabel}
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`badge-menu__item${opt.value === value ? ' is-selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if (opt.value !== value) onChange(opt.value);
                }}
              >
                {renderBadge(opt.value)}
                {opt.value === value && (
                  <Icon name="check" size={13} className="badge-menu__tick" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
