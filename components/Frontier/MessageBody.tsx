import React from 'react';
import { isRunnable, type ProbeCode } from '../../lib/net/probe';
import { C, MONO_FONT } from '../../lib/net/tokens';

/**
 * Renders a message's text, splitting out fenced code blocks so a runnable one
 * can carry a Run button. This is the other half of the Artificer's contract —
 * its prompt tells it to emit runnable code because this component is here to
 * do something with it, not just display it as inert text.
 */

type Segment = { kind: 'text'; text: string } | { kind: 'code'; block: ProbeCode };

const FENCE = /```([a-zA-Z0-9+#-]*)\n([\s\S]*?)```/g;

function segment(text: string): Segment[] {
  const parts: Segment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(FENCE)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: 'text', text: text.slice(cursor, index) });
    const code = match[2].trim();
    if (code) parts.push({ kind: 'code', block: { language: (match[1] || 'text').toLowerCase(), code } });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) parts.push({ kind: 'text', text: text.slice(cursor) });
  return parts;
}

interface Props {
  text: string;
  textColor: string;
  /** Present only on the message that can still be run — one active probe at a time. */
  onRun?: (code: string) => void;
  running?: boolean;
}

export const MessageBody: React.FC<Props> = ({ text, textColor, onRun, running }) => {
  const segments = segment(text);
  // Only the first runnable block in the message gets offered — running two
  // artifacts out of one reply is a rare enough case that "take the first" is
  // the right default rather than building a picker for it.
  const firstRunnableIndex = segments.findIndex(s => s.kind === 'code' && isRunnable(s.block));

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          seg.text.trim() && (
            <div key={i} style={{ fontSize: 13.5, lineHeight: 1.65, color: textColor, whiteSpace: 'pre-wrap' }}>
              {seg.text.trim()}
            </div>
          )
        ) : (
          <CodeBlock
            key={i}
            block={seg.block}
            onRun={onRun && i === firstRunnableIndex ? onRun : undefined}
            running={running}
          />
        ),
      )}
    </>
  );
};

const CodeBlock: React.FC<{ block: ProbeCode; onRun?: (code: string) => void; running?: boolean }> = ({
  block,
  onRun,
  running,
}) => (
  <div style={{ margin: '8px 0', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 10px',
        background: C.raised,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span style={{ fontFamily: MONO_FONT, fontSize: 9.5, letterSpacing: '0.06em', color: C.meta }}>
        {block.language.toUpperCase()}
      </span>
      {onRun && (
        <button
          onClick={() => onRun(block.code)}
          disabled={running}
          style={{
            background: 'none',
            border: `1px solid ${running ? C.border : '#5eead4'}`,
            borderRadius: 5,
            padding: '2px 8px',
            color: running ? C.meta : '#5eead4',
            fontFamily: MONO_FONT,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.05em',
            cursor: running ? 'default' : 'pointer',
          }}
        >
          {running ? 'RUNNING…' : '▶ RUN'}
        </button>
      )}
    </div>
    <pre
      style={{
        margin: 0,
        padding: '10px 12px',
        overflowX: 'auto',
        fontFamily: MONO_FONT,
        fontSize: 12,
        lineHeight: 1.55,
        color: C.text,
        background: C.void,
      }}
    >
      {block.code}
    </pre>
  </div>
);
