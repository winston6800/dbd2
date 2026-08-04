import React, { useEffect, useRef, useState } from 'react';
import { BOARD_H } from '../../lib/monster/layout';

const BOARD_W = 800;

/**
 * The battle board is a fixed 800×640 composition — the handoff's layout math
 * (orbit radius, node steps, label chords) is written in absolute px against
 * that box. Reflowing it for phones would mean inventing a second layout the
 * design doesn't specify, so instead the whole board is scaled down as a unit
 * and the wrapper collapses to the scaled height so nothing below it floats.
 *
 * At >=800px wide this is a no-op.
 */
export const BoardScaler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(Math.min(1, width / BOARD_W));
    };

    measure();

    // ResizeObserver is missing in some test environments; the initial measure
    // above is enough there.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="mg-board-scaler" style={{ height: BOARD_H * scale }}>
      <div className="mg-board-fixed" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};
