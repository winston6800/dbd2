import React, { useEffect, useState } from 'react';
import { Skull } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { track, trackOnce } from '../lib/analytics';

/**
 * The paywall. A card is collected up front and the trial converts on its own,
 * so the trial length and the price after it must both be stated plainly here —
 * a surprise charge is the fastest way to earn a chargeback.
 */

// Keep these honest — every line has to be true of what actually ships.
const FEATURES = [
  'Unlimited groups and following',
  'Streaks, heatmaps, and the Honor Code',
  'Your growth data saved and synced across devices',
  'Weekly challenges and survival milestones',
  'Cancel in two clicks, any time',
];

const TRIAL_DAYS = 3;

export const SubscriptionGate: React.FC = () => {
  const { user, session, signOut, refreshSubscription, subscriptionLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => trackOnce('paywall_view'), []);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    track('checkout_started');
    try {
      // The server derives the account from this token — it never trusts a
      // client-supplied id, which would otherwise let anyone start (or
      // overwrite) a subscription for someone else's account.
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
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
      <div className="min-h-screen bg-gradient-red flex items-center justify-center text-gray-500 text-sm">
        Checking your access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-red flex flex-col items-center justify-center px-5 py-8 text-white">
      <div className="w-full max-w-[420px] flex flex-col gap-5 items-center text-center">
        <div className="w-20 h-20 rounded-full bg-black border-4 border-brand shadow-[0_0_30px_rgba(225,29,72,0.4)] flex items-center justify-center animate-pulse-slow">
          <Skull size={36} className="text-brand" />
        </div>

        <div className="text-2xl font-black italic uppercase">Start your {TRIAL_DAYS}-day free trial</div>
        <div className="text-gray-500 text-sm -mt-3">
          Free for {TRIAL_DAYS} days, then $20 a month. Cancel any time before it ends and you are not charged.
        </div>

        <div className="w-full bg-dark-card border-2 border-white/10 rounded-2xl p-4 text-left">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black italic">$20</span>
            <span className="text-[11px] font-black tracking-wide text-brand">PER MONTH, AFTER THE TRIAL</span>
          </div>

          <div className="mt-2.5">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                <div className="w-5 h-5 flex-shrink-0 border-2 border-brand/40 rounded-md bg-brand/10 flex items-center justify-center text-brand text-sm font-black">
                  ✓
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-950/60 border-2 border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-red-200 text-left">
            {error}
          </div>
        )}

        <button
          onClick={handleBuy}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-brand border-2 border-white text-white font-black uppercase tracking-widest disabled:opacity-60"
        >
          {loading ? 'Redirecting…' : `Start ${TRIAL_DAYS}-day free trial`}
        </button>

        <div className="flex flex-col gap-1.5 items-center -mt-2">
          <span className="text-[11px] font-black tracking-wide text-brand">CARD REQUIRED · CANCEL ANY TIME · POWERED BY STRIPE</span>
          <button onClick={() => void refreshSubscription()} className="text-white font-bold text-sm underline">
            I already subscribed — refresh
          </button>
          <button onClick={() => void signOut()} className="text-gray-500 text-xs underline">
            Sign out ({user?.email})
          </button>
        </div>
      </div>
    </div>
  );
};
