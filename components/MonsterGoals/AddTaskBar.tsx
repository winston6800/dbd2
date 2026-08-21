import React, { useState } from 'react';
import { BODY_FONT, COLORS } from '../../lib/monster/tokens';

/**
 * Deliberately styled as a dark terminal strip, in contrast to the soft paper
 * UI around it.
 */
export const AddTaskBar: React.FC<{ onAdd: (text: string) => void }> = ({ onAdd }) => {
  const [text, setText] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text);
    setText('');
  };

  return (
    <form
      onSubmit={submit}
      className="mg-terminal"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: COLORS.terminalBg,
        border: `2px solid ${COLORS.terminalBorder}`,
        borderRadius: 4,
        padding: '12px 14px',
        boxShadow: `inset 0 0 0 1px ${COLORS.terminalLine}, 0 4px 0 ${COLORS.terminalBorder}`,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: COLORS.signalDot,
          boxShadow: `0 0 6px ${COLORS.signalDot}`,
          flexShrink: 0,
        }}
      />
      <span
        className="mg-terminal-label"
        style={{
          color: COLORS.terminalLabel,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '1.5px',
          flexShrink: 0,
        }}
      >
        QUEUE ORDER
      </span>
      <input
        className="mg-terminal-input"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Enter task / target objective..."
        style={{
          background: COLORS.terminalInput,
          border: `1px solid ${COLORS.terminalLine}`,
          borderRadius: 2,
          padding: '10px 12px',
          color: COLORS.terminalText,
          fontSize: 14,
          fontFamily: BODY_FONT,
        }}
      />
      <button
        type="submit"
        style={{
          background: COLORS.actionFill,
          border: 'none',
          borderRadius: 2,
          padding: '10px 18px',
          fontWeight: 800,
          letterSpacing: '1px',
          color: COLORS.terminalBg,
          cursor: 'pointer',
          flexShrink: 0,
          clipPath: 'polygon(8px 0,100% 0,100% 100%,0 100%,0 8px)',
        }}
      >
        + ADD
      </button>
    </form>
  );
};
