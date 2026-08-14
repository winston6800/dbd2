import React, { useEffect } from 'react';
import { C, DISPLAY_FONT, MONO_FONT, PAPER_BACKGROUND, card } from '../lib/books/tokens';
import { track, trackOnce } from '../lib/monster/analytics';

/**
 * The marketing surface for logged-out visitors.
 *
 * Sells the actual loop: a PDF goes in, a chapter with an image comes out.
 * The three sample cards below are hand-written, not generated at build time
 * — real ones look like this once a book has been through the pipeline.
 */

const SAMPLES: { chapter: string; title: string; blurb: string; tint: string }[] = [
  {
    chapter: 'CHAPTER 3',
    title: 'The Peak-End Rule',
    blurb:
      'You do not remember an experience — you remember its worst moment and its last moment, averaged, and everything in between is nearly discarded.',
    tint: '#e8d7c8',
  },
  {
    chapter: 'CHAPTER 7',
    title: 'Why Coral Builds Cities',
    blurb:
      'A single polyp cannot survive a storm. A reef is millions of them agreeing, generation over generation, on where the wall goes.',
    tint: '#cfe0d6',
  },
  {
    chapter: 'CHAPTER 12',
    title: 'The Debt That Ended an Empire',
    blurb:
      'Rome did not fall to the Goths so much as it stopped being able to afford them — three centuries of currency debasement, compressed into one winter.',
    tint: '#dcd3e8',
  },
];

export const Landing: React.FC<{ onStart: () => void; onSignIn: () => void }> = ({ onStart, onSignIn }) => {
  useEffect(() => trackOnce('landing_view'), []);

  const start = () => {
    track('landing_cta_click');
    onStart();
  };

  return (
    <div style={{ minHeight: '100vh', ...PAPER_BACKGROUND, color: C.ink, padding: '18px 20px 70px' }}>
      <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 34 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 20 }}>Chapters</span>
          <button
            onClick={onSignIn}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, fontFamily: MONO_FONT, fontSize: 11, color: C.inkMuted, cursor: 'pointer' }}
          >
            SIGN IN
          </button>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 42, lineHeight: 1.15, margin: 0, maxWidth: 680 }}>
            Every chapter of a book, in three paragraphs and one picture.
          </h1>
          <p style={{ color: C.inkMuted, fontSize: 16, lineHeight: 1.65, margin: 0, maxWidth: 580 }}>
            Drop in a PDF. Chapters reads it, writes an actual argument-first summary of each chapter —
            not a book-report blurb — and generates an image for the central idea. A 400-page book
            becomes a shelf of cards you can get through on a commute.
          </p>
          <button onClick={start} style={primaryButton}>
            START FREE TRIAL
          </button>
          <span style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em', color: C.inkFaint }}>
            3 DAYS FREE · THEN $20 / MONTH · CANCEL ANY TIME
          </span>
        </div>

        {/* Sample chapter cards — the actual product output */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="bk-sample-grid">
          {SAMPLES.map(s => (
            <div key={s.title} style={{ ...card, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '1 / 1', background: s.tint }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontFamily: MONO_FONT, fontSize: 9.5, letterSpacing: '0.08em', color: C.inkFaint, marginBottom: 5 }}>
                  {s.chapter}
                </div>
                <div style={{ fontFamily: DISPLAY_FONT, fontSize: 16, marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.5 }}>{s.blurb}</div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="bk-sample-grid">
          {[
            { step: 'STEP 1', title: 'Drop in a PDF', body: 'Any book, paper, or report. Text extraction happens in your browser — the file itself is never uploaded anywhere.' },
            { step: 'STEP 2', title: 'It reads every chapter', body: 'Chapter boundaries are detected from the source, then each one is read for its actual claim, not skimmed for keywords.' },
            { step: 'STEP 3', title: 'You get a shelf of cards', body: 'One card per chapter: title, a real summary, and an image built specifically for that chapter’s idea.' },
          ].map(b => (
            <div key={b.title} style={card}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontFamily: MONO_FONT, fontSize: 9.5, letterSpacing: '0.12em', color: C.inkFaint, marginBottom: 7 }}>
                  {b.step}
                </div>
                <div style={{ fontFamily: DISPLAY_FONT, fontSize: 17, marginBottom: 6 }}>{b.title}</div>
                <div style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.55 }}>{b.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Price */}
        <div style={{ ...card, textAlign: 'center', padding: '26px 20px' }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 24 }}>3 days free, then $20/mo</div>
          <div style={{ fontSize: 13, color: C.inkMuted, marginTop: 8, marginBottom: 18, lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Try it for three days without paying. We take a card up front so it keeps working when the
            trial ends — cancel before then and you are not charged, and cancelling later takes two
            clicks. Unlimited books and chapters, synced across your devices.
          </div>
          <button onClick={start} style={primaryButton}>
            START READING
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: C.inkFaint, lineHeight: 1.7 }}>
          Built for people who buy more books than they finish.
        </div>
      </div>
    </div>
  );
};

const primaryButton: React.CSSProperties = {
  background: C.accent,
  border: 'none',
  borderRadius: 9,
  padding: '13px 26px',
  fontFamily: MONO_FONT,
  fontWeight: 700,
  fontSize: 12.5,
  letterSpacing: '0.06em',
  color: '#fff',
  cursor: 'pointer',
};
