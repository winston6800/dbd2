import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { BLOB_RADIUS, COLORS, DISPLAY_FONT, PAPER_BACKGROUND } from '../lib/monster/tokens';
import { MonsterFace } from './MonsterGoals/MonsterFace';

/**
 * The handoff explicitly does not cover billing/payments UI ("Not yet
 * designed"). This gate is assembled from the documented design tokens so it
 * reads as the same product, but it is an extension — worth a designer's eye
 * before launch.
 */

// Keep these honest — every line has to be true of what actually ships.
const FEATURES = [
  'Unlimited mini-bosses and tasks',
  'Deploy Milk units and watch them fight',
  'Your boss chain saved and synced across devices',
  'Defeat animations and the graveyard trail',
  'A named monster for every sub-goal',
];

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  ...PAPER_BACKGROUND,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 20px 60px',
  color: COLORS.ink,
};

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'underline',
  fontFamily: 'inherit',
};

export const SubscriptionGate: React.FC = () => {
  const { user, signOut, refreshSubscription, subscriptionLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id, email: user!.email }),
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div style={pageStyle}>
        <div style={{ color: COLORS.mutedText, fontSize: 14 }}>Checking your subscription…</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: BLOB_RADIUS,
            background: COLORS.surface,
            border: `3px solid ${COLORS.ink}`,
            position: 'relative',
            animation: 'floatIdleNoX 3.5s ease-in-out infinite',
          }}
        >
          <MonsterFace variant={2} />
        </div>

        <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>Arm yourself</div>
        <div style={{ color: COLORS.mutedText, fontSize: 14, marginTop: -12 }}>
          Monster Goals is a subscription. Cancel any time.
        </div>

        <div
          style={{
            width: '100%',
            background: COLORS.surface,
            border: `2px solid ${COLORS.ink}`,
            borderRadius: 14,
            padding: '16px 18px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>$20</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', color: COLORS.metaText }}>
              PER MONTH
            </span>
          </div>

          <div style={{ marginTop: 10 }}>
            {FEATURES.map(f => (
              <div
                key={f}
                className="mg-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 0',
                  borderBottom: `1px solid ${COLORS.gridLine}`,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    border: `2px solid ${COLORS.mutedBorder}`,
                    borderRadius: 5,
                    background: COLORS.doneFill,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 800,
                    color: COLORS.doneGlyph,
                  }}
                >
                  ✓
                </div>
                <span style={{ fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              width: '100%',
              background: '#f7e6e4',
              border: '2px solid #a3564f',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              color: '#7c3f3a',
              textAlign: 'left',
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: '100%',
            background: COLORS.successGreen,
            border: `2px solid ${COLORS.ink}`,
            borderRadius: 10,
            padding: 14,
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 15,
            color: COLORS.ink,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Redirecting…' : 'Subscribe — $20/mo'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginTop: -8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', color: COLORS.metaText }}>
            CANCEL ANYTIME · POWERED BY STRIPE
          </span>
          <button onClick={() => void refreshSubscription()} style={{ ...linkStyle, color: COLORS.ink, fontWeight: 700 }}>
            I already subscribed — refresh
          </button>
          <button onClick={() => void signOut()} style={{ ...linkStyle, color: COLORS.mutedText, fontSize: 12 }}>
            Sign out ({user?.email})
          </button>
        </div>
      </div>
    </div>
  );
};
