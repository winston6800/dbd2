import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Without this, any render error shows a blank white page — the worst possible
 * first impression for someone arriving from a link. Shows a recoverable
 * message instead and leaves saved progress untouched.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('DeadByDefault crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-gradient-red flex flex-col items-center justify-center gap-3.5 p-5 text-center text-white">
        <div className="text-2xl font-black italic uppercase">Something broke</div>
        <div className="text-gray-500 text-sm max-w-[420px]">
          The terminal glitched. Your saved progress is fine — reloading usually sorts it out.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-brand border-2 border-white text-white font-black uppercase tracking-widest"
        >
          Reload
        </button>
      </div>
    );
  }
}
