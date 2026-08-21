import React from 'react';
import type { Task } from '../../lib/monster/types';
import { COLORS, DISPLAY_FONT } from '../../lib/monster/tokens';

interface TaskQueueProps {
  tasks: Task[];
  onComplete: (taskId: string) => void;
}

/**
 * Undone tasks sort first so the next actionable item is always at the top.
 * Completed rows are not un-checkable — deploying a Milk is one-way.
 */
export const TaskQueue: React.FC<TaskQueueProps> = ({ tasks, onComplete }) => {
  const queued = tasks.filter(t => !t.done);
  const deployed = tasks.filter(t => t.done);
  const ordered = [...queued, ...deployed];

  if (ordered.length === 0) return null;

  return (
    <div
      className="mg-queue-card"
      style={{
        background: COLORS.surface,
        border: `2px solid ${COLORS.cardBorder}`,
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 17 }}>Task queue</div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', color: COLORS.metaText }}>
          {deployed.length} deployed · {queued.length} in queue
        </div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.mutedText, marginBottom: 8 }}>
        Check a task to deploy its Milk into the fight.
      </div>

      <div className="mg-scroll">
        {ordered.map(t => (
          <div
            key={t.id}
            className="mg-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 4px',
              borderBottom: `1px solid ${COLORS.gridLine}`,
            }}
          >
            <div
              role="checkbox"
              aria-checked={t.done}
              aria-label={t.text}
              tabIndex={t.done ? -1 : 0}
              onClick={() => !t.done && onComplete(t.id)}
              onKeyDown={e => {
                if (t.done) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onComplete(t.id);
                }
              }}
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                border: `2px solid ${t.done ? COLORS.mutedBorder : COLORS.ink}`,
                borderRadius: 5,
                background: t.done ? COLORS.doneFill : COLORS.surface,
                cursor: t.done ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: COLORS.doneGlyph,
              }}
            >
              {t.done ? '✓' : ''}
            </div>
            <div
              style={{
                flex: 1,
                fontSize: 14,
                ...(t.done ? { color: COLORS.doneText, textDecoration: 'line-through' } : {}),
              }}
            >
              {t.text}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.8px',
                color: t.done ? COLORS.doneGlyph : COLORS.metaText,
              }}
            >
              {t.done ? 'DEPLOYED' : 'IN QUEUE'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
