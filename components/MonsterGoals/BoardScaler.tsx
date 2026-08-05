import React, { useEffect, useRef, useState } from 'react';
import { BOARD_H } from '../../lib/monster/layout';

const BOARD_W = 800;
const MAX_SCALE = 1.6;

/**
 * The battle board is a fixed 800×640 composition — the handoff's layout math
 * (orbit radius, node steps, label chords) is written in absolute px against
 * that box. Reflowing it would mean inventing a second layout the design does
 * not specify, so the whole board is scaled as a unit instead.
 *
 * The scale is limited by whichever axis runs out first: width on a phone,
 * height on a short laptop screen. Measuring the slot rather than the board
 * itself avoids a feedback loop, since the board's rendered size is what the
 * scale produces.
 */
export const BoardScaler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const slot = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = slot.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0) return;
      // Height is only a constraint when the slot actually has one; in the
      // stacked mobile layout it grows to fit instead.
      const byWidth = width / BOARD_W;
      const byHeight = height > 0 ? height / BOARD_H : Infinity;
      // Scaling up is allowed so a large screen is actually used, capped so the
      // board never turns into a billboard on an ultrawide.
      setScale(Math.min(byWidth, byHeight, MAX_SCALE));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={slot} className="mg-board-slot">
      <div className="mg-board-fixed" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};
