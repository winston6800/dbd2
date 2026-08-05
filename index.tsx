import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/monsterGoals.css';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { PurchaseGate } from './components/PurchaseGate';
import { Landing } from './components/Landing';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MonsterGoalsApp } from './components/MonsterGoals/MonsterGoalsApp';
import { COLORS, PAPER_BACKGROUND } from './lib/monster/tokens';
import { trackOnce } from './lib/monster/analytics';

const Splash: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      minHeight: '100vh',
      ...PAPER_BACKGROUND,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: COLORS.mutedText,
      fontSize: 14,
    }}
  >
    {label}
  </div>
);

/**
 * Hard gate: sign in, then pay once, then the board. No part of the game is
 * reachable without both — logged-out visitors get the landing page, which
 * explains the product and states the price before asking for an email.
 */
const AppGate: React.FC = () => {
  const { user, purchase, loading, purchaseLoading, refreshPurchase } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Handle returning from Stripe checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Give the webhook a moment to land, then re-read the entitlement.
      const timer = setTimeout(() => refreshPurchase(), 3000);
      window.history.replaceState({}, '', window.location.pathname);
      return () => clearTimeout(timer);
    }
  }, [refreshPurchase]);

  // Marks the end of the funnel: signed in, paid, and through the gate.
  useEffect(() => {
    if (purchase) trackOnce('purchase_completed');
  }, [purchase]);

  if (loading) return <Splash label="Waking the monsters…" />;

  if (!user) {
    return showAuth ? (
      <AuthScreen onBack={() => setShowAuth(false)} />
    ) : (
      <Landing onStart={() => setShowAuth(true)} onSignIn={() => setShowAuth(true)} />
    );
  }

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase());

  if (isAdmin) return <MonsterGoalsApp />;

  if (purchaseLoading) return <Splash label="Checking your access…" />;

  if (!purchase) return <PurchaseGate />;

  return <MonsterGoalsApp />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
