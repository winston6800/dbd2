import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/monsterGoals.css';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { SubscriptionGate } from './components/SubscriptionGate';
import { MonsterGoalsApp } from './components/MonsterGoals/MonsterGoalsApp';
import { COLORS, PAPER_BACKGROUND } from './lib/monster/tokens';

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
 * Hard gate: sign in, then subscribe, then the board. No part of the game is
 * reachable without both.
 */
const AppGate: React.FC = () => {
  const { user, subscription, loading, subscriptionLoading, refreshSubscription } = useAuth();

  // Handle returning from Stripe checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Give the webhook a moment to land, then re-read the subscription.
      const timer = setTimeout(() => refreshSubscription(), 3000);
      window.history.replaceState({}, '', window.location.pathname);
      return () => clearTimeout(timer);
    }
  }, [refreshSubscription]);

  if (loading) return <Splash label="Waking the monsters…" />;

  if (!user) return <AuthScreen />;

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase());

  if (isAdmin) return <MonsterGoalsApp />;

  if (subscriptionLoading) return <Splash label="Checking your subscription…" />;

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
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  </React.StrictMode>,
);
