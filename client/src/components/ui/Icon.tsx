// Minimal inline SVG icon set (Feather-style, 1.6px stroke, currentColor).
import type { CSSProperties } from 'react';

const PATHS: Record<string, JSX.Element> = {
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6L9 17l-5-5" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  'chevron-right': <path d="M9 18l6-6-6-6" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'arrow-left': <path d="M19 12H5M12 19l-7-7 7-7" />,
  'arrow-up': <path d="M12 19V5M5 12l7-7 7 7" />,
  pin: <path d="M12 17v5M9 3h6l-1 7 3 3H7l3-3-1-7z" />,
  trash: <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />,
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />,
  calendar: <path d="M8 2v4M16 2v4M3 8h18M5 4h14v16H5z" />,
  search: <path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3" />,
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />,
  sort: <path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l3 3M17 20l-3-3" />,
  'more-horizontal': <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  book: <path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM19 3v18" />,
  users: <path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0116 11" />,
  clock: <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />,
  layers: <path d="M12 2l10 5-10 5L2 7l10-5zM2 12l10 5 10-5M2 17l10 5 10-5" />,
  flag: <path d="M4 22V4h13l-2 4 2 4H4" />,
  gauge: <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 12l4-3" />,
  archive: <path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4" />,
  reset: <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 3v3.3h3.3" />,
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="5" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="15" cy="5" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="15" cy="19" r="1.4" />
    </g>
  ),
};

interface IconProps {
  name: keyof typeof PATHS | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, strokeWidth = 1.7, className, style }: IconProps) {
  const glyph = PATHS[name] ?? PATHS['more-horizontal'];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}
