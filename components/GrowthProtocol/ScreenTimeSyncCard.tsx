import React, { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { getOrCreateSyncToken, regenerateSyncToken } from '../../lib/growth/screenTime';

/**
 * The pairing code for the browser extension. The extension has no Supabase
 * session of its own, so this opaque token is how it proves which account's
 * watch time it is reporting — see `supabase/migrations/006_watch_time.sql`.
 */
export const ScreenTimeSyncCard: React.FC<{ userId: string | null | undefined }> = ({ userId }) => {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void getOrCreateSyncToken(userId).then(setToken);
  }, [userId]);

  if (!userId) return null;

  const copy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    setBusy(true);
    const fresh = await regenerateSyncToken(userId);
    setToken(fresh);
    setBusy(false);
  };

  return (
    <div className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-3">
      <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Screen Time Sync</h3>
      <p className="text-[11px] text-gray-500">
        Paste this code into the DeadByDefault browser extension to track YouTube and Twitch time
        automatically. Load it from <code>extension/</code> in the repo — see{' '}
        <code>extension/README.md</code>.
      </p>
      <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl px-4 py-3">
        <code className="flex-1 text-sm font-mono text-white truncate">{token ?? 'Generating…'}</code>
        <button onClick={copy} disabled={!token} className="p-2 text-brand hover:bg-brand/20 rounded-lg disabled:opacity-40" title="Copy">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <button
        onClick={() => void regenerate()}
        disabled={busy}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-brand disabled:opacity-40"
      >
        <RefreshCw size={11} className={busy ? 'animate-spin' : ''} />
        <span>Regenerate code (disconnects the old one)</span>
      </button>
    </div>
  );
};
