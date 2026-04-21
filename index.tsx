
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { SubscriptionGate } from './components/SubscriptionGate';
import { Loader } from 'lucide-react';

const AppGate: React.FC = () => {
  const { user, subscription, loading, subscriptionLoading, refreshSubscription } = useAuth();

  // Handle returning from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Give webhook a moment, then refresh
      const timer = setTimeout(() => refreshSubscription(), 3000);
      window.history.replaceState({}, '', window.location.pathname);
      return () => clearTimeout(timer);
    }
  }, [refreshSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader size={24} className="text-brand animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!subscription && !subscriptionLoading) return <SubscriptionGate />;

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader size={24} className="text-brand animate-spin" />
      </div>
    );
  }

  return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  </React.StrictMode>
);
