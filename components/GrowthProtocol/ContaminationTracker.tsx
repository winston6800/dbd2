import React, { useId, useMemo } from 'react';
import { Youtube, Twitch, X, RotateCcw } from 'lucide-react';
import type { UserState } from '../../lib/growth/types';

export type ScreenTimePlatform = 'youtube' | 'twitch' | 'x';

const PLATFORMS: { key: ScreenTimePlatform; label: string; icon: React.ReactNode }[] = [
  { key: 'youtube', label: 'YouTube', icon: <Youtube size={18} className="text-red-500" /> },
  { key: 'twitch', label: 'Twitch', icon: <Twitch size={18} className="text-purple-400" /> },
  { key: 'x', label: 'X', icon: <X size={18} className="text-gray-300" /> },
];

/** Hours at which a day (or week) reads as "fully contaminated" in the vial. */
const DAILY_CAP_HOURS = 6;
const WEEKLY_CAP_HOURS = 21;
const WEEKS_SHOWN = 6;

const CLEAR: [number, number, number] = [214, 234, 248];
const CONTAMINATED: [number, number, number] = [66, 58, 20];

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = a[0] + (b[0] - a[0]) * t;
  const g = a[1] + (b[1] - a[1]) * t;
  const bl = a[2] + (b[2] - a[2]) * t;
  return `rgb(${r}, ${g}, ${bl})`;
}

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * An isometric-style glass vial: full top ellipse, straight sides, only the
 * front half of the bottom arc (the back half is implied/hidden behind the
 * glass) — the standard way to fake a 3D cylinder in 2D. The liquid inside
 * gets its own squashed-ellipse "surface" for the same reason. Starts clear
 * (barely visible) and turns murky as `ratio` climbs toward 1.
 */
export const Vial: React.FC<{ ratio: number; size?: number }> = ({ ratio, size = 56 }) => {
  const uid = useId();
  const r = Math.max(0, Math.min(1, ratio));
  const bodyTop = 16;
  const bodyBottom = 88;
  const liquidTopY = bodyBottom - r * (bodyBottom - bodyTop);
  const liquidColor = mix(CLEAR, CONTAMINATED, r);
  const liquidOpacity = 0.3 + r * 0.6;
  const clipId = `vial-clip-${uid}`;

  return (
    <svg viewBox="0 0 60 100" width={size} height={size * (100 / 60)}>
      <defs>
        <clipPath id={clipId}>
          <path d={`M4,${bodyTop} L4,${bodyBottom} A26,10 0 0 0 56,${bodyBottom} L56,${bodyTop} A26,10 0 0 1 4,${bodyTop} Z`} />
        </clipPath>
      </defs>

      {/* Stopper */}
      <rect x="22" y="6" width="16" height="10" rx="2" fill="rgba(255,255,255,0.15)" />

      {/* Liquid, clipped to the glass silhouette */}
      {r > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y={liquidTopY} width="60" height={100 - liquidTopY} fill={liquidColor} opacity={liquidOpacity} />
          <ellipse cx="30" cy={liquidTopY} rx="26" ry="10" fill={liquidColor} opacity={Math.min(1, liquidOpacity + 0.15)} />
          {/* A little sediment once it's properly contaminated. */}
          {r > 0.45 && (
            <>
              <ellipse cx="18" cy={Math.min(bodyBottom - 4, liquidTopY + 14)} rx="4" ry="1.6" fill={mix(CLEAR, CONTAMINATED, 1)} opacity={0.35 * r} />
              <ellipse cx="38" cy={Math.min(bodyBottom - 3, liquidTopY + 22)} rx="3" ry="1.3" fill={mix(CLEAR, CONTAMINATED, 1)} opacity={0.3 * r} />
            </>
          )}
        </g>
      )}

      {/* Glass outline: top rim (full), sides, front-only bottom arc. */}
      <ellipse cx="30" cy={bodyTop} rx="26" ry="10" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
      <line x1="4" y1={bodyTop} x2="4" y2={bodyBottom} stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
      <line x1="56" y1={bodyTop} x2="56" y2={bodyBottom} stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
      <path d={`M4,${bodyBottom} A26,10 0 0 0 56,${bodyBottom}`} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />

      {/* Glass shine */}
      <line x1="12" y1={bodyTop + 6} x2="12" y2={bodyBottom - 6} stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

function weekTotal(log: UserState['screenTimeLog'], weeksAgo: number, platform: ScreenTimePlatform): number {
  if (!log) return 0;
  let total = 0;
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - weeksAgo * 7 - i);
    const key = d.toLocaleDateString('en-CA');
    total += log[key]?.[platform] || 0;
  }
  return total;
}

export const ContaminationTracker: React.FC<{
  userState: UserState;
  onLog: (platform: ScreenTimePlatform) => void;
  onUndo: (platform: ScreenTimePlatform) => void;
}> = ({ userState, onLog, onUndo }) => {
  const today = todayStr();
  const todayLog = userState.screenTimeLog?.[today];

  const weeklyByPlatform = useMemo(() => {
    const out: Record<ScreenTimePlatform, number[]> = { youtube: [], twitch: [], x: [] };
    for (const { key } of PLATFORMS) {
      for (let w = WEEKS_SHOWN - 1; w >= 0; w--) {
        out[key].push(weekTotal(userState.screenTimeLog, w, key));
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userState.screenTimeLog]);

  return (
    <div className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-5">
      <div>
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contamination Tracker</h3>
        <p className="text-[10px] text-gray-600 mt-1">
          Tap a platform every time you use it — one tap, one hour. Watch it clear over time.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PLATFORMS.map(({ key, label, icon }) => {
          const hours = todayLog?.[key] || 0;
          const ratio = Math.min(1, hours / DAILY_CAP_HOURS);
          return (
            <div key={key} className="flex flex-col items-center gap-2">
              <button
                onClick={() => onLog(key)}
                className="w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center hover:border-white/30 active:scale-90 transition-all"
                title={`Log an hour of ${label}`}
              >
                {icon}
              </button>
              <Vial ratio={ratio} size={48} />
              <div className="flex items-center gap-1">
                <span className="text-xs font-black italic tabular-nums text-white">{hours}h</span>
                {hours > 0 && (
                  <button
                    onClick={() => onUndo(key)}
                    className="text-gray-600 hover:text-gray-400"
                    title={`Undo one hour of ${label}`}
                  >
                    <RotateCcw size={10} />
                  </button>
                )}
              </div>
              <span className="text-[8px] text-gray-600 uppercase tracking-wide">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 pt-3 border-t border-white/5">
        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Week Over Week</span>
        {PLATFORMS.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-14 flex items-center gap-1 flex-shrink-0">
              {icon}
              <span className="text-[8px] text-gray-600 uppercase tracking-wide">{label}</span>
            </div>
            <div className="flex items-end gap-1.5">
              {weeklyByPlatform[key].map((hours, i) => {
                const isThisWeek = i === WEEKS_SHOWN - 1;
                const ratio = Math.min(1, hours / WEEKLY_CAP_HOURS);
                return (
                  <div key={i} className={isThisWeek ? 'opacity-100' : 'opacity-70'}>
                    <Vial ratio={ratio} size={22} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-[9px] text-gray-700">Oldest &rarr; this week, left to right.</p>
      </div>
    </div>
  );
};
