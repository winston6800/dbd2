import React, { useState } from 'react';
import { Skull, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

export const ResetPasswordScreen: React.FC = () => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Skull size={28} className="text-brand" />
            <span className="text-2xl font-black text-white italic uppercase tracking-tighter">DeadByDefault</span>
          </div>
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Set a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-white text-sm font-medium placeholder-gray-600 focus:outline-none focus:border-brand/50 focus:bg-white/8 transition-all"
            />
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
                <span>Update Password</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
