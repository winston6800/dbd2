import React, { useState } from 'react';
import { C, DISPLAY_FONT, MONO_FONT, VOID_BACKGROUND } from '../../lib/net/tokens';

/**
 * Declaring the plot.
 *
 * One sentence, and the prompt asks for the thing that does not exist yet —
 * not a goal, not a task. If someone types "learn rust" here the net will be
 * useless, so the placeholder and the examples do the work of teaching what
 * this tool is for before a single token is spent.
 */

const EXAMPLES = [
  'A way to run inference on a model too large for the GPU it is sitting on.',
  'A notation for musical rhythm that a non-musician can sight-read in an hour.',
  'A market that lets small farms hedge weather risk without an insurer.',
];

export const PlotSetup: React.FC<{ onStart: (name: string, premise: string) => void }> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [premise, setPremise] = useState('');

  const ready = name.trim().length > 1 && premise.trim().length > 12;

  return (
    <div
      style={{
        minHeight: '100dvh',
        ...VOID_BACKGROUND,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div style={{ fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.18em', color: C.meta, marginBottom: 14 }}>
          FRONTIER
        </div>

        <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: 32, lineHeight: 1.15, color: C.text, margin: '0 0 10px' }}>
          What are you trying to make that doesn't exist yet?
        </h1>

        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: '0 0 26px' }}>
          Not a goal — a thing. The net grows outward from this sentence, and every agent in it is
          pointed at the part nobody has done.
        </p>

        <label style={labelStyle}>SHORT NAME</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="offline inference"
          maxLength={48}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 18 }}>THE PREMISE — ONE SENTENCE</label>
        <textarea
          value={premise}
          onChange={e => setPremise(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready) onStart(name, premise);
          }}
          placeholder="A way to run inference on a model too large for the GPU it is sitting on."
          rows={3}
          maxLength={400}
          style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }}
        />

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 10, color: C.meta, marginBottom: 7 }}>OR START FROM ONE OF THESE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {EXAMPLES.map(example => (
              <button
                key={example}
                onClick={() => setPremise(example)}
                style={{
                  textAlign: 'left',
                  background: 'none',
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: '7px 10px',
                  color: C.muted,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => ready && onStart(name, premise)}
          disabled={!ready}
          style={{
            marginTop: 24,
            width: '100%',
            background: ready ? '#5eead4' : C.raised,
            color: ready ? C.void : C.meta,
            border: 'none',
            borderRadius: 9,
            padding: '13px 20px',
            fontFamily: MONO_FONT,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.06em',
            cursor: ready ? 'pointer' : 'default',
          }}
        >
          OPEN THE NET
        </button>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: MONO_FONT,
  fontSize: 10,
  letterSpacing: '0.1em',
  color: C.meta,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 9,
  padding: '11px 13px',
  color: C.text,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
};
