import React, { useEffect } from 'react';
import { ACTIVE_GLOW, BLOB_RADIUS, COLORS, DISPLAY_FONT, PAPER_BACKGROUND } from '../lib/monster/tokens';
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
    title: 'Name the thing you keep avoiding',
    body: 'It becomes a monster with a name. Somehow that makes it harder to keep pretending it is not there.',
  },
  {
    title: 'Break it into bosses',
    body: 'Each sub-goal is a boss with 100 HP, chained between you and the thing you actually want.',
  },
  {
    title: 'Deploy proof, not promises',
    body: 'Every task you finish sends a Milk unit into orbit, where it fires on the boss forever. That is a receipt, not a vibe.',
  },
];

const primaryButton: React.CSSProperties = {
  background: COLORS.ctaFill,
  border: `2px solid ${COLORS.ink}`,
  boxShadow: '0 0 22px rgba(255, 31, 61, 0.45)',
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
  border: `2px solid ${COLORS.cardBorder}`,
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
            border: `3px solid ${COLORS.monsterInk}`,
            boxShadow: ACTIVE_GLOW,
            position: 'relative',
            animation: 'floatIdleNoX 3.5s ease-in-out infinite',
          }}
        >
          <HeroFace />
        </div>
        <span
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '2px',
            color: COLORS.metaText,
          }}
        >
          DEADBYDEFAULT
        </span>
        <h1
          className="mg-hero-title"
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            margin: 0,
            textShadow: '0 0 26px rgba(255, 31, 61, 0.45)',
          }}
        >
          Built different isn't a personality. It's a default you have to overwrite.
        </h1>
        <p style={{ color: COLORS.mutedText, fontSize: 16, margin: 0, maxWidth: 560 }}>
          Years of feeds built to keep you scrolling trained you to flake on yourself by default.
          DeadByDefault is a goal tracker shaped like a boss fight — name the thing, break it down, and
          every task you finish is proof stacking up against the version of you the internet talked you
          into.
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
              border: `3px solid ${COLORS.monsterInk}`,
              boxShadow: ACTIVE_GLOW,
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
          Three finished tasks, three units of proof, one boss having a bad day.
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
          clicks. Unlimited bosses and tasks, synced across your devices, still nagging you back toward
          the person you already know you can be.
        </div>
        <button onClick={start} style={primaryButton}>
          Start your fight
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: COLORS.metaText }}>
        Years of the internet trained you to flake on yourself by default. This is where you stop.
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: COLORS.metaText }}>
        If your dream is working at Amazon, Google, Microsoft, or OpenAI for the money — go fuck yourself, and GTFO.
      </div>
    </div>
  </div>
);
};
