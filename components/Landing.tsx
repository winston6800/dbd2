import React, { useEffect } from 'react';
import { Skull, Home, Activity, Compass, Users, BarChart3, User, Check } from 'lucide-react';
import { track, trackOnce } from '../lib/analytics';

/**
 * The marketing surface for logged-out visitors.
 *
 * Cold traffic used to land straight on an email/password form with no
 * explanation of what the product is or that it costs money. This page
 * explains the loop, previews the board, and states the price before anyone
 * signs up.
 */

const TABS: { icon: React.ReactNode; label: string }[] = [
  { icon: <Home size={16} />, label: 'Command' },
  { icon: <Activity size={16} />, label: 'Feed' },
  { icon: <Compass size={16} />, label: 'Discover' },
  { icon: <Users size={16} />, label: 'Groups' },
  { icon: <BarChart3 size={16} />, label: 'Analytics' },
  { icon: <User size={16} />, label: 'Profile' },
];

const BEATS: { title: string; body: string }[] = [
  {
    title: 'Name the objective you keep dodging',
    body: '"Increase daily signups." "Ship the landing page." Whatever it is, it goes at the top of Command, in your face, every day.',
  },
  {
    title: 'Log the loop, keep the vow',
    body: 'Every unit of work moves the counter. Every day you actually shipped something gets an Honor Code check — no faking it, the streak knows.',
  },
  {
    title: 'Bring people into it',
    body: 'Follow other founders, start a group, watch the Feed. Streaks are harder to fake and easier to keep when someone else can see them.',
  },
];

// A static preview of the Command heatmap — same math as the real one, fixed
// data, so cold traffic sees the actual product instead of a mockup.
const DEMO_WEEK = [
  { label: 'M', uvs: 4, shipped: true },
  { label: 'T', uvs: 9, shipped: true },
  { label: 'W', uvs: 0, shipped: false },
  { label: 'T', uvs: 12, shipped: true },
  { label: 'F', uvs: 6, shipped: true },
  { label: 'S', uvs: 2, shipped: false },
  { label: 'S', uvs: 15, shipped: true, today: true },
];

function demoHeatColor(uvs: number): { bg: string; check: string } {
  if (uvs === 0) return { bg: 'rgba(255,255,255,0.05)', check: '#fff' };
  const ratio = Math.min(1, uvs / 15);
  const r = 225 + (255 - 225) * ratio;
  const g = 29 + (255 - 29) * ratio;
  const b = 72 + (255 - 72) * ratio;
  return { bg: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`, check: ratio > 0.5 ? '#000' : '#fff' };
}

export const Landing: React.FC<{ onStart: () => void; onSignIn: () => void }> = ({ onStart, onSignIn }) => {
  useEffect(() => trackOnce('landing_view'), []);

  const start = () => {
    track('landing_cta_click');
    onStart();
  };

  return (
    <div className="min-h-screen bg-gradient-red flex flex-col items-center px-5 py-6 text-white">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex justify-end">
          <button onClick={onSignIn} className="text-sm font-bold text-gray-500 underline hover:text-brand">
            Sign in
          </button>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-black border-4 border-brand shadow-[0_0_30px_rgba(225,29,72,0.4)] flex items-center justify-center animate-pulse-slow">
            <Skull size={36} className="text-brand" />
          </div>
          <span className="text-xs font-black tracking-[3px] text-brand">DEADBYDEFAULT</span>
          <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-tight">
            Built different isn't a personality. It's a default you have to overwrite.
          </h1>
          <p className="text-gray-400 text-base max-w-lg">
            Years of feeds built to keep you scrolling trained you to flake on yourself by default.
            DeadByDefault is a survival-style growth tracker for founders — Strava for the goal you keep
            avoiding. Log the loop, keep the vow, watch the streak compound.
          </p>
          <button onClick={start} className="px-7 py-3.5 rounded-xl bg-brand border-2 border-white font-black uppercase tracking-widest shadow-[0_0_22px_rgba(225,29,72,0.45)]">
            Start free trial
          </button>
          <span className="text-[11px] font-black tracking-wide text-brand">3 DAYS FREE · THEN $20 / MONTH · CANCEL ANY TIME</span>
        </div>

        {/* Command preview */}
        <div className="bg-dark-card border-2 border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand">Survival Pulse</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Growth Heatmap</span>
          </div>
          <div className="grid grid-cols-7 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5">
            {DEMO_WEEK.map((d, i) => {
              const { bg, check } = demoHeatColor(d.uvs);
              return (
                <div key={i} className="flex flex-col items-center space-y-1.5">
                  <span className={`text-[8px] font-black uppercase ${d.today ? 'text-brand' : 'text-gray-600'}`}>{d.label}</span>
                  <div
                    className={`w-full aspect-square rounded-lg flex items-center justify-center relative ${d.today ? 'ring-2 ring-brand' : ''}`}
                    style={{ backgroundColor: bg }}
                  >
                    {d.shipped && <Check className="absolute -top-1 -right-1" style={{ color: check }} size={10} strokeWidth={4} />}
                    {d.uvs > 0 && <span className="text-[10px] font-black tabular-nums" style={{ color: check }}>{d.uvs}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-500">Seven days, seven honest check-ins, one streak that does not lie.</p>
        </div>

        {/* Six tabs — the whole app, not one screen */}
        <div className="flex flex-wrap justify-center gap-2">
          {TABS.map(t => (
            <div key={t.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-card border border-white/10 text-gray-400 text-xs font-bold">
              <span className="text-brand">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BEATS.map((b, i) => (
            <div key={b.title} className="bg-dark-card border-2 border-white/10 rounded-2xl p-4">
              <div className="text-[10px] font-black tracking-widest text-brand mb-1.5">STEP {i + 1}</div>
              <div className="font-black text-base mb-1.5">{b.title}</div>
              <div className="text-gray-500 text-sm leading-relaxed">{b.body}</div>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="bg-dark-card border-2 border-white/10 rounded-2xl p-6 text-center">
          <div className="text-2xl font-black italic">3 days free, then $20/mo</div>
          <div className="text-gray-500 text-sm mt-1 mb-4">
            Try it for three days without paying. We take a card up front so it keeps working when the
            trial ends — cancel before then and you are not charged, and cancelling later takes two
            clicks. Unlimited groups and following, synced across your devices.
          </div>
          <button onClick={start} className="px-7 py-3.5 rounded-xl bg-brand border-2 border-white font-black uppercase tracking-widest">
            Start your streak
          </button>
        </div>

        <div className="text-center text-xs text-brand/80">
          Years of the internet trained you to flake on yourself by default. This is where you stop.
        </div>
        <div className="text-center text-xs text-brand/80">
          If your dream is working at Amazon, Google, Microsoft, or OpenAI for the money — go fuck yourself, and GTFO.
        </div>
      </div>
    </div>
  );
};
