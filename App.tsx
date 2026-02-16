import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import { AppScreen, UserState, UserStats } from './types';
import { calculateCurrentStreak } from './lib/utils';
import { getGroups, getUserState, saveUserState, saveGroups, decodeGroupFromUrl, updateGroup, getDisplayName, setDisplayName, getFollowing, addFollowed, updateFollowed, decodeFollowProfileFromUrl, getFollowMeLink } from './lib/storage';
import { GroupsScreen } from './components/GroupsScreen';
import { FeedSection } from './components/FeedScreen';
import { DiscoveryScreen } from './components/DiscoveryScreen';
import { RecordScreen } from './components/RecordScreen';
import { RefreshCw, X, Flame, Calendar, ShieldCheck, Target, Terminal, Plus, Minus, BarChart3, TrendingUp, CheckCircle, Trash2, History, Check, Skull, User, Coffee, ArrowUp, Edit3, Globe, Zap, UserPlus, Copy, Mic } from 'lucide-react';

const getHeatmapColor = (hours: number, isFocus?: boolean, hasActivity?: boolean) => {
  if (isFocus) return { backgroundColor: 'rgb(49, 46, 129)', border: '1px solid rgba(79, 70, 229, 0.4)', color: '#fff' };
  if (hours === 0 && !hasActivity) return { backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' };
  
  const maxIntensityVal = 8;
  const ratio = Math.min(1, hours / maxIntensityVal);
  
  const r = 225 + (255 - 225) * ratio;
  const g = 29 + (255 - 29) * ratio;
  const b = 72 + (255 - 72) * ratio;
  
  const bgColor = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  const textColor = ratio > 0.5 ? '#000' : '#fff';

  return {
    backgroundColor: bgColor,
    color: textColor,
    border: ratio > 0.8 ? '1px solid rgba(0,0,0,0.1)' : 'none',
    boxShadow: ratio > 0.8 ? `0 0 15px rgba(255,255,255,${ratio * 0.3})` : 'none'
  };
};

const FrequencyMap: React.FC<{ data: { date: string, hours: number, isFocus: boolean, firstNote?: string, isToday?: boolean }[], columns?: number }> = ({ data, columns = 7 }) => (
  <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {data.map((day, idx) => {
      const hasActivity = day.hours > 0;
      const style = getHeatmapColor(day.hours, day.isFocus, hasActivity);
      return (
        <div 
          key={idx} 
          className={`aspect-square rounded-lg transition-all duration-300 flex items-center justify-center relative overflow-visible group/cell cursor-default ${day.isToday ? 'ring-2 ring-brand animate-pulse-slow' : ''}`} 
          style={style}
        >
          {day.isFocus ? (
            <Coffee size={12} className="text-indigo-200" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              {(hasActivity || day.firstNote) && <span className="text-[11px] font-black tabular-nums tracking-tighter leading-none">{(day.hours || 0).toFixed(2)}</span>}
            </div>
          )}
          {day.firstNote && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1.5 rounded-lg bg-black/95 border border-white/10 shadow-xl opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 z-20 pointer-events-none whitespace-nowrap max-w-[140px] truncate text-[9px] text-white font-medium">
              {day.firstNote}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [userState, setUserState] = useState<UserState>(getUserState);
  const [groups, setGroups] = useState(() => getGroups());
  const [following, setFollowing] = useState(() => getFollowing());
  const [joinModal, setJoinModal] = useState<{ id: string; name: string; members: import('./types').GroupMember[] } | null>(null);
  const [followModal, setFollowModal] = useState<{ name: string; userState: import('./types').UserState } | null>(null);
  const [joinName, setJoinName] = useState('');

  useEffect(() => {
    saveUserState(userState);
  }, [userState]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const body = document.body;
    if (userState.isOnMaintenance) {
      meta?.setAttribute('content', '#1e1b4b');
      body.classList.remove('bg-gradient-red');
      body.classList.add('bg-gradient-indigo', 'break-mode');
    } else {
      meta?.setAttribute('content', '#000000');
      body.classList.remove('bg-gradient-indigo', 'break-mode');
      body.classList.add('bg-gradient-red');
    }
  }, [userState.isOnMaintenance]);

  useEffect(() => {
    const name = getDisplayName();
    const groups = getGroups();
    let updated = false;
    for (const g of Object.values(groups)) {
      const idx = g.members.findIndex(m => m.name === name);
      if (idx >= 0) {
        g.members[idx] = { ...g.members[idx], userState };
        updated = true;
      }
    }
    if (updated) {
      saveGroups(groups);
      setGroups({ ...getGroups() });
    }
  }, [userState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    const followCode = params.get('follow');
    if (joinCode) {
      const decoded = decodeGroupFromUrl(joinCode);
      if (decoded) {
        const groups = getGroups();
        const existing = groups[decoded.id];
        if (existing) {
          updateGroup(decoded.id, { members: decoded.members });
          setGroups(getGroups());
        } else {
          setJoinModal({ id: decoded.id, name: decoded.name, members: decoded.members });
        }
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (followCode) {
      const decoded = decodeFollowProfileFromUrl(followCode);
      if (decoded) {
        const following = getFollowing();
        const existing = Object.values(following).find(p => p.name === decoded.name);
        if (existing) {
          updateFollowed(existing.id, decoded.userState);
          setFollowing({ ...getFollowing() });
        } else {
          setFollowModal({ name: decoded.name, userState: decoded.userState });
        }
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const updateDailyLoops = (delta: number) => {
    const today = new Date().toLocaleDateString('en-CA');
    const isMorning = new Date().getHours() < 9;

    setUserState(prev => {
      const currentVal = prev.dailyUvs[today] || 0;
      const newVal = Math.max(0, currentVal + delta);
      
      const isAlreadyLoggedToday = prev.growthDates.includes(today);
      const newDates = isAlreadyLoggedToday ? prev.growthDates : [...prev.growthDates, today];
      const newDailyUvs = { ...prev.dailyUvs, [today]: newVal };
      
      const newStats = { ...prev.stats };
      newStats.totalUniqueVisitors += delta;
      if (isMorning && delta > 0) newStats.morningShipments += 1;

      return {
        ...prev,
        growthDates: newDates,
        dailyUvs: newDailyUvs,
        streak: calculateCurrentStreak(newDates, prev.dailyInfrastructureFocus, prev.dailyShipped),
        stats: newStats,
        isOnMaintenance: false
      };
    });
  };

  const handleSaveInputPost = (post: string) => {
    const today = new Date().toLocaleDateString('en-CA');
    const now = new Date().toISOString();
    setUserState(prev => ({
      ...prev,
      dailyInputPost: { ...(prev.dailyInputPost || {}), [today]: post },
      dailyPostTime: post.trim() ? { ...(prev.dailyPostTime || {}), [today]: now } : prev.dailyPostTime,
    }));
  };

  const simulateData = (daysCount: number) => {
    const datesToAdd: string[] = [];
    const uvsToAdd: Record<string, number> = {};
    const focusToAdd: Record<string, boolean> = {};
    const shippedToAdd: Record<string, boolean> = {};
    const now = new Date();
    
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const rand = Math.random();
      if (rand > 0.3) {
        datesToAdd.push(dateStr);
        uvsToAdd[dateStr] = Math.floor(Math.random() * 20) + 1;
        focusToAdd[dateStr] = false;
        shippedToAdd[dateStr] = Math.random() > 0.2;
      } else {
        uvsToAdd[dateStr] = 0;
        focusToAdd[dateStr] = Math.random() > 0.8;
        shippedToAdd[dateStr] = false;
      }
    }
    
    setUserState(prev => {
      const uniqueDates = Array.from(new Set([...prev.growthDates, ...datesToAdd]));
      const newFocus = { ...prev.dailyInfrastructureFocus, ...focusToAdd };
      const newShipped = { ...prev.dailyShipped, ...shippedToAdd };
      const streak = calculateCurrentStreak(uniqueDates, newFocus, newShipped);
      const newUvs = { ...prev.dailyUvs, ...uvsToAdd };
      const totalUvs = Object.values(newUvs).reduce((a: number, b: number) => a + b, 0);
      return { 
        ...prev, 
        growthDates: uniqueDates, 
        streak, 
        dailyUvs: newUvs,
        dailyInfrastructureFocus: newFocus,
        dailyShipped: newShipped,
        stats: { ...prev.stats, totalUniqueVisitors: totalUvs },
        achievements: prev.achievements.map(a => {
            let p = a.progress;
            if (a.id.startsWith('survival-')) p = Math.max(p, streak);
            if (a.id === 'uv-10k') p = totalUvs;
            return { ...a, progress: p, unlocked: p >= a.target };
        })
      };
    });
  };

  return (
    <Layout activeScreen={screen} onNavigate={setScreen} isOnBreak={userState.isOnMaintenance}>
      <div className="relative min-h-full">
        {screen === AppScreen.RECORD && (
          <RecordScreen userState={userState} onSave={handleSaveInputPost} onUpdateLoops={updateDailyLoops} onSaveSession={(hours, firstNote) => {
            const today = new Date().toLocaleDateString('en-CA');
            const now = new Date().toISOString();
            setUserState(p => ({
              ...p,
              dailyHours: { ...(p.dailyHours || {}), [today]: (p.dailyHours?.[today] || 0) + hours },
              dailyFirstNote: !p.dailyFirstNote?.[today] ? { ...(p.dailyFirstNote || {}), [today]: firstNote } : p.dailyFirstNote,
              dailyPostTime: { ...(p.dailyPostTime || {}), [today]: now },
            }));
          }} onToggleInfra={(active) => {
            const today = new Date().toLocaleDateString('en-CA');
            setUserState(p => ({ 
              ...p, 
              isOnMaintenance: active, 
              dailyInfrastructureFocus: { ...p.dailyInfrastructureFocus, [today]: active },
              streak: calculateCurrentStreak(p.growthDates, { ...p.dailyInfrastructureFocus, [today]: active }, p.dailyShipped)
            }));
          }} />
        )}
        {screen === AppScreen.HOME && (
          <BaseHub 
            userState={userState} 
            following={following}
            groups={groups}
            currentUserName={getDisplayName()}
            onUpdateLoops={updateDailyLoops}
          />
        )}
        {screen === AppScreen.DISCOVER && (
          <DiscoveryScreen
            groups={groups}
            following={following}
            onFollowingChange={setFollowing}
            currentUserName={getDisplayName()}
          />
        )}
        {screen === AppScreen.GROUPS && (
          <GroupsScreen
            groups={groups}
            onGroupsChange={setGroups}
            following={following}
            onFollowingChange={setFollowing}
            currentUserName={getDisplayName()}
            currentUserState={userState}
          />
        )}
        {screen === AppScreen.YOU && (
          <YouScreen userState={userState} onUpdateProfile={(bio, photo) => setUserState(p => ({ ...p, ...(bio !== undefined && { profileBio: bio }), ...(photo !== undefined && { profilePhoto: photo }) }))} />
        )}

        {joinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <div className="bg-dark-card border border-brand/50 p-8 rounded-[40px] shadow-2xl max-w-xs w-full text-center space-y-6">
              <h3 className="text-xl font-black italic uppercase text-white">Join {joinModal.name}?</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Enter your name to join this group</p>
              <input
                type="text"
                placeholder="Your name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50"
              />
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    if (!joinName.trim()) return;
                    const memberId = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
                    const newMember = { id: memberId, name: joinName.trim(), userState };
                    const updatedMembers = [...joinModal.members, newMember];
                    const allGroups = getGroups();
                    const existing = allGroups[joinModal.id];
                    if (existing) {
                      updateGroup(joinModal.id, { members: updatedMembers });
                    } else {
                      allGroups[joinModal.id] = {
                        id: joinModal.id,
                        name: joinModal.name,
                        members: updatedMembers,
                        createdAt: new Date().toISOString()
                      };
                      saveGroups(allGroups);
                    }
                    setDisplayName(joinName.trim());
                    setGroups({ ...getGroups() });
                    setJoinModal(null);
                    setJoinName('');
                    setScreen(AppScreen.GROUPS);
                  }}
                  disabled={!joinName.trim()}
                  className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl disabled:opacity-40"
                >
                  Join
                </button>
                <button onClick={() => { setJoinModal(null); setJoinName(''); }} className="w-full py-4 bg-white/5 text-gray-600 font-black uppercase text-[10px] rounded-2xl">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {followModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <div className="bg-dark-card border border-brand/50 p-8 rounded-[40px] shadow-2xl max-w-xs w-full text-center space-y-6">
              <h3 className="text-xl font-black italic uppercase text-white">Follow {followModal.name}?</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Add them to your following list to see their progress</p>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    const id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
                    addFollowed({ id, name: followModal.name, userState: followModal.userState });
                    setFollowing({ ...getFollowing() });
                    setFollowModal(null);
                    setScreen(AppScreen.GROUPS);
                  }}
                  className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl"
                >
                  Follow
                </button>
                <button onClick={() => setFollowModal(null)} className="w-full py-4 bg-white/5 text-gray-600 font-black uppercase text-[10px] rounded-2xl">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-24 right-4 z-50">
          <button onClick={() => setDevMenuOpen(!devMenuOpen)} className="w-10 h-10 bg-brand/20 backdrop-blur-md border border-brand/30 rounded-full flex items-center justify-center text-brand hover:bg-brand/40 shadow-lg transition-transform active:scale-90">
            <Terminal size={18} />
          </button>
          {devMenuOpen && (
            <div className="absolute bottom-12 right-0 w-52 bg-black/95 backdrop-blur-xl border border-brand/30 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[10px] font-black uppercase text-brand/50 px-2 py-1 border-b border-white/10 mb-2">Simulate Pipeline</p>
              <div className="px-2 mt-2 space-y-1">
                <button onClick={() => { simulateData(30); setDevMenuOpen(false); }} className="w-full text-left p-2 hover:bg-brand/10 rounded-xl text-[10px] font-bold text-brand flex items-center space-x-2">
                  <Calendar size={12} /><span>Seed 30 Days</span>
                </button>
                <button onClick={() => { simulateData(365); setDevMenuOpen(false); }} className="w-full text-left p-2 hover:bg-brand/10 rounded-xl text-[10px] font-bold text-brand flex items-center space-x-2">
                  <History size={12} /><span>Seed full year</span>
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-left p-2 hover:bg-red-900/20 rounded-xl text-[10px] font-bold text-red-500 flex items-center space-x-2">
                  <Trash2 size={12} /><span>Full System Wipe</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const BaseHub: React.FC<{ 
  userState: UserState;
  following: Record<string, import('./types').FollowedPerson>;
  groups: Record<string, import('./types').Group>;
  currentUserName: string;
  onUpdateLoops: (delta: number) => void;
}> = ({ userState, following, groups, currentUserName, onUpdateLoops }) => {
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const weekData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const post = userState.dailyInputPost?.[dateStr];
      const firstNote = userState.dailyFirstNote?.[dateStr] || (post ? post.split(/\n/)[0]?.trim().slice(0, 80) : undefined);
      days.push({ 
        date: dateStr, 
        hours: userState.dailyHours?.[dateStr] ?? (userState.dailyUvs?.[dateStr] ? userState.dailyUvs[dateStr] * 0.5 : 0),
        isFocus: !!userState.dailyInfrastructureFocus[dateStr],
        firstNote,
        isToday: dateStr === todayStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
      });
    }
    return days;
  }, [userState.dailyHours, userState.dailyInfrastructureFocus, userState.dailyFirstNote, userState.dailyInputPost, todayStr]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-dark-card border border-brand/20 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group/card">
        <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-brand rounded-xl flex items-center space-x-2 shadow-lg border-2 border-white/10 group-hover/card:scale-105 transition-transform">
          <span className="text-xl font-black text-white italic tracking-tighter leading-none">{userState.streak}</span>
          <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">STREAK</span>
        </div>

        <div className="flex flex-col items-center space-y-4 pt-8">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase text-brand tracking-widest mb-1">Survival Pulse</p>
            <p className="text-[8px] font-bold text-gray-600 uppercase">Growth Heatmap</p>
          </div>
          
          <div className="grid grid-cols-7 gap-2 w-full p-4 bg-black/40 rounded-[24px] border border-white/5">
            {weekData.map((d, i) => {
              const hasActivity = d.hours > 0 || !!d.firstNote;
              const style = getHeatmapColor(d.hours, d.isFocus, hasActivity);
              return (
                <div key={i} className="flex flex-col items-center space-y-2">
                  <span className={`text-[8px] font-black uppercase ${d.isToday ? 'text-brand' : 'text-gray-600'}`}>{d.label}</span>
                  <div 
                    className={`w-full aspect-square rounded-lg transition-all duration-300 flex items-center justify-center relative overflow-visible group/cell cursor-default ${d.isToday ? 'ring-2 ring-brand animate-pulse-slow shadow-[0_0_15px_rgba(225,29,72,0.3)]' : ''}`}
                    style={style}
                  >
                    {d.isFocus ? (
                      <Coffee size={10} className="text-indigo-200" />
                    ) : (
                      <div className="relative flex items-center justify-center">
                        {(hasActivity || d.firstNote) && <span className="text-[10px] font-black tabular-nums tracking-tighter">{(d.hours || 0).toFixed(2)}</span>}
                      </div>
                    )}
                    {d.firstNote && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1.5 rounded-lg bg-black/95 border border-white/10 shadow-xl opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 z-20 pointer-events-none whitespace-nowrap max-w-[140px] truncate text-[9px] text-white font-medium">
                        {d.firstNote}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Activity</h3>
        <FeedSection following={following} groups={groups} currentUserName={currentUserName} currentUserState={userState} compact />
      </div>
    </div>
  );
};

const YouScreen: React.FC<{ userState: UserState; onUpdateProfile: (bio?: string, photo?: string) => void }> = ({ userState, onUpdateProfile }) => {
  type TimeFrame = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTH');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [displayName, setDisplayNameState] = useState(getDisplayName);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(userState.profileBio || '');
  const [followLinkCopied, setFollowLinkCopied] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const weekData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const post = userState.dailyInputPost?.[dateStr];
      const firstNote = userState.dailyFirstNote?.[dateStr] || (post ? post.split(/\n/)[0]?.trim().slice(0, 80) : undefined);
      days.push({ date: dateStr, hours: userState.dailyHours?.[dateStr] ?? (userState.dailyUvs?.[dateStr] ? userState.dailyUvs[dateStr] * 0.5 : 0), isFocus: !!userState.dailyInfrastructureFocus[dateStr], firstNote, isToday: dateStr === now.toLocaleDateString('en-CA') });
    }
    return days;
  }, [userState.dailyHours, userState.dailyInfrastructureFocus, userState.dailyFirstNote, userState.dailyInputPost]);

  const monthData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const post = userState.dailyInputPost?.[dateStr];
      const firstNote = userState.dailyFirstNote?.[dateStr] || (post ? post.split(/\n/)[0]?.trim().slice(0, 80) : undefined);
      days.push({ date: dateStr, hours: userState.dailyHours?.[dateStr] ?? (userState.dailyUvs?.[dateStr] ? userState.dailyUvs[dateStr] * 0.5 : 0), isFocus: !!userState.dailyInfrastructureFocus[dateStr], firstNote, isToday: dateStr === now.toLocaleDateString('en-CA') });
    }
    return days;
  }, [userState.dailyHours, userState.dailyInfrastructureFocus, userState.dailyFirstNote, userState.dailyInputPost]);

  const yearGroups = useMemo(() => {
    const years: Record<number, { name: string, days: any[] }[]> = {};
    const merged = Array.from(new Set([...Object.keys(userState.dailyHours || {}), ...Object.keys(userState.dailyInfrastructureFocus), ...Object.keys(userState.dailyFirstNote || {})]));
    const startYear = merged.length > 0 ? Math.min(...merged.map(d => new Date(d).getFullYear())) : new Date().getFullYear();
    const endYear = new Date().getFullYear();
    for (let y = endYear; y >= startYear; y--) {
      const months = [];
      for (let m = 0; m < 12; m++) {
        const monthDays = [];
        const d = new Date(y, m, 1);
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        while (d.getMonth() === m) {
          const dateStr = d.toLocaleDateString('en-CA');
          const post = userState.dailyInputPost?.[dateStr];
          const firstNote = userState.dailyFirstNote?.[dateStr] || (post ? post.split(/\n/)[0]?.trim().slice(0, 80) : undefined);
          monthDays.push({ date: dateStr, hours: userState.dailyHours?.[dateStr] ?? (userState.dailyUvs?.[dateStr] ? userState.dailyUvs[dateStr] * 0.5 : 0), isFocus: !!userState.dailyInfrastructureFocus[dateStr], firstNote });
          d.setDate(d.getDate() + 1);
        }
        months.push({ name: monthName, days: monthDays });
      }
      years[y] = months;
    }
    return years;
  }, [userState.dailyHours, userState.dailyInfrastructureFocus, userState.dailyFirstNote, userState.dailyInputPost]);

  const yearsAvailable = Object.keys(yearGroups).map(Number).sort((a, b) => b - a);
  const stats = userState.stats;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Profile</h3>
          <button onClick={() => { if (editingProfile) { setEditingName(false); setEditingBio(false); setEditingProfile(false); } else { setBioInput(userState.profileBio || ''); setEditingProfile(true); } }} className="px-4 py-1.5 rounded-full border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-colors">
            {editingProfile ? 'Done' : 'Edit profile'}
          </button>
        </div>
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => editingProfile && photoInputRef.current?.click()} className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-black/60 border overflow-hidden flex items-center justify-center transition-colors ${editingProfile ? 'border-brand/30 hover:border-brand/50 cursor-pointer' : 'border-white/10 cursor-default'}`}>
            {userState.profilePhoto ? (
              <img src={userState.profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-gray-600" />
            )}
          </button>
          <input type="file" ref={photoInputRef} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => onUpdateProfile(userState.profileBio, r.result as string); r.readAsDataURL(f); } e.target.value = ''; }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Name</p>
            {editingProfile && editingName ? (
              <div className="flex gap-2">
                <input type="text" value={displayName} onChange={(e) => setDisplayNameState(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setDisplayName(displayName), setEditingName(false))} className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white text-sm font-bold outline-none focus:border-brand/50" autoFocus />
                <button onClick={() => { setDisplayName(displayName); setEditingName(false); }} className="px-4 py-2 bg-brand text-white rounded-xl font-bold">Save</button>
              </div>
            ) : (
              <button onClick={() => editingProfile && setEditingName(true)} className={`text-white font-bold ${!editingProfile && 'cursor-default'}`}>{displayName}</button>
            )}
            {editingProfile && <p className="text-[9px] text-gray-500 mt-1">Tap photo to change</p>}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Bio</p>
          {editingProfile && editingBio ? (
            <div className="space-y-2">
              <textarea value={bioInput} onChange={(e) => setBioInput(e.target.value.slice(0, 120))} maxLength={120} rows={3} placeholder="A short line about you..." className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50 resize-none" autoFocus />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500">{bioInput.length}/120</span>
                <div className="flex gap-2">
                  <button onClick={() => { setBioInput(userState.profileBio || ''); setEditingBio(false); }} className="px-3 py-1.5 bg-white/5 text-gray-500 rounded-lg text-xs font-bold">Cancel</button>
                  <button onClick={() => { onUpdateProfile(bioInput.trim() || undefined, userState.profilePhoto); setEditingBio(false); }} className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold">Save</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => editingProfile && (setBioInput(userState.profileBio || ''), setEditingBio(true))} className={`w-full text-left py-2 px-0 ${!editingProfile && 'cursor-default'}`}>
              {userState.profileBio ? <span className="text-gray-300 text-sm">{userState.profileBio}</span> : <span className="text-gray-500 text-sm italic">{editingProfile ? 'Add a short bio...' : 'No bio yet'}</span>}
            </button>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Let people follow you</p>
          <button onClick={() => { const link = getFollowMeLink(displayName, userState); navigator.clipboard.writeText(link); setFollowLinkCopied(true); setTimeout(() => setFollowLinkCopied(false), 2000); }} className="w-full py-3 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center space-x-2 text-brand font-bold hover:bg-brand/30 transition-colors">
            {followLinkCopied ? <Check size={16} /> : <Copy size={16} />}
            <span>{followLinkCopied ? 'Copied!' : 'Copy follow link'}</span>
          </button>
          <p className="text-[9px] text-gray-500 mt-1">Share this link so others can follow your progress</p>
        </div>
      </div>

      <div className="flex flex-col">
        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Field Analytics</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Consistency & Retention Metrics</p>
      </div>

      <div className="flex bg-dark-card border border-white/5 rounded-2xl p-1 shadow-inner">
        {(['WEEK', 'MONTH', 'YEAR', 'ALL'] as TimeFrame[]).map(tf => (
          <button key={tf} onClick={() => setTimeFrame(tf)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${timeFrame === tf ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>{tf}</button>
        ))}
      </div>

      <div className="bg-dark-card border border-white/5 rounded-[32px] p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase text-brand/60 tracking-widest">Growth Presence</p>
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">{timeFrame === 'WEEK' ? 'LAST 7 DAYS' : timeFrame === 'MONTH' ? 'CURRENT CYCLE' : timeFrame === 'YEAR' ? `${new Date().getFullYear()} OVERVIEW` : `HISTORICAL: ${selectedYear}`}</span>
        </div>
        {timeFrame === 'ALL' && (
          <div className="flex items-center space-x-2 py-1 overflow-x-auto no-scrollbar mask-fade-edges">
            {yearsAvailable.map(year => (
              <button key={year} onClick={() => setSelectedYear(year)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${selectedYear === year ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-white/5 text-white/30 border border-transparent'}`}>{year}</button>
            ))}
          </div>
        )}
        <div className="animate-in fade-in duration-300">
          {timeFrame === 'WEEK' && <FrequencyMap data={weekData} columns={7} />}
          {timeFrame === 'MONTH' && (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-center opacity-30">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <span key={i} className="text-[8px] font-black uppercase">{l}</span>)}</div>
              <FrequencyMap data={monthData} columns={7} />
            </div>
          )}
          {(timeFrame === 'YEAR' || timeFrame === 'ALL') && (
            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
              {(yearGroups[timeFrame === 'YEAR' ? new Date().getFullYear() : selectedYear] || []).map((m, idx) => (
                <div key={idx} className="space-y-2">
                  <span className="text-[8px] font-black text-brand/40 uppercase tracking-[0.2em] block text-center border-b border-white/5 pb-1">{m.name}</span>
                  <div className="grid grid-cols-7 gap-0.5">
                    {m.days.map((d, dIdx) => {
                        const hasActivity = (d.hours || 0) > 0 || !!d.firstNote;
                        const style = getHeatmapColor(d.hours || 0, d.isFocus, hasActivity);
                        return (
                      <div key={dIdx} className="aspect-square rounded-[1px] flex items-center justify-center relative overflow-visible group/cell cursor-default" style={style}>
                        {d.isFocus ? <Coffee size={4} className="text-indigo-200 opacity-50" /> : (
                          <div className="relative w-full h-full flex items-center justify-center">
                            {(hasActivity || d.firstNote) && <span className="text-[6px] font-black tabular-nums scale-75 leading-none">{(d.hours || 0).toFixed(2)}</span>}
                          </div>
                        )}
                        {d.firstNote && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 px-1.5 py-1 rounded bg-black/95 border border-white/10 shadow-xl opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 z-20 pointer-events-none max-w-[80px] text-[5px] text-white font-medium text-center leading-tight line-clamp-2">
                            {d.firstNote}
                          </div>
                        )}
                      </div>
                        );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Globe className="text-brand" size={18} />} label="Total Units" value={stats.totalUniqueVisitors.toLocaleString()} desc="Lifetime Traffic" />
        <StatCard icon={<Flame className="text-brand" size={18} />} label="Streak" value={userState.streak} desc="Active Survival" />
        <StatCard icon={<Target className="text-brand" size={18} />} label="Avg Daily" value={stats.avgUvPerDay} desc="Acq Velocity" />
        <StatCard icon={<TrendingUp className="text-brand" size={18} />} label="Conv Rate" value={`${stats.conversionResilience}%`} desc="Efficiency" />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, desc: string }> = ({ icon, label, value, desc }) => (
  <div className="bg-dark-card p-5 rounded-3xl border border-white/5 shadow-xl transition-all group">
    <div className="flex items-center space-x-2 mb-3">
      <div className="p-2 bg-black rounded-xl border border-brand/10 group-hover:bg-brand/20 transition-colors">{icon}</div>
      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-3xl font-black text-white italic tracking-tighter mb-1">{value}</div>
    <div className="text-[8px] text-gray-600 font-black uppercase tracking-widest">{desc}</div>
  </div>
);

export default App;