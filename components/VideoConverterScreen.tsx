import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Download, Plus, Trash2, Film, Check, Loader, Square } from 'lucide-react';
import type { UserState } from '../types';

interface Activity {
  id: string;
  text: string;
  emoji: string;
}

interface VideoConverterScreenProps {
  userState: UserState;
  currentUserName: string;
}

const W = 540;
const H = 960;
const SLIDE_DUR = 3.0;
const TRANS_DUR = 0.35;
const EMOJIS = ['⚡', '🚀', '🔥', '💡', '🏗️', '📈', '🎯', '💪', '🧠', '🔄', '✅', '🌟'];

function easeOut(t: number) {
  return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawBg(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.018)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 36) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 36) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

function drawIntro(ctx: CanvasRenderingContext2D, p: number, role: string) {
  const cy = H / 2;
  const ease = easeOut(p * 2.5);
  const yOff = (1 - ease) * 55;

  // Glow
  ctx.save();
  const grd = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, 220);
  grd.addColorStop(0, 'rgba(225,29,72,0.18)');
  grd.addColorStop(1, 'rgba(225,29,72,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, cy - 250, W, 500);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';

  // Skull
  ctx.font = '48px serif';
  ctx.fillText('💀', W / 2, cy - 100 + yOff * 0.6);

  // WHAT
  ctx.font = '700 70px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('WHAT', W / 2, cy - 10 + yOff);

  // I DO
  ctx.font = '900 90px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#e11d48';
  ctx.shadowColor = '#e11d48';
  ctx.shadowBlur = 20;
  ctx.fillText('I DO', W / 2, cy + 82 + yOff);
  ctx.shadowBlur = 0;

  // Underline
  const lw = ease * 190;
  ctx.strokeStyle = '#e11d48';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#e11d48';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(W / 2 - lw / 2, cy + 100 + yOff);
  ctx.lineTo(W / 2 + lw / 2, cy + 100 + yOff);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Role
  if (p > 0.35) {
    ctx.save();
    ctx.globalAlpha *= Math.min((p - 0.35) / 0.25, 1);
    ctx.font = '300 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`as a ${role}`, W / 2, cy + 148 + yOff);
    ctx.restore();
  }

  ctx.restore();
}

function drawActivity(ctx: CanvasRenderingContext2D, p: number, act: Activity, idx: number, total: number) {
  const cy = H / 2;
  const ease = easeOut(p * 3.5);
  const xOff = (1 - ease) * 65;

  ctx.save();

  // Glow
  const grd = ctx.createRadialGradient(W / 2, cy - 30, 0, W / 2, cy - 30, 180);
  grd.addColorStop(0, 'rgba(225,29,72,0.12)');
  grd.addColorStop(1, 'rgba(225,29,72,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, cy - 220, W, 440);

  // Counter
  ctx.textAlign = 'center';
  ctx.font = '700 12px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(225,29,72,0.75)';
  ctx.fillText(`${idx} / ${total}`, W / 2, 68);

  // Emoji
  ctx.font = '76px serif';
  ctx.fillText(act.emoji, W / 2 + xOff, cy - 35);

  // Text
  ctx.font = '700 30px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  const lines = wrapText(ctx, act.text, W - 110);
  const lh = 42;
  const startY = cy + 30;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2 + xOff * 0.4, startY + i * lh);
  });

  // Accent bar
  if (ease > 0.28) {
    const bw = Math.min((ease - 0.28) / 0.45, 1) * 110;
    const by = startY + lines.length * lh + 20;
    ctx.fillStyle = '#e11d48';
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 10;
    ctx.fillRect(W / 2 - bw / 2, by, bw, 3);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawOutro(ctx: CanvasRenderingContext2D, p: number, us: UserState) {
  const cy = H / 2;
  const ease = easeOut(Math.min(p * 2, 1));
  const yOff = (1 - ease) * 35;

  const totalHours = Math.round(Object.values(us.dailyHours || {}).reduce((a, b) => a + b, 0));
  const totalLoops = Object.values(us.dailyUvs || {}).reduce((a, b) => a + b, 0);

  ctx.save();
  ctx.textAlign = 'center';

  ctx.font = '700 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#e11d48';
  ctx.shadowColor = '#e11d48';
  ctx.shadowBlur = 6;
  ctx.fillText('MY NUMBERS', W / 2, cy - 185 + yOff);
  ctx.shadowBlur = 0;

  const stats = [
    { label: 'Day Streak', value: String(us.streak), emoji: '🔥' },
    { label: 'Hours Logged', value: String(totalHours), emoji: '⏱️' },
    { label: 'Growth Loops', value: String(totalLoops), emoji: '🔄' },
  ];

  stats.forEach((stat, i) => {
    const delay = i * 0.13;
    const sa = Math.min(Math.max((p - delay) / 0.28, 0), 1);
    if (sa <= 0) return;

    ctx.save();
    ctx.globalAlpha *= sa;

    const sy = cy - 105 + i * 98 + yOff;
    const px = 46;

    roundRect(ctx, px, sy, W - px * 2, 75, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();

    roundRect(ctx, px, sy, 4, 75, 2);
    ctx.fillStyle = '#e11d48';
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '30px serif';
    ctx.fillText(stat.emoji, px + 16, sy + 48);

    ctx.font = '700 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(stat.value, px + 60, sy + 40);

    ctx.font = '400 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(stat.label, px + 60, sy + 60);

    ctx.restore();
  });

  if (p > 0.68) {
    ctx.save();
    ctx.globalAlpha *= Math.min((p - 0.68) / 0.25, 1);
    ctx.textAlign = 'center';
    ctx.font = '700 17px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e11d48';
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 12;
    ctx.fillText('deadbydefault.com', W / 2, cy + 208 + yOff);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.restore();
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  totalDur: number,
  acts: Activity[],
  role: string,
  us: UserState,
) {
  drawBg(ctx);

  const slideCount = acts.length + 2;
  const rawIdx = elapsed / SLIDE_DUR;
  const slideIdx = Math.min(Math.floor(rawIdx), slideCount - 1);
  const slideElapsed = elapsed - slideIdx * SLIDE_DUR;
  const slideP = Math.min(slideElapsed / SLIDE_DUR, 1);

  let alpha = 1;
  if (slideElapsed < TRANS_DUR) {
    alpha = slideElapsed / TRANS_DUR;
  } else if (slideElapsed > SLIDE_DUR - TRANS_DUR) {
    alpha = (SLIDE_DUR - slideElapsed) / TRANS_DUR;
  }
  alpha = Math.max(0, Math.min(1, alpha));

  ctx.save();
  ctx.globalAlpha = alpha;

  if (slideIdx === 0) {
    drawIntro(ctx, slideP, role);
  } else if (slideIdx === slideCount - 1) {
    drawOutro(ctx, slideP, us);
  } else {
    const ai = slideIdx - 1;
    if (acts[ai]) drawActivity(ctx, slideP, acts[ai], ai + 1, acts.length);
  }

  ctx.restore();

  // Progress bar
  const pct = Math.min(elapsed / totalDur, 1);
  ctx.fillStyle = 'rgba(225,29,72,0.2)';
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = '#e11d48';
  ctx.shadowColor = '#e11d48';
  ctx.shadowBlur = 4;
  ctx.fillRect(0, H - 6, pct * W, 6);
  ctx.shadowBlur = 0;
}

export const VideoConverterScreen: React.FC<VideoConverterScreenProps> = ({ userState, currentUserName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const activitiesRef = useRef<Activity[]>([]);
  const roleRef = useRef<string>('');
  const userStateRef = useRef<UserState>(userState);

  const [recState, setRecState] = useState<'idle' | 'preview' | 'recording' | 'done'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [role, setRole] = useState(currentUserName || 'Builder');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newText, setNewText] = useState('');
  const [newEmoji, setNewEmoji] = useState('⚡');

  useEffect(() => { activitiesRef.current = activities; }, [activities]);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { userStateRef.current = userState; }, [userState]);

  useEffect(() => {
    const auto: Activity[] = [];
    if (userState.streak >= 3) {
      auto.push({ id: 'streak', text: `${userState.streak}-day consistency streak`, emoji: '🔥' });
    }
    if (userState.growthObjective) {
      auto.push({ id: 'obj', text: userState.growthObjective.slice(0, 55), emoji: '🎯' });
    }
    Object.entries(userState.dailyShipNote || {})
      .sort(([a], [b]) => b.localeCompare(a)).slice(0, 2)
      .forEach(([, note]) => {
        if (note && auto.length < 5) auto.push({ id: `s${Math.random()}`, text: note.slice(0, 55), emoji: '🚀' });
      });
    Object.entries(userState.dailyFirstNote || {})
      .sort(([a], [b]) => b.localeCompare(a)).slice(0, 3)
      .forEach(([, note]) => {
        if (note && auto.length < 6 && !auto.some(a => a.text.slice(0, 20) === note.slice(0, 20)))
          auto.push({ id: `n${Math.random()}`, text: note.slice(0, 55), emoji: '💡' });
      });
    if (auto.length === 0) {
      auto.push(
        { id: '1', text: 'Building in public', emoji: '🏗️' },
        { id: '2', text: 'Shipping every day', emoji: '🚀' },
        { id: '3', text: 'Growing consistently', emoji: '📈' },
      );
    }
    setActivities(auto.slice(0, 6));
  }, [userState]);

  const stopLoop = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }, []);

  const runLoop = useCallback((looping: boolean, onDone?: () => void) => {
    const tick = (ts: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const acts = activitiesRef.current;
      const totalDur = (acts.length + 2) * SLIDE_DUR;
      const raw = (ts - startRef.current) / 1000;
      const elapsed = looping ? raw % totalDur : Math.min(raw, totalDur);

      setProgress(elapsed / totalDur);
      renderFrame(ctx, elapsed, totalDur, acts, roleRef.current, userStateRef.current);

      if (!looping && raw >= totalDur) {
        onDone?.();
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    startRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const startPreview = useCallback(() => {
    stopLoop();
    setRecState('preview');
    runLoop(true);
  }, [stopLoop, runLoop]);

  const stopPreview = useCallback(() => {
    stopLoop();
    setRecState('idle');
    setProgress(0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, W, H);
      }
    }
  }, [stopLoop]);

  const startRecording = useCallback(() => {
    stopLoop();
    const canvas = canvasRef.current;
    if (!canvas) return;

    chunksRef.current = [];
    setDownloadUrl(null);
    setProgress(0);
    setRecState('recording');

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setDownloadUrl(URL.createObjectURL(blob));
      setRecState('done');
    };

    mr.start(100);
    runLoop(false, () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    });
  }, [stopLoop, runLoop]);

  const reset = useCallback(() => {
    stopLoop();
    setRecState('idle');
    setProgress(0);
    setDownloadUrl(null);
  }, [stopLoop]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const addActivity = () => {
    if (!newText.trim() || activities.length >= 6) return;
    setActivities(prev => [...prev, { id: String(Date.now()), text: newText.trim().slice(0, 55), emoji: newEmoji }]);
    setNewText('');
  };

  const removeActivity = (id: string) => setActivities(prev => prev.filter(a => a.id !== id));
  const totalSecs = (activities.length + 2) * SLIDE_DUR;

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-500">
      <div className="pt-2">
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Activity → Video</h2>
        <p className="text-xs text-gray-500 mt-0.5">Turn what you do into a shareable vertical video</p>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: 270, height: 480 }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ width: 270, height: 480, borderRadius: 14, border: '1px solid rgba(225,29,72,0.25)', display: 'block' }}
          />
          {recState === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.55)' }}>
              <button onClick={startPreview} className="flex flex-col items-center gap-2 text-white hover:text-brand transition-colors">
                <div className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center hover:border-brand transition-colors">
                  <Play size={22} className="ml-0.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Preview</span>
              </button>
            </div>
          )}
          {recState === 'preview' && (
            <button onClick={stopPreview} className="absolute top-2 right-2 bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
              <Square size={10} /> Stop
            </button>
          )}
          {recState === 'recording' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-white text-[11px] font-black uppercase tracking-widest">Recording</span>
              <span className="text-gray-400 text-[11px]">{Math.round(progress * 100)}%</span>
            </div>
          )}
          {recState === 'done' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-green-900/80 px-3 py-1.5 rounded-full">
              <Check size={12} className="text-green-400" />
              <span className="text-green-400 text-[11px] font-bold">Ready</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-600">{totalSecs}s video · {activities.length + 2} slides</p>

      {/* Role */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your Role</label>
        <input
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand/50"
          placeholder="Indie Hacker, Developer, Designer..."
        />
      </div>

      {/* Activities */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Activities ({activities.length}/6)</label>
        <div className="space-y-1.5">
          {activities.map((act, i) => (
            <div key={act.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <span className="text-base">{act.emoji}</span>
              <span className="flex-1 text-white text-xs truncate">{act.text}</span>
              <span className="text-[9px] text-gray-700 font-mono tabular-nums">#{i + 1}</span>
              <button onClick={() => removeActivity(act.id)} className="text-gray-700 hover:text-brand transition-colors ml-1">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {activities.length < 6 && (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  className={`text-base w-8 h-8 rounded flex items-center justify-center transition-colors ${newEmoji === e ? 'bg-brand/25 ring-1 ring-brand/50' : 'hover:bg-white/8'}`}>
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <span className="text-xl self-center">{newEmoji}</span>
              <input
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addActivity()}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand/50"
                placeholder="Add an activity..."
                maxLength={55}
              />
              <button onClick={addActivity} disabled={!newText.trim()}
                className="px-3 py-2 bg-brand/20 border border-brand/30 rounded-lg text-brand hover:bg-brand/30 disabled:opacity-30 transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        {(recState === 'idle' || recState === 'preview') && (
          <button
            onClick={() => { if (recState === 'preview') stopLoop(); startRecording(); }}
            className="w-full py-3 bg-brand text-white font-black uppercase tracking-widest rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-brand/90 active:scale-95 transition-all"
          >
            <Film size={17} />
            Generate Video
          </button>
        )}

        {recState === 'recording' && (
          <div className="w-full py-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center gap-3">
            <Loader size={15} className="animate-spin text-brand" />
            <span className="text-white text-sm font-bold">Generating… {Math.round(progress * 100)}%</span>
          </div>
        )}

        {recState === 'done' && downloadUrl && (
          <>
            <a
              href={downloadUrl}
              download="what-i-do.webm"
              className="w-full py-3 bg-brand text-white font-black uppercase tracking-widest rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-brand/90 active:scale-95 transition-all"
            >
              <Download size={17} />
              Download Video
            </a>
            <button onClick={reset}
              className="w-full py-2 border border-white/10 text-gray-500 font-bold uppercase tracking-widest rounded-lg text-xs hover:bg-white/5 transition-colors">
              Make Another
            </button>
          </>
        )}
      </div>

      <p className="text-[9px] text-gray-700 text-center pb-2">
        Exports as .webm · play in Chrome/Firefox or convert to MP4 with HandBrake
      </p>
    </div>
  );
};
