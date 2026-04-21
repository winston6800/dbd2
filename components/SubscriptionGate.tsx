import React, { useState } from 'react';
import { Zap, Check, Loader, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

const FEATURES = [
  'Unlimited daily tracking & history',
  'Streak tracking & achievements',
  'Groups with other builders',
  'Social feed, kudos & comments',
  'Discover & follow other founders',
  'Weekly challenges',
  'Full analytics & heatmaps',
];

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader size={24} className="text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand/10 border border-brand/20 mb-2">
            <Zap size={28} className="text-brand" />
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
            Go Pro
          </h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Stay default alive</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-black text-white italic">$20</span>
            <span className="text-gray-500 text-xs font-black uppercase tracking-widest">/ month</span>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2.5">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center shrink-0">
                  <Check size={9} className="text-brand" />
                </div>
                <span className="text-gray-300 text-xs font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start space-x-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-400 text-xs font-medium">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 bg-brand rounded-2xl text-white font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-2 hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader size={16} className="animate-spin" /><span>Redirecting...</span></>
          ) : (
            <span>Subscribe — $20/mo</span>
          )}
        </button>

        <div className="text-center space-y-1">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
            Cancel anytime · Powered by Stripe
          </p>
          <button
            onClick={() => refreshSubscription()}
            className="text-brand text-xs font-bold hover:underline block w-full"
          >
            I already subscribed — refresh
          </button>
          <button
            onClick={signOut}
            className="text-gray-600 text-xs hover:text-gray-400 flex items-center justify-center space-x-1 w-full transition-colors"
          >
            <LogOut size={12} />
            <span>Sign out ({user?.email})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
