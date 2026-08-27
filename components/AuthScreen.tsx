import React, { useState } from 'react';
import { Skull } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { track } from '../lib/analytics';

/**
 * Auth is not part of the original Growth Protocol design — it is an
 * extension, built from the same Tailwind tokens (brand red, near-black
 * surfaces) so it reads as the same product.
 */

type Mode = 'login' | 'signup';

const inputClass =
  'w-full bg-dark-card border-2 border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50';

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
      track('signup_started');
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        track('signup_completed');
        setSignupDone(true);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
      else track('signin_completed');
    }
    setLoading(false);
  };

  if (signupDone) {
    return (
      <div className="min-h-screen bg-gradient-red flex flex-col items-center justify-center px-5 py-8 text-white">
        <div className="w-full max-w-[420px] text-center flex flex-col gap-3.5 items-center">
          <div className="text-2xl font-black italic uppercase">Check your email</div>
          <div className="text-gray-500 text-sm">
            We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to start your streak.
          </div>
          <button
            onClick={() => {
              setSignupDone(false);
              setMode('login');
            }}
            className="text-gray-500 text-sm underline hover:text-brand"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-red flex flex-col items-center justify-center px-5 py-8 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-[420px] flex flex-col gap-5 items-center text-center">
        <div className="w-24 h-24 rounded-full bg-black border-4 border-brand shadow-[0_0_30px_rgba(225,29,72,0.4)] flex items-center justify-center animate-pulse-slow">
          <Skull size={44} className="text-brand" />
        </div>

        <div className="text-2xl font-black italic uppercase tracking-tighter">DeadByDefault</div>
        <div className="text-gray-500 text-sm -mt-3">
          {mode === 'login' ? 'Sign in to get back to the grind.' : 'Create an account and name your growth objective.'}
        </div>

        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          className={`${inputClass} -mt-3`}
        />

        {error && (
          <div className="w-full bg-red-950/60 border-2 border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-red-200 text-left -mt-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-brand border-2 border-white text-white font-black uppercase tracking-widest disabled:opacity-60"
        >
          {loading ? 'One moment…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <div className="text-sm text-gray-500 -mt-2">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="text-white font-bold underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {onBack && (
          <button type="button" onClick={onBack} className="text-gray-600 text-xs -mt-3">
            ← What is this?
          </button>
        )}
      </form>
    </div>
  );
};
