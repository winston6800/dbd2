import React, { useState } from 'react';
import { COLORS } from '../../lib/monster/tokens';

export const AddBossForm: React.FC<{ onAdd: (name: string) => void }> = ({ onAdd }) => {
  const [name, setName] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name);
    setName('');
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        gap: 10,
        background: COLORS.surface,
        border: `2px solid ${COLORS.cardBorder}`,
        padding: 14,
        borderRadius: 14,
      }}
    >
      <input
        className="mg-input"
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Sub-goal, e.g. Run 20 miles a week"
        style={{
          flex: 1,
          background: COLORS.inputFill,
          border: `2px solid ${COLORS.formBorder}`,
          borderRadius: 8,
          padding: '10px 12px',
          color: 'inherit',
          fontSize: 14,
        }}
      />
      <button
        type="submit"
        style={{
          background: COLORS.ctaFill,
          border: `2px solid ${COLORS.ink}`,
          borderRadius: 8,
          padding: '10px 16px',
          fontWeight: 700,
          color: COLORS.ink,
          cursor: 'pointer',
        }}
      >
        Add
      </button>
    </form>
  );
};
