import React from 'react';
import type { CSSProperties } from 'react';
import { COLORS, TEETH_CLIP } from '../../lib/monster/tokens';

/**
 * Four deterministic face variants, keyed off a hash of the boss id so each
 * monster looks different but stays stable across renders.
 *
 *   0 — angled slit eyes + jagged-teeth mouth
 *   1 — half-moon closed eyes + soft curved smile
 *   2 — ring outline eyes + round open mouth
 *   3 — flat rectangular eyes + shallow arc smile
 *
 * Percentages are copied verbatim from the prototype's `miniBossNodes` block.
 */
export function faceVariantStyles(variant: number, ink: string): {
  eyeLeft: CSSProperties;
  eyeRight: CSSProperties;
  mouth: CSSProperties;
} {
  switch (variant) {
    case 0:
      return {
        eyeLeft: {
          position: 'absolute',
          left: '26%',
          top: '32%',
          width: '17%',
          height: '5%',
          background: ink,
          borderRadius: 3,
          transform: 'rotate(-18deg)',
        },
        eyeRight: {
          position: 'absolute',
          left: '57%',
          top: '32%',
          width: '17%',
          height: '5%',
          background: ink,
          borderRadius: 3,
          transform: 'rotate(18deg)',
        },
        mouth: {
          position: 'absolute',
          left: '22%',
          top: '54%',
          width: '56%',
          height: '20%',
          background: ink,
          clipPath: TEETH_CLIP,
          borderRadius: '0 0 6px 6px',
        },
      };
    case 1:
      return {
        eyeLeft: {
          position: 'absolute',
          left: '27%',
          top: '36%',
          width: '15%',
          height: '8%',
          background: ink,
          borderRadius: '0 0 20px 20px',
        },
        eyeRight: {
          position: 'absolute',
          left: '58%',
          top: '36%',
          width: '15%',
          height: '8%',
          background: ink,
          borderRadius: '0 0 20px 20px',
        },
        mouth: {
          position: 'absolute',
          left: '30%',
          top: '58%',
          width: '40%',
          height: '14%',
          borderBottom: `3px solid ${ink}`,
          borderRadius: '0 0 40px 8px',
        },
      };
    case 2:
      return {
        eyeLeft: {
          position: 'absolute',
          left: '24%',
          top: '30%',
          width: '17%',
          height: '17%',
          border: `3px solid ${ink}`,
          borderRadius: '50%',
        },
        eyeRight: {
          position: 'absolute',
          left: '59%',
          top: '30%',
          width: '17%',
          height: '17%',
          border: `3px solid ${ink}`,
          borderRadius: '50%',
        },
        mouth: {
          position: 'absolute',
          left: '42%',
          top: '58%',
          width: '16%',
          height: '18%',
          background: ink,
          borderRadius: '50%',
        },
      };
    default:
      return {
        eyeLeft: {
          position: 'absolute',
          left: '25%',
          top: '34%',
          width: '18%',
          height: '7%',
          background: ink,
          borderRadius: 2,
        },
        eyeRight: {
          position: 'absolute',
          left: '57%',
          top: '34%',
          width: '18%',
          height: '7%',
          background: ink,
          borderRadius: 2,
        },
        mouth: {
          position: 'absolute',
          left: '28%',
          top: '62%',
          width: '44%',
          height: '8%',
          borderTop: `3px solid ${ink}`,
          borderRadius: '60% 60% 0 0 / 100% 100% 0 0',
        },
      };
  }
}

export const MonsterFace: React.FC<{ variant: number; ink?: string }> = ({ variant, ink = COLORS.ink }) => {
  const { eyeLeft, eyeRight, mouth } = faceVariantStyles(variant, ink);
  return (
    <>
      <div style={eyeLeft} />
      <div style={eyeRight} />
      <div style={mouth} />
    </>
  );
};

/** The hero monster face — always variant 0 geometry at the original offsets. */
export const HeroFace: React.FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: '28%',
        top: '32%',
        width: '16%',
        height: '5%',
        background: COLORS.ink,
        borderRadius: 3,
        transform: 'rotate(-18deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: '56%',
        top: '32%',
        width: '16%',
        height: '5%',
        background: COLORS.ink,
        borderRadius: 3,
        transform: 'rotate(18deg)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: '22%',
        top: '54%',
        width: '56%',
        height: '20%',
        background: COLORS.ink,
        clipPath: TEETH_CLIP,
        borderRadius: '0 0 6px 6px',
      }}
    />
  </>
);
