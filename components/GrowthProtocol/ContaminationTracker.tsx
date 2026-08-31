import React, { useId, useMemo, useState } from 'react';
import { Youtube, Twitch, X, RotateCcw } from 'lucide-react';
import type { UserState } from '../../lib/growth/types';

export type ScreenTimePlatform = 'youtube' | 'twitch' | 'x';
type TrendMode = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

const PLATFORMS: { key: ScreenTimePlatform; label: string; icon: React.ReactNode }[] = [
  { key: 'youtube', label: 'YouTube', icon: <Youtube size={18} className="text-red-500" /> },
  { key: 'twitch', label: 'Twitch', icon: <Twitch size={18} className="text-purple-400" /> },
  { key: 'x', label: 'X', icon: <X size={18} className="text-gray-300" /> },
];

/**
 * Hours at which a bucket reads as "fully contaminated" in its vial, per
 * granularity. Month/year/all-time caps are rough multiples of the daily
 * cap (roughly 3h/day sustained), not a precise formula — they just need to
 * make a genuinely heavy month/year/lifetime read as visibly murkier than a
 * light one.
 */
const DAILY_CAP_HOURS = 6;
const WEEKLY_CAP_HOURS = 21;
const MONTHLY_CAP_HOURS = 90;
const YEARLY_CAP_HOURS = 1000;
const ALL_TIME_CAP_HOURS = 4000;
const WEEKS_SHOWN = 6;
const MONTHS_SHOWN = 6;
const YEARS_SHOWN_MAX = 6;

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

/** Sums a platform's hours across every logged date whose key has `prefix`. */
function totalForPrefix(log: UserState['screenTimeLog'], prefix: string, platform: ScreenTimePlatform): number {
  if (!log) return 0;
  let total = 0;
  for (const [date, day] of Object.entries(log)) {
    if (date.startsWith(prefix)) total += day[platform] || 0;
  }
  return total;
}

function monthTotal(log: UserState['screenTimeLog'], monthsAgo: number, platform: ScreenTimePlatform): number {
  const d = new Date();
  d.setDate(1); // avoid month-length rollover (e.g. Mar 31 - 1 month)
  d.setMonth(d.getMonth() - monthsAgo);
  const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return totalForPrefix(log, prefix, platform);
}

function monthLabel(monthsAgo: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function yearTotal(log: UserState['screenTimeLog'], year: number, platform: ScreenTimePlatform): number {
  return totalForPrefix(log, String(year), platform);
}

function yearsWithData(log: UserState['screenTimeLog']): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);
  for (const date of Object.keys(log || {})) {
    years.add(Number(date.slice(0, 4)));
  }
  return Array.from(years)
    .sort((a, b) => a - b)
    .slice(-YEARS_SHOWN_MAX);
}

function allTimeTotal(log: UserState['screenTimeLog'], platform: ScreenTimePlatform): number {
  return totalForPrefix(log, '', platform);
}

export const ContaminationTracker: React.FC<{
  userState: UserState;
  onLog: (platform: ScreenTimePlatform) => void;
  onUndo: (platform: ScreenTimePlatform) => void;
}> = ({ userState, onLog, onUndo }) => {
  const today = todayStr();
  const todayLog = userState.screenTimeLog?.[today];
  const [mode, setMode] = useState<TrendMode>('WEEK');
  const log = userState.screenTimeLog;

  const years = useMemo(() => yearsWithData(log), [log]);

  // Bucketed views (WEEK/MONTH/YEAR): a row of vials per platform, oldest to
  // newest, each capped at that granularity's threshold. ALL is one lifetime
  // vial per platform instead of a row, so it's handled separately below.
  const buckets = useMemo(() => {
    const out: Record<ScreenTimePlatform, { hours: number; label: string }[]> = { youtube: [], twitch: [], x: [] };
    for (const { key } of PLATFORMS) {
      if (mode === 'WEEK') {
        for (let w = WEEKS_SHOWN - 1; w >= 0; w--) {
          out[key].push({ hours: weekTotal(log, w, key), label: w === 0 ? 'This wk' : `-${w}w` });
        }
      } else if (mode === 'MONTH') {
        for (let m = MONTHS_SHOWN - 1; m >= 0; m--) {
          out[key].push({ hours: monthTotal(log, m, key), label: monthLabel(m) });
        }
      } else if (mode === 'YEAR') {
        for (const year of years) {
          out[key].push({ hours: yearTotal(log, year, key), label: String(year) });
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, mode, years]);

  const cap = mode === 'WEEK' ? WEEKLY_CAP_HOURS : mode === 'MONTH' ? MONTHLY_CAP_HOURS : YEARLY_CAP_HOURS;
  const trendCaption =
    mode === 'WEEK' ? 'Oldest → this week, left to right.' :
    mode === 'MONTH' ? 'Oldest → this month, left to right.' :
    mode === 'YEAR' ? 'Oldest → this year, left to right.' :
    'Every hour ever logged, per platform.';

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

      <div className="space-y-4 pt-3 border-t border-white/5">
        <div className="flex bg-black/40 border border-white/5 rounded-xl p-1">
          {(['WEEK', 'MONTH', 'YEAR', 'ALL'] as TrendMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === m ? 'bg-brand text-white shadow' : 'text-gray-500 hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === 'ALL' ? (
          <div className="grid grid-cols-3 gap-3">
            {PLATFORMS.map(({ key, label, icon }) => {
              const hours = allTimeTotal(log, key);
              const ratio = Math.min(1, hours / ALL_TIME_CAP_HOURS);
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  {icon}
                  <Vial ratio={ratio} size={40} />
                  <span className="text-xs font-black italic tabular-nums text-white">{hours}h</span>
                  <span className="text-[8px] text-gray-600 uppercase tracking-wide">{label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          PLATFORMS.map(({ key, label, icon }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-14 flex items-center gap-1 flex-shrink-0">
                {icon}
                <span className="text-[8px] text-gray-600 uppercase tracking-wide">{label}</span>
              </div>
              <div className="flex items-end gap-1.5 overflow-x-auto no-scrollbar">
                {buckets[key].map((bucket, i) => {
                  const isLast = i === buckets[key].length - 1;
                  const ratio = Math.min(1, bucket.hours / cap);
                  return (
                    <div key={i} className={`flex-shrink-0 ${isLast ? 'opacity-100' : 'opacity-70'}`} title={`${bucket.label}: ${bucket.hours}h`}>
                      <Vial ratio={ratio} size={22} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <p className="text-[9px] text-gray-700">{trendCaption}</p>
      </div>
    </div>
  );
};
