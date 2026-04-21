import React, { useState } from 'react';
import { Skull, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

type Mode = 'login' | 'signup';

export const AuthScreen: React.FC = () => {
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
      if (error) {
        setError(error);
      } else {
        setSignupDone(true);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setLoading(false);
  };

  if (signupDone) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Check your email</h2>
          <p className="text-gray-500 text-sm">We sent a confirmation link to <span className="text-white font-bold">{email}</span>. Click it to activate your account.</p>
          <button onClick={() => { setSignupDone(false); setMode('login'); }} className="text-brand text-sm font-bold hover:underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Skull size={28} className="text-brand" />
            <span className="text-2xl font-black text-white italic uppercase tracking-tighter">DeadByDefault</span>
          </div>
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Growth Protocol</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-white text-sm font-medium placeholder-gray-600 focus:outline-none focus:border-brand/50 focus:bg-white/8 transition-all"
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-white text-sm font-medium placeholder-gray-600 focus:outline-none focus:border-brand/50 focus:bg-white/8 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start space-x-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand rounded-2xl text-white font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-2 hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          {mode === 'login' ? (
            <p className="text-gray-500 text-xs">
              No account?{' '}
              <button onClick={() => { setMode('signup'); setError(null); }} className="text-brand font-bold hover:underline">
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-gray-500 text-xs">
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(null); }} className="text-brand font-bold hover:underline">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
