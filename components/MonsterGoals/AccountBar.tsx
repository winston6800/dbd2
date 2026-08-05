import React from 'react';
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

/**
 * Signed-in account controls.
 *
 * There is no billing link: access is a one-time purchase, so there is no
 * subscription to manage, cancel or renew. Stripe emails the receipt.
 */
export const AccountBar: React.FC<{ onOpenAnalytics?: () => void }> = ({ onOpenAnalytics }) => {
  const { user, signOut } = useAuth();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: COLORS.metaText }}>
      <span>{user?.email}</span>
      {onOpenAnalytics && isAdmin(user?.email) && (
        <button type="button" onClick={onOpenAnalytics} style={linkStyle}>
          Analytics
        </button>
      )}
      <button type="button" onClick={() => void signOut()} style={linkStyle}>
        Sign out
      </button>
    </div>
  );
};
