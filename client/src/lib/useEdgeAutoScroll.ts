import { useEffect, useRef } from 'react';

// While a native drag is in progress (`active` is true), scroll the window when
// the pointer nears the top/bottom of the viewport — so you can drag an item
// across a list that is taller than the screen. A requestAnimationFrame loop
// keeps scrolling even when the pointer holds still in the edge zone (where
// `dragover` stops firing).
export function useEdgeAutoScroll(active: boolean) {
  const yRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const EDGE = 100; // px from a viewport edge where auto-scroll kicks in
    const MAX_SPEED = 22; // px per frame at the very edge

    const onDragOver = (e: DragEvent) => {
      yRef.current = e.clientY;
    };

    const tick = () => {
      const y = yRef.current;
      const h = window.innerHeight;
      let dy = 0;
      if (y > 0 && y < EDGE) {
        dy = -Math.ceil(((EDGE - y) / EDGE) * MAX_SPEED);
      } else if (y > h - EDGE) {
        dy = Math.ceil(((y - (h - EDGE)) / EDGE) * MAX_SPEED);
      }
      if (dy !== 0) window.scrollBy(0, dy);
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('dragover', onDragOver);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('dragover', onDragOver);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active]);
}
