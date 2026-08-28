import React, { useCallback, useEffect, useState } from 'react';
import { Youtube, Twitch } from 'lucide-react';
import { fetchTodayScreenTime, type TodayScreenTime } from '../../lib/growth/screenTime';

const POLL_MS = 30_000;

function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Today's YouTube/Twitch time, reported by the browser extension. Polls
 * rather than subscribing to realtime — this is a glance-at-it number, not
 * something that needs to update mid-second.
 */
export const ScreenTimeCard: React.FC<{ userId: string | null | undefined }> = ({ userId }) => {
  const [data, setData] = useState<TodayScreenTime | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    void fetchTodayScreenTime(userId).then(setData);
  }, [userId]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!userId) return null;

  const total = (data?.youtubeSeconds ?? 0) + (data?.twitchSeconds ?? 0);

  return (
    <div className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Screen Time Today</h3>
        {total === 0 && <span className="text-[9px] text-gray-600">Nothing synced yet</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-white/5">
          <Youtube size={18} className="text-red-500 flex-shrink-0" />
          <div>
            <div className="text-lg font-black italic tabular-nums leading-none">{formatMinutes(data?.youtubeSeconds ?? 0)}</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">YouTube</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-white/5">
          <Twitch size={18} className="text-purple-400 flex-shrink-0" />
          <div>
            <div className="text-lg font-black italic tabular-nums leading-none">{formatMinutes(data?.twitchSeconds ?? 0)}</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Twitch</div>
          </div>
        </div>
      </div>
      <p className="text-[9px] text-gray-600">
        Synced automatically from the DeadByDefault browser extension. Set it up in Profile.
      </p>
    </div>
  );
};
