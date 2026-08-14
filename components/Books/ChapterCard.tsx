import React from 'react';
import type { Chapter } from '../../lib/books/types';
import { C, DISPLAY_FONT, MONO_FONT } from '../../lib/books/tokens';

const STATUS_LABEL: Record<Chapter['status'], string> = {
  pending: 'Waiting…',
  summarizing: 'Reading…',
  illustrating: 'Illustrating…',
  ready: '',
  error: 'Failed',
};

/** One chapter in the grid: image (or its loading/error state), title, summary snippet. */
export const ChapterCard: React.FC<{ chapter: Chapter; onOpen: () => void }> = ({ chapter, onOpen }) => {
  const busy = chapter.status === 'summarizing' || chapter.status === 'illustrating' || chapter.status === 'pending';

  return (
    <button
      onClick={onOpen}
      disabled={chapter.status !== 'ready'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: chapter.status === 'ready' ? 'pointer' : 'default',
        padding: 0,
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <div
        style={{
          aspectRatio: '1 / 1',
          background: C.paperDim,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {chapter.imageDataUrl ? (
          <img src={chapter.imageDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : chapter.status === 'error' ? (
          <span style={{ fontSize: 12, color: C.accent, fontFamily: MONO_FONT, padding: 16, textAlign: 'center' }}>
            {STATUS_LABEL.error}
          </span>
        ) : (
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `2px solid ${C.border}`,
              borderTopColor: busy ? C.accent : C.border,
              animation: busy ? 'spin 0.9s linear infinite' : undefined,
            }}
          />
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: MONO_FONT, fontSize: 9.5, letterSpacing: '0.08em', color: C.inkFaint, marginBottom: 5 }}>
          {chapter.status === 'ready' ? `CHAPTER ${chapter.index}` : STATUS_LABEL[chapter.status].toUpperCase()}
        </div>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 16, color: C.ink, marginBottom: 6, lineHeight: 1.3 }}>
          {chapter.title ?? chapter.sourceHeading}
        </div>
        {chapter.summary && (
          <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {chapter.summary}
          </div>
        )}
        {chapter.status === 'error' && chapter.error && (
          <div style={{ fontSize: 11.5, color: C.accent, lineHeight: 1.4 }}>{chapter.error}</div>
        )}
      </div>
    </button>
  );
};
