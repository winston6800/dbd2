import React, { useState } from 'react';
import { ACTIVE_GLOW, BLOB_RADIUS, COLORS, DISPLAY_FONT } from '../../lib/monster/tokens';
import { HeroFace } from './MonsterFace';

export const CreateGoalScreen: React.FC<{ onCreate: (name: string) => void }> = ({ onCreate }) => {
  const [name, setName] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(name);
    setName('');
  };

  return (
    <form
      onSubmit={submit}
      style={{
        width: '100%',
        maxWidth: 420,
        marginTop: '8vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: BLOB_RADIUS,
          background: COLORS.surface,
          border: `3px solid ${COLORS.monsterInk}`,
          boxShadow: ACTIVE_GLOW,
          position: 'relative',
          animation: 'floatIdleNoX 3.5s ease-in-out infinite',
        }}
      >
        <HeroFace />
      </div>

      <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24 }}>Name your goal</div>
      <div style={{ color: COLORS.mutedText, fontSize: 14, marginTop: -12 }}>
        Break it into mini-bosses and send in your troops.
      </div>

      <input
        className="mg-input"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Goal, e.g. Learn Spanish"
        style={{
          width: '100%',
          background: COLORS.surface,
          border: `2px solid ${COLORS.cardBorder}`,
          borderRadius: 10,
          padding: '12px 14px',
          color: 'inherit',
          fontSize: 15,
        }}
      />

      <button
        type="submit"
        style={{
          width: '100%',
          background: COLORS.ctaFill,
          border: `2px solid ${COLORS.ink}`,
          borderRadius: 10,
          padding: 14,
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize: 15,
          color: COLORS.ink,
          cursor: 'pointer',
        }}
      >
        Start the Fight
      </button>
    </form>
  );
};
