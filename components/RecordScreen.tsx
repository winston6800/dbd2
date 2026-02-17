import React, { useState, useEffect, useRef } from 'react';
import { CircleDot, Zap, Play, Square, Pause, Check, Coffee, Moon, Flag } from 'lucide-react';
import type { UserState } from '../types';

interface RecordScreenProps {
  userState: UserState;
  onSave: (post: string) => void;
  onUpdateLoops: (delta: number) => void;
  onSaveSession: (hours: number, firstNote: string) => void;
  onToggleInfra: (active: boolean) => void;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({ userState, onSave, onUpdateLoops, onSaveSession, onToggleInfra }) => {
  const today = new Date().toLocaleDateString('en-CA');
  const [post, setPost] = useState(userState.dailyInputPost?.[today] || '');
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);

  const todayLoops = userState.dailyUvs[today] || 0;

  type SessionPhase = 'idle' | 'running' | 'paused' | 'recording';
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('idle');
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0);
  const [startAnimating, setStartAnimating] = useState(false);
  const stopwatchRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionPhase === 'running') {
      stopwatchRef.current = window.setInterval(() => {
        setStopwatchElapsed(s => s + 1);
      }, 1000);
    }
    return () => {
      if (stopwatchRef.current) {
        clearInterval(stopwatchRef.current);
        stopwatchRef.current = null;
      }
    };
  }, [sessionPhase]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setStartAnimating(true);
    setTimeout(() => {
      setSessionPhase('running');
      setStartAnimating(false);
    }, 400);
  };

  const handlePause = () => setSessionPhase('paused');

  const handleResume = () => setSessionPhase('running');

  const handleFinish = () => setSessionPhase('recording');

  const handleRecordSubmit = () => {
    if (!post.trim()) return;
    const hours = Math.round((stopwatchElapsed / 3600) * 100) / 100;
    const firstNote = post.trim().split(/\n/)[0]?.trim() || post.trim().slice(0, 80);
    onSave(post.trim());
    onUpdateLoops(1);
    onSaveSession(hours, firstNote);
    setStopwatchElapsed(0);
    setSessionPhase('idle');
  };

  // Only sync from storage on mount and when date changes — avoid overwriting while typing
  useEffect(() => {
    setPost(userState.dailyInputPost?.[today] || '');
  }, [today]);

  const postRef = useRef(post);
  postRef.current = post;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Debounced autosave when post changes
  useEffect(() => {
    const id = setTimeout(() => {
      onSaveRef.current(post.trim());
    }, 500);
    return () => clearTimeout(id);
  }, [post]);

  // Save on unmount (e.g. navigating away) so nothing is lost
  useEffect(() => {
    return () => {
      onSaveRef.current(postRef.current.trim());
    };
  }, []);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {(sessionPhase === 'running' || sessionPhase === 'paused') && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black overflow-y-auto">
          <div className="w-full max-w-sm flex flex-col items-center space-y-5 animate-in fade-in duration-300">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-white font-black text-xl italic uppercase tracking-tighter">
                {sessionPhase === 'running' ? 'Recording' : 'Stopped'}
              </h3>
              <div className="flex items-center space-x-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-brand/30">
                <Zap size={12} className="text-brand" />
                <span className="text-[10px] font-black text-brand">{todayLoops} today</span>
              </div>
            </div>
            <div className="text-5xl font-black italic text-white tracking-tighter tabular-nums font-mono">
              {formatTime(stopwatchElapsed)}
            </div>
            <div className="w-full px-1 py-2 rounded-xl bg-brand/10 border border-brand/20 text-center">
              <p className="text-sm font-bold text-white leading-snug">What&apos;s the most important thing you can do and why aren&apos;t you doing it?</p>
            </div>
            <div className="w-full space-y-2 text-left">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Today&apos;s Inputs</p>
              <textarea
                placeholder="What are you working on?"
                value={post}
                onChange={(e) => setPost(e.target.value.slice(0, 160))}
                maxLength={160}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50 resize-none"
              />
              <p className={`text-right text-[10px] font-bold tabular-nums ${post.length >= 140 ? 'text-brand' : 'text-gray-500'}`}>{post.length}/160</p>
            </div>
            {sessionPhase === 'running' ? (
              <button onClick={handlePause} className="w-full py-4 rounded-2xl bg-brand text-white font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl hover:bg-brand-dark transition-colors">
                <Pause size={20} fill="currentColor" />
                <span>Pause</span>
              </button>
            ) : (
              <div className="flex gap-3 w-full">
                <button onClick={handleResume} className="flex-1 py-4 rounded-2xl bg-brand text-white font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl hover:bg-brand-dark transition-colors">
                  <Play size={18} fill="currentColor" />
                  <span>Resume</span>
                </button>
                <button onClick={handleFinish} className="flex-1 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl border border-white/20 hover:bg-gray-100 transition-colors">
                  <Flag size={18} />
                  <span>Finish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col">
        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Record</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Daily inputs → community feed</p>
      </div>

      <div className={`bg-dark-card border border-brand/20 rounded-2xl p-5 text-left ${userState.isOnMaintenance ? 'opacity-40' : ''}`}>
        <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-2">Before you start</p>
        <p className="text-white font-bold text-lg leading-snug">
          What&apos;s the most important thing you can do and why aren&apos;t you doing it?
        </p>
      </div>

      <div className={`bg-gradient-to-br from-dark-accent to-black p-6 rounded-[32px] text-center space-y-6 border border-brand/20 shadow-2xl transition-all duration-500 ${userState.isOnMaintenance ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-white font-black text-xl italic uppercase tracking-tighter">Session</h3>
          <div className="flex items-center space-x-1.5 bg-black px-3 py-1.5 rounded-full border border-brand/30">
            <Zap size={12} className="text-brand" />
            <span className="text-[10px] font-black text-brand">{todayLoops} today</span>
          </div>
        </div>
        <div className="flex flex-col items-center space-y-6">
          <div className="text-5xl font-black italic text-white tracking-tighter tabular-nums font-mono">
            {formatTime(stopwatchElapsed)}
          </div>
          <button onClick={handleStart} className={`w-24 h-24 rounded-full bg-brand text-white flex items-center justify-center shadow-2xl hover:bg-brand-dark transition-colors active:scale-95 ${startAnimating ? 'animate-start-pulse' : ''}`}>
            <Play size={36} fill="currentColor" className="ml-1" />
          </button>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button onClick={() => setShowBreakConfirm(true)} className={`px-8 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center space-x-2 shadow-2xl ${userState.isOnMaintenance ? 'bg-indigo-900 border-indigo-700 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-indigo-400/80'}`}>
          {userState.isOnMaintenance ? <Coffee size={14} /> : <Moon size={14} />}
          <span>{userState.isOnMaintenance ? 'End Break' : 'Take a Break'}</span>
        </button>
      </div>

      {sessionPhase === 'idle' && (
        <div className="bg-dark-card border border-brand/20 rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
              <CircleDot size={24} className="text-brand" />
            </div>
            <div>
              <h3 className="text-white font-bold">Today&apos;s Inputs</h3>
              <p className="text-[10px] text-gray-500">{today}</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            What did you work on? Loops, ships, conversations. Saved to the feed.
          </p>
          <div className="space-y-1">
            <textarea
              placeholder="e.g. 5 loops, shipped landing page, 3 customer calls..."
              value={post}
              onChange={(e) => setPost(e.target.value.slice(0, 160))}
              maxLength={160}
              rows={6}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50 resize-none"
            />
            <p className={`text-right text-[10px] font-bold tabular-nums ${post.length >= 140 ? 'text-brand' : 'text-gray-500'}`}>
              {post.length}/160
            </p>
          </div>
          <p className="text-[10px] text-gray-500 italic">Auto-saved as you type</p>
        </div>
      )}

      {sessionPhase === 'recording' && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black">
          <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Session complete</p>
              <h3 className="text-xl font-black italic uppercase text-white">What did you do?</h3>
              <p className="text-[10px] text-gray-500">Write it down before you continue</p>
            </div>
            <textarea
              placeholder="e.g. 5 loops, shipped landing page, 3 customer calls..."
              value={post}
              onChange={(e) => setPost(e.target.value.slice(0, 160))}
              maxLength={160}
              rows={5}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50 resize-none"
              autoFocus
            />
            <p className="text-[10px] text-gray-500 text-right">{post.length}/160</p>
            <button
              onClick={handleRecordSubmit}
              disabled={!post.trim()}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors ${post.trim() ? 'bg-brand text-white shadow-xl hover:bg-brand-dark cursor-pointer' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
            >
              <Check size={20} strokeWidth={3} />
              <span>Save & Continue</span>
            </button>
          </div>
        </div>
      )}

      {showBreakConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-dark-card border border-indigo-500/50 p-8 rounded-[40px] shadow-2xl max-w-xs w-full text-center space-y-6 animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400"><Coffee size={32} /></div>
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase text-white">{userState.isOnMaintenance ? 'Resume Ops?' : 'Initiate Break?'}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                {userState.isOnMaintenance ? 'Ready to get back to the hunt? Survival depends on volume.' : 'Breaks are for maintenance. Ensure your systems are solid before resting.'}
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <button onClick={() => { onToggleInfra(!userState.isOnMaintenance); setShowBreakConfirm(false); }} className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg">
                {userState.isOnMaintenance ? 'End Break' : 'Start Break'}
              </button>
              <button onClick={() => setShowBreakConfirm(false)} className="w-full py-4 bg-white/5 text-gray-600 font-black uppercase text-[10px] rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
