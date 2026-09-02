import React from 'react';

export type FocusCharacterState = 'idle' | 'running' | 'paused' | 'done';

/**
 * A small bottle-shaped companion for the focus session — reacts to the
 * timer instead of just showing a number. Breathes (gently bobs) and its
 * hat wobbles while a session is running, glowing brighter red the further
 * into it you are, then breaks into a grin on completion.
 */
export const FocusCharacter: React.FC<{ state: FocusCharacterState; ratio?: number }> = ({ state, ratio = 0 }) => {
  const r = Math.max(0, Math.min(1, ratio));
  const glow = 0.12 + (state === 'running' ? r * 0.65 : 0);
  const breathing = state === 'running';

  return (
    <div className="relative flex items-center justify-center w-[130px] h-[170px] mx-auto">
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle, rgba(225,29,72,${glow}) 0%, rgba(225,29,72,0) 70%)`,
          transform: `scale(${1 + (state === 'running' ? r * 0.5 : 0)})`,
        }}
      />
      <svg
        viewBox="0 0 120 170"
        width="112"
        height="158"
        className={`relative z-10 ${breathing ? 'animate-breathe' : ''}`}
      >
        {/* Hat */}
        <g className={breathing ? 'animate-hat-wobble' : ''} style={{ transformOrigin: '60px 44px' }}>
          <ellipse cx="60" cy="42" rx="36" ry="9" fill="#0a0a0a" stroke="#e11d48" strokeWidth="3" />
          <rect x="38" y="8" width="44" height="34" rx="14" fill="#0a0a0a" stroke="#e11d48" strokeWidth="3" />
        </g>

        {/* Bottle body */}
        <path
          d="M 38,46 C 20,48 10,56 12,66 C 14,78 30,86 28,100 C 26,114 8,120 10,134
             C 12,150 30,162 60,162 C 90,162 108,150 110,134 C 112,120 94,114 92,100
             C 90,86 106,78 108,66 C 110,56 100,48 82,46 C 74,44 46,44 38,46 Z"
          fill="#0a0a0a"
          stroke="#e11d48"
          strokeWidth="3"
        />

        {/* Face */}
        {state === 'running' && (
          <>
            <path d="M40,80 Q47,88 54,80" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M66,80 Q73,88 80,80" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="60" cy="98" r="1.5" fill="#e11d48" />
            <circle cx="60" cy="105" r="4" fill="#e11d48" />
          </>
        )}
        {state === 'paused' && (
          <>
            <path d="M40,80 Q47,84 54,80" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="73" cy="80" r="4" fill="#e11d48" />
            <circle cx="60" cy="98" r="1.5" fill="#e11d48" />
            <line x1="50" y1="106" x2="70" y2="106" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {state === 'done' && (
          <>
            <path d="M40,84 Q47,72 54,84" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M66,84 Q73,72 80,84" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="60" cy="98" r="1.5" fill="#e11d48" />
            <path d="M44,102 Q60,120 76,102" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        )}
        {state === 'idle' && (
          <>
            <circle cx="47" cy="80" r="4" fill="#e11d48" />
            <circle cx="73" cy="80" r="4" fill="#e11d48" />
            <circle cx="60" cy="98" r="1.5" fill="#e11d48" />
            <line x1="50" y1="106" x2="70" y2="106" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
};
