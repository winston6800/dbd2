import React, { useEffect } from 'react';
import { BLOB_RADIUS, COLORS, DISPLAY_FONT, PAPER_BACKGROUND } from '../lib/monster/tokens';
import { track, trackOnce } from '../lib/monster/analytics';
import { HeroFace, MonsterFace } from './MonsterGoals/MonsterFace';
import { MilkUnit } from './MonsterGoals/MilkUnit';

/**
 * The marketing surface for logged-out visitors.
 *
 * Cold traffic used to land straight on an email/password form with no
 * explanation of what the product is or that it costs money. This page explains
 * the loop, shows it running, and states the price before anyone signs up.
 *
 * Not part of the design handoff — assembled from the documented tokens.
 */

const DEMO_H = 380;

const BEATS: { title: string; body: string }[] = [
  {
    title: 'Name your monster',
    body: 'The goal you have been avoiding becomes a monster with a name. Somehow that helps.',
  },
  {
    title: 'Break it into mini-bosses',
    body: 'Each sub-goal is a boss with 100 HP, chained between you and the thing you actually want.',
  },
  {
    title: 'Send in the Milk',
    body: 'Every task you finish deploys a Milk unit into orbit, where it fires on the boss forever.',
  },
];

const primaryButton: React.CSSProperties = {
  background: COLORS.successGreen,
  border: `2px solid ${COLORS.ink}`,
  borderRadius: 10,
  padding: '14px 28px',
  fontFamily: DISPLAY_FONT,
  fontWeight: 700,
  fontSize: 16,
  color: COLORS.ink,
  cursor: 'pointer',
};

const card: React.CSSProperties = {
  background: COLORS.surface,
  border: `2px solid ${COLORS.ink}`,
  borderRadius: 14,
  padding: '16px 18px',
};

export const Landing: React.FC<{ onStart: () => void; onSignIn: () => void }> = ({ onStart, onSignIn }) => {
  useEffect(() => trackOnce('landing_view'), []);

  const start = () => {
    track('landing_cta_click');
    onStart();
  };

  return (
  <div
    style={{
      minHeight: '100vh',
      ...PAPER_BACKGROUND,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 20px 60px',
      color: COLORS.ink,
    }}
  >
    <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onSignIn}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: 700,
            color: COLORS.mutedText,
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Sign in
        </button>
      </div>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: BLOB_RADIUS,
            background: COLORS.surface,
            border: `3px solid ${COLORS.ink}`,
            position: 'relative',
            animation: 'floatIdleNoX 3.5s ease-in-out infinite',
          }}
        >
          <HeroFace />
        </div>
        <h1 className="mg-hero-title" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, margin: 0 }}>
          Turn the goal you keep avoiding into a monster.
        </h1>
        <p style={{ color: COLORS.mutedText, fontSize: 16, margin: 0, maxWidth: 560 }}>
          Monster Goals is a goal tracker shaped like a boss fight. Break the thing down, check tasks off,
          and watch your little army chip it to zero.
        </p>
        <button onClick={start} style={primaryButton}>
          Start free trial
        </button>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', color: COLORS.metaText }}>
          3 DAYS FREE · THEN $20 / MONTH · CANCEL ANY TIME
        </span>
      </div>

      {/* The loop, running */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: DEMO_H, width: '100%' }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: DEMO_H / 2,
              width: 120,
              height: 120,
              transform: 'translate(-50%, -50%)',
              borderRadius: BLOB_RADIUS,
              background: COLORS.surface,
              border: `3px solid ${COLORS.ink}`,
              boxShadow: '0 0 0 4px rgba(43,43,43,0.08)',
              zIndex: 3,
            }}
          >
            <MonsterFace variant={0} />
          </div>
          {['demo-a', 'demo-b', 'demo-c'].map((id, i) => (
            <MilkUnit
              key={id}
              taskId={id}
              text=""
              index={i}
              count={3}
              bossX={50}
              centerY={DEMO_H / 2}
              showLabel={false}
            />
          ))}
        </div>
        <div
          style={{
            borderTop: `1px solid ${COLORS.gridLine}`,
            padding: '12px 18px',
            fontSize: 12,
            color: COLORS.mutedText,
            textAlign: 'center',
          }}
        >
          Three finished tasks, three Milk units, one boss having a bad day.
        </div>
      </div>

      {/* How it works */}
      <div className="mg-landing-beats">
        {BEATS.map((b, i) => (
          <div key={b.title} style={card}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '1px',
                color: COLORS.metaText,
                marginBottom: 6,
              }}
            >
              STEP {i + 1}
            </div>
            <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{b.title}</div>
            <div style={{ fontSize: 13, color: COLORS.mutedText, lineHeight: 1.45 }}>{b.body}</div>
          </div>
        ))}
      </div>

      {/* Price */}
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>3 days free, then $20/mo</div>
        <div style={{ fontSize: 13, color: COLORS.mutedText, marginTop: 4, marginBottom: 14 }}>
          Try it for three days without paying. We take a card up front so it keeps working when the
          trial ends — cancel before then and you are not charged, and cancelling later takes two
          clicks. Unlimited mini-bosses and tasks, synced across your devices.
        </div>
        <button onClick={start} style={primaryButton}>
          Start your fight
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: COLORS.metaText }}>
        Built for people whose to-do lists have stopped working on them.
      </div>
    </div>
  </div>
);
};
