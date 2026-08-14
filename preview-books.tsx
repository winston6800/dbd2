import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/books.css';
import { ChapterCard } from './components/Books/ChapterCard';
import { ChapterDetail } from './components/Books/ChapterDetail';
import { UploadScreen } from './components/Books/UploadScreen';
import { C, DISPLAY_FONT, MONO_FONT, PAPER_BACKGROUND } from './lib/books/tokens';
import type { Chapter } from './lib/books/types';

/**
 * Dev-only visual harness — `npm run dev`, then open /preview-books.html.
 *
 * Mounts the real chapter shelf against hand-written chapters covering every
 * status the pipeline produces, so the UI can be looked at without Supabase,
 * a subscription, or live Anthropic/OpenAI keys. Never built or deployed.
 */

const swatch = (hex: string, w = 800, h = 800) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${hex}"/></svg>`)}`;

function chapter(overrides: Partial<Chapter>): Chapter {
  return {
    id: Math.random().toString(36),
    index: 1,
    sourceHeading: 'Chapter 1',
    text: '',
    wordCount: 2000,
    status: 'ready',
    title: null,
    summary: null,
    imagePrompt: null,
    imageDataUrl: null,
    error: null,
    ...overrides,
  };
}

const CHAPTERS: Chapter[] = [
  chapter({
    index: 1,
    title: 'The Peak-End Rule',
    imageDataUrl: swatch('#e8d7c8'),
    summary:
      'You do not remember an experience — you remember its worst moment and its last moment, averaged, and everything in between is nearly discarded. This is why a colonoscopy that ends gently is rated less painful than a shorter one that ends abruptly, even when the short one delivered strictly less total pain.\n\nKahneman calls the two systems doing the rating the "experiencing self" and the "remembering self," and only one of them ever gets consulted about whether to do something again. The remembering self is running a peak-end average, not an integral over time — duration barely registers.\n\nThe practical edge: how an experience ends is doing more work on your future decisions than how long it lasted. Design the last five minutes, not the average five minutes.',
  }),
  chapter({ index: 2, title: 'Why Coral Builds Cities', imageDataUrl: swatch('#cfe0d6'), summary: 'A single polyp cannot survive a storm.' }),
  chapter({ index: 3, status: 'illustrating', title: 'The Debt That Ended an Empire', summary: 'Rome did not fall to the Goths so much as it stopped being able to afford them.' }),
  chapter({ index: 4, status: 'summarizing', sourceHeading: 'Chapter 4' }),
  chapter({ index: 5, status: 'pending', sourceHeading: 'Chapter 5' }),
  chapter({ index: 6, status: 'error', sourceHeading: 'Chapter 6', error: 'The model returned nothing' }),
];

const App: React.FC = () => {
  const [open, setOpen] = useState<Chapter | null>(null);
  const [view, setView] = useState<'shelf' | 'upload'>('shelf');

  return (
    <div style={{ minHeight: '100dvh', ...PAPER_BACKGROUND, color: C.ink }}>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontSize: 18 }}>Chapters</span>
        <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: C.inkFaint }}>Thinking, Fast and Slow</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button onClick={() => setView('shelf')} style={{ fontFamily: MONO_FONT, fontSize: 10, background: 'none', border: 'none', color: view === 'shelf' ? C.accent : C.inkFaint, cursor: 'pointer' }}>SHELF</button>
          <button onClick={() => setView('upload')} style={{ fontFamily: MONO_FONT, fontSize: 10, background: 'none', border: 'none', color: view === 'upload' ? C.accent : C.inkFaint, cursor: 'pointer' }}>UPLOAD</button>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 22px 60px' }}>
        {view === 'upload' ? (
          <UploadScreen onFile={() => undefined} busy={false} phase={null} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {CHAPTERS.map(c => (
              <ChapterCard key={c.id} chapter={c} onOpen={() => setOpen(c)} />
            ))}
          </div>
        )}
      </div>

      {open && <ChapterDetail chapter={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
