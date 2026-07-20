
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { SubscriptionGate } from './components/SubscriptionGate';
import { Loader, AlertCircle } from 'lucide-react';

const AppGate: React.FC = () => {
  const { user, subscription, loading, subscriptionLoading, subscriptionError, passwordRecovery, refreshSubscription } = useAuth();

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

  if (passwordRecovery) return <ResetPasswordScreen />;

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase());

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader size={24} className="text-brand animate-spin" />
      </div>
    );
  }

  if (!isAdmin && subscriptionError && !subscription) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <AlertCircle size={32} className="text-red-400 mx-auto" />
          <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Couldn't verify subscription</h2>
          <p className="text-gray-500 text-sm">{subscriptionError}</p>
          <button onClick={() => refreshSubscription()} className="text-brand text-sm font-bold hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin && !subscription) return <SubscriptionGate />;

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
