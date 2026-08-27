import React, { useCallback, useEffect, useState } from 'react';
import { fetchSummary, type AnalyticsSummary } from '../../lib/analytics';

/**
 * Launch dashboard: how many people landed, how far they got, and where they
 * came from. Every chart is a single series, so each uses one hue rather than
 * a categorical set — the funnel's five-step ramp carries stage depth.
 */

const FUNNEL_RAMP = ['#ff1f3d', '#e01535', '#b8102a', '#8e0b20', '#5f0715'];
const SERIES = '#ff1f3d';

const STAGE_LABELS: Record<string, string> = {
  landing_view: 'Landed',
  landing_cta_click: 'Clicked start',
  signup_completed: 'Signed up',
  checkout_started: 'Started checkout',
  trial_started: 'Started trial',
};

const RANGES = [7, 14, 30] as const;

interface Tip {
  x: number;
  y: number;
  text: string;
}

const StatTile: React.FC<{ label: string; value: number | string; note?: string }> = ({ label, value, note }) => (
  <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
    <div className="text-[10px] font-black tracking-widest text-brand">{label.toUpperCase()}</div>
    <div className="text-3xl font-black italic tabular-nums leading-tight text-white">{value}</div>
    {note && <div className="text-[11px] text-gray-500">{note}</div>}
  </div>
);

export const AnalyticsDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [days, setDays] = useState<number>(14);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showTable, setShowTable] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  const load = useCallback(async (range: number) => {
    setState('loading');
    const summary = await fetchSummary(range);
    if (!summary) {
      setState('error');
      return;
    }
    setData(summary);
    setState('ready');
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const funnelTop = data?.funnel?.[0]?.sessions ?? 0;
  const dailyMax = Math.max(1, ...(data?.daily ?? []).map(d => d.visitors));
  const referrerMax = Math.max(1, ...(data?.referrers ?? []).map(r => r.sessions));
  const totals = data?.totals;
  const trialConversion =
    totals && totals.trialing + totals.active > 0
      ? `${((totals.active / (totals.trialing + totals.active)) * 100).toFixed(0)}% of trials`
      : '—';
  const mrr = totals ? `$${(totals.active * 20).toLocaleString()}` : '—';

  return (
    <div className="min-h-screen bg-gradient-red flex flex-col items-center px-5 py-6 text-white" onMouseLeave={() => setTip(null)}>
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-black italic uppercase">Analytics</div>
            <div className="text-sm text-gray-500">Last {days} days</div>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-brand/40 bg-dark-card text-white text-sm font-bold hover:border-brand transition-colors"
          >
            ← Back to app
          </button>
        </div>

        <div className="flex items-center gap-2">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 py-1.5 rounded-lg border border-brand/40 text-xs font-bold ${r === days ? 'bg-white text-black' : 'bg-dark-card text-white'}`}
            >
              {r} days
            </button>
          ))}
          <button onClick={() => setShowTable(v => !v)} className="ml-auto text-xs text-gray-500 underline hover:text-brand">
            {showTable ? 'Hide table' : 'View as table'}
          </button>
        </div>

        {state === 'loading' && <div className="bg-dark-card border border-white/10 rounded-2xl p-4 text-gray-400 text-sm">Counting…</div>}

        {state === 'error' && (
          <div className="bg-dark-card border border-white/10 rounded-2xl p-4 text-sm">
            <div className="font-bold mb-1">Could not load analytics</div>
            <div className="text-gray-500 text-xs">
              The summary is admin-only. Add your email to the <code>admin_emails</code> table in Supabase:
              <br />
              <code className="text-[11px]">insert into public.admin_emails (email) values ('you@example.com');</code>
            </div>
          </div>
        )}

        {state === 'ready' && data && (
          <>
            {totals && totals.visitors === 0 && (
              <div className="bg-dark-card border border-white/10 rounded-2xl p-4 text-sm text-gray-500">
                No traffic recorded yet. Events start landing as soon as someone opens the site — add{' '}
                <code>?utm_source=reddit</code> to the links you post so each campaign is attributed separately.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="Visitors" value={totals?.visitors ?? 0} />
              <StatTile label="Signups" value={totals?.signups ?? 0} />
              <StatTile label="On trial" value={totals?.trialing ?? 0} note={`${totals?.cancelling ?? 0} cancelling`} />
              <StatTile label="Paying" value={mrr} note={`MRR · ${trialConversion}`} />
            </div>

            {/* Funnel — ordered stages, so an ordinal ramp carries depth. */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
              <div className="font-black text-lg italic">Funnel</div>
              <div className="text-xs text-gray-500 mb-3">Distinct sessions reaching each stage.</div>
              {data.funnel.map((stage, i) => {
                const pct = funnelTop > 0 ? (stage.sessions / funnelTop) * 100 : 0;
                return (
                  <div key={stage.event} className={i === data.funnel.length - 1 ? '' : 'mb-2.5'}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{STAGE_LABELS[stage.event] ?? stage.event}</span>
                      <span className="text-gray-500 tabular-nums">
                        {stage.sessions}
                        {funnelTop > 0 && i > 0 && ` · ${pct.toFixed(0)}%`}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded h-[22px] overflow-hidden">
                      <div
                        onMouseEnter={e =>
                          setTip({ x: e.clientX, y: e.clientY, text: `${STAGE_LABELS[stage.event] ?? stage.event}: ${stage.sessions} sessions` })
                        }
                        onMouseLeave={() => setTip(null)}
                        className="h-full rounded-r transition-all"
                        style={{
                          width: `${Math.max(pct, stage.sessions > 0 ? 2 : 0)}%`,
                          background: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visitors over time — single series, one hue. */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
              <div className="font-black text-lg italic">Visitors per day</div>
              <div className="text-xs text-gray-500 mb-3">Distinct sessions, {days}-day window.</div>
              <div className="flex items-end gap-[3px] h-[130px]">
                {data.daily.map(d => (
                  <div
                    key={d.day}
                    onMouseEnter={e =>
                      setTip({
                        x: e.clientX,
                        y: e.clientY,
                        text: `${d.day} — ${d.visitors} visitor${d.visitors === 1 ? '' : 's'}, ${d.signups} signup${d.signups === 1 ? '' : 's'}`,
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                    className="flex-1 flex flex-col justify-end h-full"
                  >
                    <div
                      className="rounded-t"
                      style={{
                        height: `${(d.visitors / dailyMax) * 100}%`,
                        minHeight: d.visitors > 0 ? 3 : 1,
                        background: d.visitors > 0 ? SERIES : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1 text-[10px] text-brand/80 tabular-nums">
                <span>{data.daily[0]?.day ?? ''}</span>
                <span>{data.daily[data.daily.length - 1]?.day ?? ''}</span>
              </div>
            </div>

            {/* Where traffic came from — the number that matters on launch day. */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
              <div className="font-black text-lg italic">Traffic sources</div>
              <div className="text-xs text-gray-500 mb-3">From utm_source, falling back to the referring domain.</div>
              {data.referrers.length === 0 && <div className="text-sm text-gray-500">Nothing recorded yet.</div>}
              {data.referrers.map((r, i) => (
                <div
                  key={r.source}
                  className={i === data.referrers.length - 1 ? '' : 'mb-2'}
                  onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, text: `${r.source}: ${r.sessions} sessions` })}
                  onMouseLeave={() => setTip(null)}
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate">{r.source}</span>
                    <span className="text-gray-500 tabular-nums">{r.sessions}</span>
                  </div>
                  <div className="bg-white/5 rounded h-[14px] overflow-hidden">
                    <div className="h-full rounded-r" style={{ width: `${(r.sessions / referrerMax) * 100}%`, background: SERIES }} />
                  </div>
                </div>
              ))}
            </div>

            {showTable && (
              <div className="bg-dark-card border border-white/10 rounded-2xl p-4 overflow-x-auto">
                <div className="font-black text-lg italic">Table view</div>
                <div className="text-xs text-gray-500 mb-3">The same numbers, without the charts.</div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-brand/70 text-[10px] tracking-widest">
                      <th className="py-1.5 px-1">DAY</th>
                      <th className="py-1.5 px-1 text-right">VISITORS</th>
                      <th className="py-1.5 px-1 text-right">SIGNUPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map(d => (
                      <tr key={d.day} className="border-t border-white/10">
                        <td className="py-1.5 px-1 tabular-nums">{d.day}</td>
                        <td className="py-1.5 px-1 text-right tabular-nums">{d.visitors}</td>
                        <td className="py-1.5 px-1 text-right tabular-nums">{d.signups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {tip && (
        <div
          className="fixed bg-black text-white text-xs font-semibold py-1.5 px-2.5 rounded-md pointer-events-none z-20 max-w-[220px]"
          style={{ left: Math.min(tip.x + 12, window.innerWidth - 220), top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
};
