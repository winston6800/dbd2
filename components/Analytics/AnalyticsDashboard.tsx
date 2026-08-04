import React, { useCallback, useEffect, useState } from 'react';
import { COLORS, DISPLAY_FONT, PAPER_BACKGROUND } from '../../lib/monster/tokens';
import { fetchSummary, type AnalyticsSummary } from '../../lib/monster/analytics';

/**
 * Launch dashboard: how many people landed, how far they got, and where they
 * came from.
 *
 * Charts follow the project's paper palette. Every chart here is a single
 * series, so each uses one hue rather than a categorical set. The funnel's
 * five-step ramp was validated as an ordinal ramp against the white card
 * surface (monotone lightness, visible step gaps, light end at 2.44:1 — clear
 * of the 2:1 ordinal floor). The app ships one theme (paper), so there is no
 * dark variant to step.
 */

/** Validated ordinal ramp, light → dark. Order carries funnel depth. */
const FUNNEL_RAMP = ['#7fb377', '#5f9457', '#4f7a49', '#3b5c37', '#2a4228'];
/** Single-series hue for the non-ordinal charts. */
const SERIES = '#4f7a49';

const STAGE_LABELS: Record<string, string> = {
  landing_view: 'Landed',
  landing_cta_click: 'Clicked start',
  signup_completed: 'Signed up',
  checkout_started: 'Started checkout',
  subscription_active: 'Subscribed',
};

const RANGES = [7, 14, 30] as const;

const card: React.CSSProperties = {
  background: COLORS.surface,
  border: `2px solid ${COLORS.ink}`,
  borderRadius: 14,
  padding: '16px 18px',
};

const cardTitle: React.CSSProperties = {
  fontFamily: DISPLAY_FONT,
  fontWeight: 700,
  fontSize: 17,
  marginBottom: 2,
};

const cardNote: React.CSSProperties = {
  fontSize: 12,
  color: COLORS.mutedText,
  marginBottom: 14,
};

/** Values align vertically in the table, so those get tabular figures. */
const tabular: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

interface Tip {
  x: number;
  y: number;
  text: string;
}

const StatTile: React.FC<{ label: string; value: number | string; note?: string }> = ({ label, value, note }) => (
  <div style={card}>
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: COLORS.metaText }}>
      {label.toUpperCase()}
    </div>
    <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 32, lineHeight: 1.2, ...tabular }}>{value}</div>
    {note && <div style={{ fontSize: 11, color: COLORS.mutedText }}>{note}</div>}
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
  const conversion =
    totals && totals.visitors > 0 ? `${((totals.subscribers / totals.visitors) * 100).toFixed(1)}%` : '—';

  const page: React.CSSProperties = {
    minHeight: '100vh',
    ...PAPER_BACKGROUND,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 20px 60px',
    color: COLORS.ink,
  };

  return (
    <div style={page} onMouseLeave={() => setTip(null)}>
      <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>Analytics</div>
            <div style={{ fontSize: 13, color: COLORS.mutedText }}>Last {days} days</div>
          </div>
          <button
            onClick={onBack}
            style={{
              background: COLORS.surface,
              border: `2px solid ${COLORS.ink}`,
              color: COLORS.ink,
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ← Back to board
          </button>
        </div>

        {/* Filters sit in one row above the charts. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setDays(r)}
              style={{
                background: r === days ? COLORS.ink : COLORS.surface,
                color: r === days ? COLORS.surface : COLORS.ink,
                border: `2px solid ${COLORS.ink}`,
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {r} days
            </button>
          ))}
          <button
            onClick={() => setShowTable(v => !v)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 12,
              color: COLORS.mutedText,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {showTable ? 'Hide table' : 'View as table'}
          </button>
        </div>

        {state === 'loading' && <div style={{ ...card, color: COLORS.mutedText, fontSize: 14 }}>Counting…</div>}

        {state === 'error' && (
          <div style={{ ...card, fontSize: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load analytics</div>
            <div style={{ color: COLORS.mutedText, fontSize: 13 }}>
              The summary is admin-only. Add your email to the <code>admin_emails</code> table in Supabase:
              <br />
              <code style={{ fontSize: 12 }}>
                insert into public.admin_emails (email) values ('you@example.com');
              </code>
            </div>
          </div>
        )}

        {state === 'ready' && data && (
          <>
            {totals && totals.visitors === 0 && (
              <div style={{ ...card, fontSize: 13, color: COLORS.mutedText }}>
                No traffic recorded yet. Events start landing as soon as someone opens the site — add{' '}
                <code>?utm_source=reddit</code> to the links you post so each campaign is attributed separately.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="mg-kpi-row">
              <StatTile label="Visitors" value={totals?.visitors ?? 0} />
              <StatTile label="Signups" value={totals?.signups ?? 0} />
              <StatTile label="Checkouts" value={totals?.checkouts ?? 0} />
              <StatTile label="Subscribers" value={totals?.subscribers ?? 0} note={`${conversion} of visitors`} />
            </div>

            {/* Funnel — ordered stages, so an ordinal ramp carries depth. */}
            <div style={card}>
              <div style={cardTitle}>Funnel</div>
              <div style={cardNote}>Distinct sessions reaching each stage.</div>
              {data.funnel.map((stage, i) => {
                const pct = funnelTop > 0 ? (stage.sessions / funnelTop) * 100 : 0;
                return (
                  <div key={stage.event} style={{ marginBottom: i === data.funnel.length - 1 ? 0 : 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{STAGE_LABELS[stage.event] ?? stage.event}</span>
                      <span style={{ color: COLORS.mutedText, ...tabular }}>
                        {stage.sessions}
                        {funnelTop > 0 && i > 0 && ` · ${pct.toFixed(0)}%`}
                      </span>
                    </div>
                    <div style={{ background: COLORS.gridLine, borderRadius: 4, height: 22, overflow: 'hidden' }}>
                      <div
                        onMouseEnter={e =>
                          setTip({
                            x: e.clientX,
                            y: e.clientY,
                            text: `${STAGE_LABELS[stage.event] ?? stage.event}: ${stage.sessions} sessions`,
                          })
                        }
                        onMouseLeave={() => setTip(null)}
                        style={{
                          width: `${Math.max(pct, stage.sessions > 0 ? 2 : 0)}%`,
                          height: '100%',
                          background: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)],
                          borderRadius: '0 4px 4px 0',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visitors over time — single series, one hue. */}
            <div style={card}>
              <div style={cardTitle}>Visitors per day</div>
              <div style={cardNote}>Distinct sessions, {days}-day window.</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130 }}>
                {data.daily.map(d => (
                  <div
                    key={d.day}
                    onMouseEnter={e =>
                      setTip({
                        x: e.clientX,
                        y: e.clientY,
                        text: `${d.day} — ${d.visitors} visitor${d.visitors === 1 ? '' : 's'}, ${d.signups} signup${
                          d.signups === 1 ? '' : 's'
                        }`,
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
                  >
                    <div
                      style={{
                        height: `${(d.visitors / dailyMax) * 100}%`,
                        minHeight: d.visitors > 0 ? 3 : 1,
                        background: d.visitors > 0 ? SERIES : COLORS.gridLine,
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: `1px solid ${COLORS.gridLine}`,
                  paddingTop: 6,
                  marginTop: 4,
                  fontSize: 10,
                  color: COLORS.metaText,
                  ...tabular,
                }}
              >
                <span>{data.daily[0]?.day ?? ''}</span>
                <span>{data.daily[data.daily.length - 1]?.day ?? ''}</span>
              </div>
            </div>

            {/* Where traffic came from — the number that matters on launch day. */}
            <div style={card}>
              <div style={cardTitle}>Traffic sources</div>
              <div style={cardNote}>From utm_source, falling back to the referring domain.</div>
              {data.referrers.length === 0 && (
                <div style={{ fontSize: 13, color: COLORS.mutedText }}>Nothing recorded yet.</div>
              )}
              {data.referrers.map((r, i) => (
                <div
                  key={r.source}
                  style={{ marginBottom: i === data.referrers.length - 1 ? 0 : 8 }}
                  onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, text: `${r.source}: ${r.sessions} sessions` })}
                  onMouseLeave={() => setTip(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</span>
                    <span style={{ color: COLORS.mutedText, ...tabular }}>{r.sessions}</span>
                  </div>
                  <div style={{ background: COLORS.gridLine, borderRadius: 4, height: 14, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(r.sessions / referrerMax) * 100}%`,
                        height: '100%',
                        background: SERIES,
                        borderRadius: '0 4px 4px 0',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {showTable && (
              <div style={{ ...card, overflowX: 'auto' }}>
                <div style={cardTitle}>Table view</div>
                <div style={cardNote}>The same numbers, without the charts.</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: COLORS.metaText, fontSize: 10, letterSpacing: '0.8px' }}>
                      <th style={{ padding: '6px 4px' }}>DAY</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right' }}>VISITORS</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right' }}>SIGNUPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map(d => (
                      <tr key={d.day} style={{ borderTop: `1px solid ${COLORS.gridLine}` }}>
                        <td style={{ padding: '6px 4px', ...tabular }}>{d.day}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', ...tabular }}>{d.visitors}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', ...tabular }}>{d.signups}</td>
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
          style={{
            position: 'fixed',
            left: Math.min(tip.x + 12, window.innerWidth - 220),
            top: tip.y + 12,
            background: COLORS.terminalBg,
            color: COLORS.terminalTip,
            fontSize: 12,
            fontWeight: 600,
            padding: '7px 11px',
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 20,
            maxWidth: 220,
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
};
