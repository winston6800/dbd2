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

/** Signed-in account controls: Stripe billing portal and sign out. */
export const AccountBar: React.FC = () => {
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
