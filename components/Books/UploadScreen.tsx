import React, { useRef, useState } from 'react';
import { C, DISPLAY_FONT, MONO_FONT } from '../../lib/books/tokens';

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
  phase: string | null;
  compact?: boolean;
}

/** File picker + drag-and-drop for a PDF. Reused for the first upload and for adding another book. */
export const UploadScreen: React.FC<Props> = ({ onFile, busy, phase, compact }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type === 'application/pdf') onFile(file);
  };

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        pick(e.dataTransfer.files);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? C.accent : C.border}`,
        borderRadius: 16,
        padding: compact ? '28px 20px' : '56px 24px',
        textAlign: 'center',
        cursor: busy ? 'default' : 'pointer',
        background: dragOver ? C.accentSoft : C.surface,
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={e => pick(e.target.files)}
        style={{ display: 'none' }}
        disabled={busy}
      />

      {busy ? (
        <>
          <div style={{ fontFamily: MONO_FONT, fontSize: 11, letterSpacing: '0.08em', color: C.accent, marginBottom: 8 }}>
            WORKING
          </div>
          <div style={{ fontSize: 14, color: C.inkMuted }}>{phase ?? 'Reading…'}</div>
        </>
      ) : (
        <>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: compact ? 18 : 24, color: C.ink, marginBottom: 8 }}>
            Drop a PDF here
          </div>
          <div style={{ fontSize: 13, color: C.inkFaint }}>or click to choose a file</div>
        </>
      )}
    </div>
  );
};
