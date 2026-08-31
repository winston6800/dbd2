import React, { useId, useState } from 'react';
import { Youtube, Twitch, X, EyeOff, RotateCcw } from 'lucide-react';
import type { UserState } from '../../lib/growth/types';

export type ScreenTimePlatform = 'youtube' | 'twitch' | 'x' | 'porn';
type Period = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

interface Category {
  key: ScreenTimePlatform;
  label: string;
  unit: string; // appended straight after the number, e.g. "3h" or "3x"
  icon: React.ReactNode;
}

const CATEGORIES: Category[] = [
  { key: 'youtube', label: 'YouTube', unit: 'h', icon: <Youtube size={16} className="text-red-500" /> },
  { key: 'twitch', label: 'Twitch', unit: 'h', icon: <Twitch size={16} className="text-purple-400" /> },
  { key: 'x', label: 'X', unit: 'h', icon: <X size={16} className="text-gray-300" /> },
  { key: 'porn', label: 'Porn', unit: 'x', icon: <EyeOff size={16} className="text-slate-400" /> },
];

/**
 * Contamination caps per period. Hour-based categories (youtube/twitch/x)
 * and the count-based one (porn) use different scales since "6 hours" and
 * "6 times" aren't the same intensity — both are just round numbers picked
 * so a genuinely heavy period reads as visibly murkier than a light one,
 * not a precise formula.
 */
const HOUR_CAPS: Record<Period, number> = { DAY: 6, WEEK: 21, MONTH: 90, YEAR: 1000, ALL: 4000 };
const COUNT_CAPS: Record<Period, number> = { DAY: 3, WEEK: 10, MONTH: 40, YEAR: 300, ALL: 1500 };

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
 * An isometric-style glass battery/vial: full top ellipse, straight sides,
 * only the front half of the bottom arc (the back half is implied/hidden
 * behind the glass) — the standard way to fake a 3D cylinder in 2D. The
 * liquid inside gets its own squashed-ellipse "surface" for the same
 * reason. Starts clear (barely visible) and turns murky as `ratio` climbs.
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

/** Sums a category's count across every logged date whose key has `prefix`. */
function totalForPrefix(log: UserState['screenTimeLog'], prefix: string, key: ScreenTimePlatform): number {
  if (!log) return 0;
  let total = 0;
  for (const [date, day] of Object.entries(log)) {
    if (date.startsWith(prefix)) total += day[key] || 0;
  }
  return total;
}

function periodTotal(log: UserState['screenTimeLog'], period: Period, key: ScreenTimePlatform): number {
  const now = new Date();
  if (period === 'DAY') return totalForPrefix(log, todayStr(), key);
  if (period === 'WEEK') {
    if (!log) return 0;
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      total += log[d.toLocaleDateString('en-CA')]?.[key] || 0;
    }
    return total;
  }
  if (period === 'MONTH') return totalForPrefix(log, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, key);
  if (period === 'YEAR') return totalForPrefix(log, String(now.getFullYear()), key);
  return totalForPrefix(log, '', key); // ALL
}

const PERIOD_CAPTION: Record<Period, string> = {
  DAY: 'Today',
  WEEK: 'Last 7 days',
  MONTH: 'This month',
  YEAR: 'This year',
  ALL: 'All time',
};

export const ContaminationTracker: React.FC<{
  userState: UserState;
  onLog: (platform: ScreenTimePlatform) => void;
  onUndo: (platform: ScreenTimePlatform) => void;
}> = ({ userState, onLog, onUndo }) => {
  const [period, setPeriod] = useState<Period>('DAY');
  const log = userState.screenTimeLog;

  return (
    <div className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-5">
      <div>
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contamination Tracker</h3>
        <p className="text-[10px] text-gray-600 mt-1">
          Tap a category every time you use it. Watch it clear over time.
        </p>
      </div>

      <div className="flex bg-black/40 border border-white/5 rounded-xl p-1">
        {(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${period === p ? 'bg-brand text-white shadow' : 'text-gray-500 hover:text-white'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {CATEGORIES.map(({ key, label, unit, icon }) => {
          const total = periodTotal(log, period, key);
          const cap = unit === 'h' ? HOUR_CAPS[period] : COUNT_CAPS[period];
          const ratio = Math.min(1, total / cap);
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => onLog(key)}
                className="w-9 h-9 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center hover:border-white/30 active:scale-90 transition-all"
                title={unit === 'h' ? `Log an hour of ${label}` : `Log a use of ${label}`}
              >
                {icon}
              </button>
              <Vial ratio={ratio} size={44} />
              <div className="flex items-center gap-1">
                <span className="text-xs font-black italic tabular-nums text-white">{total}{unit}</span>
                {period === 'DAY' && total > 0 && (
                  <button
                    onClick={() => onUndo(key)}
                    className="text-gray-600 hover:text-gray-400"
                    title={unit === 'h' ? `Undo one hour of ${label}` : `Undo one use of ${label}`}
                  >
                    <RotateCcw size={9} />
                  </button>
                )}
              </div>
              <span className="text-[8px] text-gray-600 uppercase tracking-wide">{label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-gray-700 text-center">{PERIOD_CAPTION[period]}</p>
    </div>
  );
};
