import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { NetState } from '../../lib/net/types';
import { ancestorsOf, collisionCandidates, frontierNodes, scoreNet } from '../../lib/net/frontier';
import {
  addMessage,
  collide,
  nodeById,
  setActive,
  setForks,
  setResolved,
  startPlot,
  takeFork,
} from '../../lib/net/ops';
import { AgentError, runTurn } from '../../lib/net/agentClient';
import { formatResult, runProbe } from '../../lib/net/probe';
import { agentOf } from '../../lib/net/agents';
import { createNetSaver, loadNetFor } from '../../lib/net/sync';
import { C, MONO_FONT, VOID_BACKGROUND, heatColor } from '../../lib/net/tokens';
import { AgentLegend, NetCanvas } from './NetCanvas';
import { ConversationPanel } from './ConversationPanel';
import { PlotSetup } from './PlotSetup';
import { track } from '../../lib/monster/analytics';

/**
 * The app shell: canvas on the left, open conversation on the right.
 *
 * State is one `NetState` mutated only through the pure ops in ops.ts, mirrored
 * into a ref so an in-flight agent turn reads the transcript the user just
 * added rather than the one React has not committed yet.
 */

export const FrontierApp: React.FC = () => {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<NetState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collideFrom, setCollideFrom] = useState<string | null>(null);
  const [runningMessageId, setRunningMessageId] = useState<string | null>(null);

  const stateRef = useRef<NetState | null>(null);
  const saverRef = useRef<ReturnType<typeof createNetSaver> | null>(null);

  /** Single write path, so the ref and the saver never fall behind the UI. */
  const commit = useCallback((next: NetState) => {
    stateRef.current = next;
    setState(next);
    saverRef.current?.save(next);
  }, []);

  useEffect(() => {
    if (!user) return;
    saverRef.current = createNetSaver(user.id);

    let cancelled = false;
    loadNetFor(user.id).then(found => {
      if (cancelled) return;
      stateRef.current = found;
      setState(found);
      setLoading(false);
    });

    const flushOnHide = () => saverRef.current?.flush();
    document.addEventListener('visibilitychange', flushOnHide);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', flushOnHide);
      saverRef.current?.flush();
    };
  }, [user]);

  /**
   * Runs one agent turn against the node as it exists *now* — callers mutate
   * the ref first, so the user's message is already in the transcript.
   */
  const doTurn = useCallback(async (nodeId: string) => {
    const snapshot = stateRef.current;
    const node = snapshot ? nodeById(snapshot, nodeId) : null;
    if (!snapshot?.plot || !node) return;

    setBusy(true);
    setError(null);

    try {
      const ancestors = ancestorsOf(snapshot.nodes, node.id);
      const collided = node.links.length ? nodeById(snapshot, node.links[0]) ?? undefined : undefined;
      const result = await runTurn(snapshot.plot, node, ancestors, collided);

      const current = stateRef.current;
      if (!current) return;
      let next = addMessage(current, nodeId, 'agent', result.prose);
      if (result.forks.length) next = setForks(next, nodeId, result.forks);
      commit(next);
    } catch (err) {
      const message =
        err instanceof AgentError
          ? err.message
          : 'Something broke on the way to the model. Your conversation is saved.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [commit]);

  /** Opens a fresh node by putting its own question to its agent. */
  const openNode = useCallback((nodeId: string) => {
    const snapshot = stateRef.current;
    const node = snapshot ? nodeById(snapshot, nodeId) : null;
    if (!snapshot || !node || node.messages.length > 0) return;

    commit(addMessage(snapshot, nodeId, 'user', node.premise));
    void doTurn(nodeId);
  }, [commit, doTurn]);

  const beginPlot = useCallback((name: string, premise: string) => {
    const next = startPlot(name, premise);
    commit(next);
    track('plot_created');
    if (next.activeId) openNode(next.activeId);
  }, [commit, openNode]);

  const send = useCallback((text: string) => {
    const snapshot = stateRef.current;
    if (!snapshot?.activeId) return;
    commit(addMessage(snapshot, snapshot.activeId, 'user', text));
    void doTurn(snapshot.activeId);
  }, [commit, doTurn]);

  /**
   * Runs the Artificer's code and feeds the result back in as a probe message,
   * then immediately opens a new agent turn against it. Closing that loop live
   * — rather than waiting for the user to type something — is the point: the
   * next reply argues against a measured number instead of an assumption.
   */
  const runAndReport = useCallback(async (nodeId: string, messageId: string, code: string) => {
    setRunningMessageId(messageId);
    try {
      const result = await runProbe(code);
      const snapshot = stateRef.current;
      if (!snapshot) return;
      commit(addMessage(snapshot, nodeId, 'probe', formatResult(result)));
      void doTurn(nodeId);
    } finally {
      setRunningMessageId(null);
    }
  }, [commit, doTurn]);

  const onTakeFork = useCallback((forkId: string) => {
    const snapshot = stateRef.current;
    if (!snapshot?.activeId) return;
    const next = takeFork(snapshot, snapshot.activeId, forkId);
    if (next === snapshot) return;
    commit(next);
    track('fork_taken');
    if (next.activeId) openNode(next.activeId);
  }, [commit, openNode]);

  const onCollide = useCallback((otherId: string) => {
    const snapshot = stateRef.current;
    if (!snapshot || !collideFrom) return;
    const next = collide(snapshot, collideFrom, otherId);
    setCollideFrom(null);
    if (next === snapshot) return;
    commit(next);
    track('collision_opened');
    if (next.activeId) openNode(next.activeId);
  }, [collideFrom, commit, openNode]);

  const active = state ? nodeById(state, state.activeId) : null;
  const scores = useMemo(() => (state ? scoreNet(state.nodes) : {}), [state]);
  const hot = useMemo(() => (state ? frontierNodes(state.nodes).slice(0, 6) : []), [state]);
  const candidates = useMemo(
    () => (state && collideFrom ? collisionCandidates(state.nodes, collideFrom) : []),
    [state, collideFrom],
  );

  if (loading) return <Splash label="Opening the net…" />;
  if (!state?.plot) return <PlotSetup onStart={beginPlot} />;

  return (
    <div className="fr-shell" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', ...VOID_BACKGROUND, color: C.text }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 16px',
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}
      >
        <span style={{ fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.16em', color: C.meta }}>FRONTIER</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{state.plot.name}</span>
        <span style={{ fontFamily: MONO_FONT, fontSize: 10, color: C.meta }}>
          {state.nodes.length} NODES · {hot.length ? `${hot.length} HOT` : 'NO OPEN EDGE'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          <AgentLegend />
          <button
            onClick={() => void signOut()}
            style={{ background: 'none', border: 'none', color: C.meta, fontFamily: MONO_FONT, fontSize: 10, cursor: 'pointer' }}
          >
            SIGN OUT
          </button>
        </div>
      </div>

      <div className="fr-main" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px' }}>
        {/* Canvas */}
        <div style={{ position: 'relative', minWidth: 0, minHeight: 0 }}>
          <NetCanvas
            nodes={state.nodes}
            activeId={state.activeId}
            collideWith={collideFrom}
            onSelect={id => (collideFrom ? onCollide(id) : commit(setActive(stateRef.current!, id)))}
          />

          {/* Frontier rail — where to go next, ranked. */}
          {hot.length > 0 && !collideFrom && (
            <div style={{ position: 'absolute', left: 14, bottom: 14, maxWidth: 260 }}>
              <div style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.12em', color: C.meta, marginBottom: 6 }}>
                THE FRONTIER
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {hot.map(node => (
                  <button
                    key={node.id}
                    onClick={() => commit(setActive(stateRef.current!, node.id))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      background: node.id === state.activeId ? C.raised : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 7px',
                      color: C.muted,
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: heatColor(scores[node.id]?.heat ?? 0), flex: 'none' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {collideFrom && (
            <div style={{ position: 'absolute', inset: 0, background: '#0a0c0fcc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, width: '100%', maxWidth: 420 }}>
                <div style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em', color: C.edgeLink, marginBottom: 4 }}>
                  SYNTHESIST
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
                  Pick a distant node to collide with. Furthest from this branch first — those are the
                  collisions worth having.
                </div>

                {candidates.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.meta }}>
                    Nothing far enough away yet. Grow another branch first.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 280, overflowY: 'auto' }}>
                    {candidates.map(node => (
                      <button
                        key={node.id}
                        onClick={() => onCollide(node.id)}
                        style={{
                          textAlign: 'left',
                          background: C.raised,
                          border: `1px solid ${C.border}`,
                          borderLeft: `2px solid ${agentOf(node.agent).accent}`,
                          borderRadius: 7,
                          padding: '8px 10px',
                          color: C.text,
                          fontSize: 12.5,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {node.title}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setCollideFrom(null)}
                  style={{ marginTop: 14, background: 'none', border: 'none', color: C.meta, fontFamily: MONO_FONT, fontSize: 10, cursor: 'pointer', padding: 0 }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div style={{ borderLeft: `1px solid ${C.border}`, background: C.surface, minWidth: 0, minHeight: 0 }}>
          {active ? (
            <ConversationPanel
              node={active}
              score={scores[active.id]}
              ancestors={ancestorsOf(state.nodes, active.id)}
              busy={busy}
              error={error}
              runningMessageId={runningMessageId}
              onSend={send}
              onTakeFork={onTakeFork}
              onToggleResolved={() => commit(setResolved(stateRef.current!, active.id, !active.resolved))}
              onStartCollide={() => setCollideFrom(active.id)}
              onJump={id => commit(setActive(stateRef.current!, id))}
              onRunProbe={(messageId, code) => void runAndReport(active.id, messageId, code)}
            />
          ) : (
            <div style={{ padding: 20, color: C.meta, fontSize: 13 }}>Pick a node to open it.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const Splash: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      minHeight: '100dvh',
      ...VOID_BACKGROUND,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: C.meta,
      fontFamily: MONO_FONT,
      fontSize: 12,
    }}
  >
    {label}
  </div>
);
