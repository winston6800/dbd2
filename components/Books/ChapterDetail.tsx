import React from 'react';
import type { Chapter } from '../../lib/books/types';
import { C, DISPLAY_FONT, MONO_FONT } from '../../lib/books/tokens';

/** Full-screen reading view for one finished chapter: large image, title, full summary. */
export const ChapterDetail: React.FC<{ chapter: Chapter; onClose: () => void }> = ({ chapter, onClose }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: '#00000066',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      zIndex: 20,
    }}
    onClick={onClose}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: C.surface,
        borderRadius: 18,
        maxWidth: 760,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
      }}
    >
      {chapter.imageDataUrl && (
        <img src={chapter.imageDataUrl} alt="" style={{ width: '100%', display: 'block', aspectRatio: '16 / 9', objectFit: 'cover' }} />
      )}

      <div style={{ padding: '28px 32px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontFamily: MONO_FONT, fontSize: 10.5, letterSpacing: '0.08em', color: C.inkFaint }}>
            CHAPTER {chapter.index}
          </span>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.inkFaint, fontSize: 13, cursor: 'pointer', fontFamily: MONO_FONT }}
          >
            CLOSE ✕
          </button>
        </div>

        <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 30, color: C.ink, margin: '0 0 18px', lineHeight: 1.2 }}>
          {chapter.title}
        </h2>

        {chapter.summary?.split('\n\n').map((para, i) => (
          <p key={i} style={{ fontSize: 15.5, lineHeight: 1.75, color: C.inkMuted, margin: '0 0 16px' }}>
            {para}
          </p>
        ))}
      </div>
    </div>
  </div>
);
