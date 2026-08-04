import React, { useState } from 'react';
import { COLORS } from '../../lib/monster/tokens';
import { useAuth } from '../../lib/auth';

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: 11,
  color: COLORS.mutedText,
  cursor: 'pointer',
  textDecoration: 'underline',
  fontFamily: 'inherit',
};

/**
 * Whether to offer the analytics link. This only hides the UI — the summary
 * itself is gated in Postgres against the `admin_emails` table, so an email
 * listed here but not there will see the dashboard's "not authorized" state.
 */
function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return (import.meta.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** Signed-in account controls: analytics, Stripe billing portal, sign out. */
export const AccountBar: React.FC<{ onOpenAnalytics?: () => void }> = ({ onOpenAnalytics }) => {
  const { user, subscription, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openBillingPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user!.id }),
      });
      if (!res.ok) throw new Error('Could not open the billing portal');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: COLORS.metaText }}>
      {error && <span style={{ color: '#a3564f' }}>{error}</span>}
      <span>{user?.email}</span>
      {onOpenAnalytics && isAdmin(user?.email) && (
        <button type="button" onClick={onOpenAnalytics} style={linkStyle}>
          Analytics
        </button>
      )}
      {subscription && (
        <button type="button" onClick={openBillingPortal} disabled={busy} style={linkStyle}>
          {busy ? 'Opening…' : 'Manage billing'}
        </button>
      )}
      <button type="button" onClick={() => void signOut()} style={linkStyle}>
        Sign out
      </button>
    </div>
  );
};
