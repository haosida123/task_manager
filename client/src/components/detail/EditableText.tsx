import { useEffect, useRef, useState } from 'react';

type DisplayTag = 'h1' | 'h2' | 'h3' | 'span' | 'p' | 'div';

interface EditableTextProps {
  value: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
  placeholder?: string; // shown inside the input while editing
  emptyText?: string; // shown in display mode when value is blank
  tag?: DisplayTag;
  className?: string; // applied to the display element
  inputClassName?: string; // extra classes for the input/textarea
  ariaLabel?: string;
  trimOnCommit?: boolean;
}

// Small click-to-edit text helper. Click (or Enter/Space) turns the display
// element into an input/textarea; Enter or blur commits, Escape reverts.
// Only fires onCommit when the value actually changed.
export function EditableText({
  value,
  onCommit,
  multiline = false,
  placeholder,
  emptyText = 'Add…',
  tag = 'span',
  className = '',
  inputClassName = '',
  ariaLabel,
  trimOnCommit = true,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editing]);

  const start = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = trimOnCommit ? draft.trim() : draft;
    if (next !== value) onCommit(next);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  if (editing) {
    const shared = {
      ref: inputRef as never,
      value: draft,
      placeholder,
      'aria-label': ariaLabel,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
    };
    if (multiline) {
      return (
        <textarea
          {...shared}
          className={`textarea ${inputClassName}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commit();
            }
          }}
        />
      );
    }
    return (
      <input
        {...shared}
        className={`input ${inputClassName}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') cancel();
        }}
      />
    );
  }

  const Tag = tag;
  const isEmpty = value.trim().length === 0;
  const cls = [
    'editable',
    multiline ? 'editable--multiline' : '',
    isEmpty ? 'editable--empty' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      className={cls}
      role="button"
      tabIndex={0}
      title="Click to edit"
      aria-label={ariaLabel}
      onClick={start}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          start();
        }
      }}
    >
      {isEmpty ? emptyText : value}
    </Tag>
  );
}
