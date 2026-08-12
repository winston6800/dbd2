import React, { useEffect, useRef, useState } from 'react';
import type { ConvNode } from '../../lib/net/types';
import { agentOf } from '../../lib/net/agents';
import { C, MONO_FONT, heatColor } from '../../lib/net/tokens';
import type { FrontierScore } from '../../lib/net/frontier';

/**
 * The open conversation.
 *
 * Deliberately not a chat app: the node's question sits pinned at the top, and
 * the forks at the bottom are the primary action. Typing another message is the
 * secondary one. That ordering is the whole argument of the product — you are
 * meant to leave a conversation, not settle into it.
 */

interface Props {
  node: ConvNode;
  score: FrontierScore | undefined;
  ancestors: ConvNode[];
  busy: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onTakeFork: (forkId: string) => void;
  onToggleResolved: () => void;
  onStartCollide: () => void;
  onJump: (nodeId: string) => void;
}

export const ConversationPanel: React.FC<Props> = ({
  node,
  score,
  ancestors,
  busy,
  error,
  onSend,
  onTakeFork,
  onToggleResolved,
  onStartCollide,
  onJump,
}) => {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const agent = agentOf(node.agent);
  const openForks = node.forks.filter(f => !f.taken);

  // Follow the transcript as it grows, including while a turn is streaming in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [node.messages.length, node.id, busy]);

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    onSend(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      {/* Header: who you are talking to, and what this node is for. */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: agent.accent }} />
          <span style={{ fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.08em', color: agent.accent }}>
            {agent.name.toUpperCase()}
          </span>
          {score && (
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO_FONT, fontSize: 10, color: C.meta }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: heatColor(score.heat) }} />
              DEPTH {score.depth} · HEAT {Math.round(score.heat * 100)}
            </span>
          )}
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{node.title}</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{node.premise}</div>

        {ancestors.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 10, fontFamily: MONO_FONT, color: C.meta, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ancestors.map(a => (
              <button
                key={a.id}
                onClick={() => onJump(a.id)}
                style={{ background: 'none', border: 'none', padding: 0, color: C.meta, cursor: 'pointer', fontFamily: MONO_FONT, fontSize: 10 }}
                title={a.premise}
              >
                {a.title} /
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transcript */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>
        {node.messages.length === 0 && !busy && (
          <div style={{ color: C.meta, fontSize: 13, lineHeight: 1.6 }}>
            {agent.tagline}
            <div style={{ marginTop: 8, fontSize: 12 }}>Say anything to open the conversation — or just send “go”.</div>
          </div>
        )}

        {node.messages.map(message => (
          <div key={message.id} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.08em', color: message.role === 'user' ? C.meta : agent.accent, marginBottom: 5 }}>
              {message.role === 'user' ? 'YOU' : agent.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.65, color: message.role === 'user' ? C.muted : C.text, whiteSpace: 'pre-wrap' }}>
              {message.text}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ fontFamily: MONO_FONT, fontSize: 11, color: agent.accent, opacity: 0.85 }}>
            {agent.name.toUpperCase()} is thinking…
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: C.danger, border: `1px solid ${C.danger}55`, borderRadius: 8, padding: '8px 10px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Forks — the primary action. */}
      {openForks.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 16px', maxHeight: '38%', overflowY: 'auto' }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 10, letterSpacing: '0.1em', color: C.meta, marginBottom: 8 }}>
            FORKS — TAKE ONE TO GROW THE NET
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {openForks.map(fork => {
              const forkAgent = agentOf(fork.agent);
              return (
                <button
                  key={fork.id}
                  onClick={() => onTakeFork(fork.id)}
                  disabled={busy}
                  style={{
                    textAlign: 'left',
                    background: C.raised,
                    border: `1px solid ${C.border}`,
                    borderLeft: `2px solid ${forkAgent.accent}`,
                    borderRadius: 8,
                    padding: '9px 11px',
                    cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.5 : 1,
                    color: C.text,
                    font: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 9, letterSpacing: '0.08em', color: forkAgent.accent }}>
                      {forkAgent.name.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fork.title}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>{fork.premise}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Composer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={`Push back on ${agent.name}…`}
            rows={2}
            style={{
              flex: 1,
              minWidth: 0,
              resize: 'none',
              background: C.void,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '9px 11px',
              color: C.text,
              fontSize: 13,
              fontFamily: 'inherit',
              lineHeight: 1.5,
              outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={busy || !draft.trim()}
            style={{
              background: busy || !draft.trim() ? C.raised : agent.accent,
              color: busy || !draft.trim() ? C.meta : C.void,
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: MONO_FONT,
              cursor: busy || !draft.trim() ? 'default' : 'pointer',
            }}
          >
            SEND
          </button>
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
          <SubtleButton onClick={onStartCollide} disabled={busy}>
            ✳ collide with another node
          </SubtleButton>
          <SubtleButton onClick={onToggleResolved} disabled={busy}>
            {node.resolved ? '↺ reopen' : '✓ mark answered'}
          </SubtleButton>
        </div>
      </div>
    </div>
  );
};

const SubtleButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({
  onClick,
  disabled,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'none',
      border: 'none',
      padding: 0,
      color: C.meta,
      fontFamily: MONO_FONT,
      fontSize: 10,
      letterSpacing: '0.05em',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);
