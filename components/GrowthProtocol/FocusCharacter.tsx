import React from 'react';

export type FocusCharacterState = 'idle' | 'running' | 'paused' | 'done';

/**
 * A small companion for the focus session — reacts to the timer instead of
 * just showing a number. Glows brighter red the further into a session you
 * are, then breaks into a grin on completion.
 */
export const FocusCharacter: React.FC<{ state: FocusCharacterState; ratio?: number }> = ({ state, ratio = 0 }) => {
  const r = Math.max(0, Math.min(1, ratio));
  const glow = 0.12 + (state === 'running' ? r * 0.65 : 0);

  return (
    <div className="relative flex items-center justify-center w-[120px] h-[120px] mx-auto">
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle, rgba(225,29,72,${glow}) 0%, rgba(225,29,72,0) 70%)`,
          transform: `scale(${1 + (state === 'running' ? r * 0.5 : 0)})`,
        }}
      />
      <svg viewBox="0 0 120 120" width="104" height="104" className="relative z-10">
        <circle cx="60" cy="64" r="46" fill="#0a0a0a" stroke="#e11d48" strokeWidth="3" />
        <circle cx="30" cy="30" r="6" fill="#e11d48" opacity="0.5" />
        <circle cx="90" cy="30" r="6" fill="#e11d48" opacity="0.5" />

        {state === 'running' && (
          <>
            <path d="M38 58 Q46 66 54 58" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M66 58 Q74 66 82 58" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="60" cy="82" r="4" fill="#e11d48" />
          </>
        )}
        {state === 'paused' && (
          <>
            <path d="M38 58 Q46 62 54 58" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="74" cy="58" r="4" fill="#e11d48" />
            <line x1="48" y1="82" x2="72" y2="82" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {state === 'done' && (
          <>
            <path d="M38 62 Q46 50 54 62" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M66 62 Q74 50 82 62" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M42 78 Q60 96 78 78" stroke="#e11d48" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        )}
        {state === 'idle' && (
          <>
            <circle cx="46" cy="58" r="4" fill="#e11d48" />
            <circle cx="74" cy="58" r="4" fill="#e11d48" />
            <line x1="48" y1="82" x2="72" y2="82" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
};
