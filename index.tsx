import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/monsterGoals.css';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { SubscriptionGate } from './components/SubscriptionGate';
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
 * Hard gate: sign in, then start a trial, then the board. No part of the game is
 * reachable without both — logged-out visitors get the landing page, which
 * explains the product and states the price before asking for an email.
 */
const AppGate: React.FC = () => {
  const { user, subscription, loading, subscriptionLoading, refreshSubscription } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Handle returning from Stripe checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Give the webhook a moment to land, then re-read the entitlement.
      const timer = setTimeout(() => refreshSubscription(), 3000);
      window.history.replaceState({}, '', window.location.pathname);
      return () => clearTimeout(timer);
    }
  }, [refreshSubscription]);

  // Marks the end of the funnel: signed in, trial started, through the gate.
  useEffect(() => {
    if (subscription) trackOnce('trial_started');
  }, [subscription]);

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

  if (subscriptionLoading) return <Splash label="Checking your access…" />;

  if (!subscription) return <SubscriptionGate />;

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
