import React from 'react';
import { COLORS, DISPLAY_FONT, PAPER_BACKGROUND } from '../lib/monster/tokens';

interface State {
  error: Error | null;
}

/**
 * Without this, any render error shows a blank white page — the worst possible
 * first impression for someone arriving from a link. Shows a recoverable
 * message instead and leaves saved goals untouched.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Monster Goals crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          ...PAPER_BACKGROUND,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 20,
          textAlign: 'center',
          color: COLORS.ink,
        }}
      >
        <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>Something broke</div>
        <div style={{ color: COLORS.mutedText, fontSize: 14, maxWidth: 420 }}>
          The monsters got loose. Your saved goals are fine — reloading usually sorts it out.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: COLORS.ctaFill,
            border: `2px solid ${COLORS.ink}`,
            borderRadius: 10,
            padding: '12px 24px',
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 15,
            color: COLORS.ink,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
