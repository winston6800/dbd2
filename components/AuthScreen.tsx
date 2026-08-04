import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { BLOB_RADIUS, COLORS, DISPLAY_FONT, PAPER_BACKGROUND } from '../lib/monster/tokens';
import { HeroFace } from './MonsterGoals/MonsterFace';

/**
 * The handoff explicitly does not cover authentication ("Not yet designed").
 * This screen is assembled from the documented design tokens so it reads as the
 * same product, but it is an extension — worth a designer's eye before launch.
 */

type Mode = 'login' | 'signup';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: COLORS.surface,
  border: `2px solid ${COLORS.ink}`,
  borderRadius: 10,
  padding: '12px 14px',
  color: 'inherit',
  fontSize: 15,
};

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

export const AuthScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password);
      if (error) setError(error);
      else setSignupDone(true);
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setLoading(false);
  };

  if (signupDone) {
    return (
      <div style={pageStyle}>
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>Check your email</div>
          <div style={{ color: COLORS.mutedText, fontSize: 14 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to wake your monster.
          </div>
          <button
            onClick={() => {
              setSignupDone(false);
              setMode('login');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.mutedText,
              fontSize: 13,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <form
        onSubmit={handleSubmit}
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
            width: 150,
            height: 150,
            borderRadius: BLOB_RADIUS,
            background: COLORS.surface,
            border: `3px solid ${COLORS.ink}`,
            position: 'relative',
            animation: 'floatIdleNoX 3.5s ease-in-out infinite',
          }}
        >
          <HeroFace />
        </div>

        <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>Monster Goals</div>
        <div style={{ color: COLORS.mutedText, fontSize: 14, marginTop: -12 }}>
          {mode === 'login' ? 'Sign in to return to the fight.' : 'Create an account to summon your first monster.'}
        </div>

        <input
          className="mg-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          className="mg-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          style={{ ...inputStyle, marginTop: -12 }}
        />

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
              marginTop: -12,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
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
          {loading ? 'One moment…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <div style={{ fontSize: 13, color: COLORS.mutedText, marginTop: -8 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: COLORS.ink,
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: COLORS.metaText,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginTop: -12,
            }}
          >
            ← What is this?
          </button>
        )}
      </form>
    </div>
  );
};
