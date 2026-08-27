import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { isTrialing, trialDaysLeft } from '../../lib/supabase';

/**
 * Whether to offer the analytics link. This is a separate list from
 * `VITE_ADMIN_EMAILS` (which only skips the paywall) — seeing the paywall
 * bypass and seeing aggregate business analytics are different privileges,
 * and conflating them would show revenue and traffic data to anyone given a
 * free account for an unrelated reason.
 *
 * This only hides the UI — the real boundary is in Postgres: `analytics_summary`
 * checks the caller's email against the `admin_emails` table and raises if it
 * is not there. An email listed here but not in that table sees the
 * dashboard's "not authorized" state. Unset, this hides the link from
 * everyone (fails closed) rather than falling back to some other list.
 */
function canSeeAnalytics(email: string | undefined): boolean {
  if (!email) return false;
  return (import.meta.env.VITE_ANALYTICS_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/**
 * Signed-in account controls, shown in the header.
 *
 * The trial countdown is deliberately visible: the card is charged
 * automatically when the trial ends, so the user should never be surprised by
 * it. **Manage** opens the Stripe billing portal, which is where cancelling
 * happens.
 */
export const AccountBar: React.FC<{ onOpenAnalytics?: () => void }> = ({ onOpenAnalytics }) => {
  const { user, session, subscription, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openBillingPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      // The server derives the account from this token — sending a userId
      // here would let anyone request another account's billing portal link.
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Could not open the billing portal');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  const daysLeft = trialDaysLeft(subscription);
  const cancelling = subscription?.cancel_at_period_end === true;

  return (
    <div className="flex items-center flex-wrap justify-end gap-2 text-[10px]">
      {error && <span className="text-red-400 font-bold">{error}</span>}

      {isTrialing(subscription) && (
        <span className="font-black tracking-wide text-brand">
          TRIAL · {daysLeft} DAY{daysLeft === 1 ? '' : 'S'} LEFT
        </span>
      )}
      {cancelling && <span className="font-black tracking-wide text-gray-400">CANCELS AT PERIOD END</span>}

      {onOpenAnalytics && canSeeAnalytics(user?.email) && (
        <button type="button" onClick={onOpenAnalytics} className="text-gray-500 underline hover:text-brand">
          Analytics
        </button>
      )}
      {subscription && (
        <button type="button" onClick={openBillingPortal} disabled={busy} className="text-gray-500 underline hover:text-brand">
          {busy ? 'Opening…' : 'Manage'}
        </button>
      )}
      <button type="button" onClick={() => void signOut()} className="text-gray-500 underline hover:text-brand">
        Sign out
      </button>
    </div>
  );
};
