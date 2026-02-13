import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import { AppScreen, UserState, UserStats } from './types';
import { calculateCurrentStreak } from './lib/utils';
import { getGroups, getUserState, saveUserState, saveGroups, decodeGroupFromUrl, updateGroup, getDisplayName, setDisplayName, getFollowing, addFollowed, updateFollowed, decodeFollowProfileFromUrl, getFollowMeLink, getChallenges, getChallengeProgress } from './lib/storage';
import { GroupsScreen } from './components/GroupsScreen';
import { FeedScreen } from './components/FeedScreen';
import { DiscoveryScreen } from './components/DiscoveryScreen';
import { RefreshCw, X, Flame, Calendar, Award, ShieldCheck, Target, Terminal, Plus, Minus, BarChart3, TrendingUp, CheckCircle, Trash2, History, Check, Skull, User, Coffee, Moon, ArrowUp, Edit3, Globe, Zap, UserPlus, Copy, Trophy } from 'lucide-react';

const ChallengesBlock: React.FC<{ userState: UserState }> = ({ userState }) => {
  const challenges = getChallenges();
  return (
    <div className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-4">
      <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center space-x-2">
        <Trophy size={12} />
        <span>Weekly Challenges</span>
      </h3>
      <div className="space-y-3">
        {challenges.map(ch => {
          const progress = getChallengeProgress(ch, userState);
          const done = progress >= ch.target;
          return (
            <div key={ch.id} className={`p-3 rounded-2xl border ${done ? 'bg-brand/10 border-brand/30' : 'bg-black/40 border-white/5'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-white">{ch.name}</span>
                <span className={`text-[10px] font-black ${done ? 'text-brand' : 'text-gray-500'}`}>{progress}/{ch.target}</span>
              </div>
              <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${done ? 'bg-brand' : 'bg-gray-700'}`} style={{ width: `${Math.min(100, (progress / ch.target) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getHeatmapColor = (uvs: number, isFocus?: boolean, isShipped?: boolean) => {
  if (isFocus) return { backgroundColor: 'rgb(49, 46, 129)', border: '1px solid rgba(79, 70, 229, 0.4)', color: '#fff' };
  if (uvs === 0 && !isShipped) return { backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' };
  
  const maxIntensityVal = 15;
  const ratio = Math.min(1, uvs / maxIntensityVal);
  
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

const FrequencyMap: React.FC<{ data: { date: string, uvs: number, isFocus: boolean, isShipped: boolean, isToday?: boolean }[], columns?: number }> = ({ data, columns = 7 }) => (
  <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {data.map((day, idx) => (
      <div 
        key={idx} 
        className={`aspect-square rounded-lg transition-all duration-300 flex items-center justify-center relative overflow-hidden ${day.isToday ? 'ring-2 ring-brand animate-pulse-slow' : ''}`} 
        style={getHeatmapColor(day.uvs, day.isFocus, day.isShipped)}
      >
        {day.isFocus ? (
          <Coffee size={12} className="text-indigo-200" />
        ) : (
          <div className="flex flex-col items-center justify-center">
            {day.isShipped && (
              <Check className={`absolute top-0.5 right-0.5 ${getHeatmapColor(day.uvs, day.isFocus, day.isShipped).color === '#000' ? 'text-black' : 'text-white'}`} size={8} strokeWidth={4} />
            )}
            {day.uvs > 0 && <span className="text-[11px] font-black tabular-nums tracking-tighter leading-none">{day.uvs}</span>}
            {day.uvs === 0 && day.isShipped && <Check size={14} strokeWidth={4} />}
          </div>
        )}
      </div>
    ))}
  </div>
);

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.BASE);
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

  const handleSetHonorVow = (shipped: boolean, note?: string) => {
    const today = new Date().toLocaleDateString('en-CA');
    setUserState(prev => {
      const newShipped = { ...prev.dailyShipped, [today]: shipped };
      const prevNotes = prev.dailyShipNote || {};
      const newNotes = shipped && note
        ? { ...prevNotes, [today]: note }
        : shipped
        ? (() => { const { [today]: _, ...r } = prevNotes; return r; })()
        : (() => { const { [today]: _, ...r } = prevNotes; return r; })();
      return {
        ...prev,
        dailyShipped: newShipped,
        dailyShipNote: Object.keys(newNotes).length ? newNotes : undefined,
        streak: calculateCurrentStreak(prev.growthDates, prev.dailyInfrastructureFocus, newShipped),
      };
    });
  };

  const updateWebsite = (url: string) => {
    setUserState(prev => ({ ...prev, websiteUrl: url }));
  };

  const updateGrowthObjective = (objective: string) => {
    setUserState(prev => ({ ...prev, growthObjective: objective }));
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
    <Layout activeScreen={screen} onNavigate={setScreen}>
      <div className="relative min-h-full">
        {screen === AppScreen.BASE && (
          <BaseHub 
            userState={userState} 
            onUpdateLoops={updateDailyLoops}
            onSetHonorVow={handleSetHonorVow}
            onUpdateWebsite={updateWebsite}
            onUpdateObjective={updateGrowthObjective}
            onToggleInfra={(active) => {
              const today = new Date().toLocaleDateString('en-CA');
              setUserState(p => ({ 
                ...p, 
                isOnMaintenance: active, 
                dailyInfrastructureFocus: { ...p.dailyInfrastructureFocus, [today]: active },
                streak: calculateCurrentStreak(p.growthDates, { ...p.dailyInfrastructureFocus, [today]: active }, p.dailyShipped)
              }));
            }}
          />
        )}
        {screen === AppScreen.FEED && (
          <FeedScreen
            following={following}
            groups={groups}
            currentUserName={getDisplayName()}
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
        {screen === AppScreen.ACHIEVEMENTS && (
          <AchievementsDashboard userState={userState} />
        )}
        {screen === AppScreen.PROFILE && (
          <ProfileScreen userState={userState} />
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
  userState: UserState, 
  onUpdateLoops: (delta: number) => void,
  onSetHonorVow: (shipped: boolean, note?: string) => void,
  onUpdateWebsite: (url: string) => void,
  onUpdateObjective: (obj: string) => void,
  onToggleInfra: (active: boolean) => void
}> = ({ userState, onUpdateLoops, onSetHonorVow, onUpdateWebsite, onUpdateObjective, onToggleInfra }) => {
  const [showLogConfirm, setShowLogConfirm] = useState(false);
  const [shipNote, setShipNote] = useState('');
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [tempWebsite, setTempWebsite] = useState(userState.websiteUrl || '');
  const [tempObjective, setTempObjective] = useState(userState.growthObjective || 'INCREASE DAILY UNIQUE VISITORS');

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const todayLoops = userState.dailyUvs[todayStr] || 0;
  const todayShipped = userState.dailyShipped[todayStr] || false;

  const weekData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      days.push({ 
        date: dateStr, 
        uvs: userState.dailyUvs[dateStr] || 0,
        isFocus: !!userState.dailyInfrastructureFocus[dateStr],
        isShipped: !!userState.dailyShipped[dateStr],
        isToday: dateStr === todayStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
      });
    }
    return days;
  }, [userState.dailyUvs, userState.dailyInfrastructureFocus, userState.dailyShipped, todayStr]);

  const saveWebsite = () => {
    onUpdateWebsite(tempWebsite);
    setIsEditingWebsite(false);
  };

  const saveObjective = () => {
    const finalObj = tempObjective.trim() || 'INCREASE DAILY UNIQUE VISITORS';
    onUpdateObjective(finalObj.toUpperCase());
    setTempObjective(finalObj.toUpperCase());
    setIsEditingObjective(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-dark-card border border-brand/20 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-brand rounded-xl flex items-center space-x-2 shadow-lg border-2 border-white/10 group-hover:scale-105 transition-transform">
          <span className="text-xl font-black text-white italic tracking-tighter leading-none">{userState.streak}</span>
          <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">STREAK</span>
        </div>

        <div className="flex flex-col items-center space-y-4 pt-8">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase text-brand tracking-widest mb-1">Survival Pulse</p>
            <p className="text-[8px] font-bold text-gray-600 uppercase">Growth Heatmap</p>
          </div>
          
          <div className="grid grid-cols-7 gap-2 w-full p-4 bg-black/40 rounded-[24px] border border-white/5">
            {weekData.map((d, i) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <span className={`text-[8px] font-black uppercase ${d.isToday ? 'text-brand' : 'text-gray-600'}`}>{d.label}</span>
                <div 
                  className={`w-full aspect-square rounded-lg transition-all duration-300 flex items-center justify-center relative overflow-hidden ${d.isToday ? 'ring-2 ring-brand animate-pulse-slow shadow-[0_0_15px_rgba(225,29,72,0.3)]' : ''}`}
                  style={getHeatmapColor(d.uvs, d.isFocus, d.isShipped)}
                >
                  {d.isFocus ? (
                    <Coffee size={10} className="text-indigo-200" />
                  ) : (
                    <div className="relative flex items-center justify-center">
                      {d.isShipped && <Check className={`absolute -top-3 -right-3 ${getHeatmapColor(d.uvs, d.isFocus, d.isShipped).color === '#000' ? 'text-black' : 'text-white'}`} size={10} strokeWidth={4} />}
                      {d.uvs > 0 && <span className="text-[10px] font-black tabular-nums tracking-tighter">{d.uvs}</span>}
                      {d.uvs === 0 && d.isShipped && <Check size={14} strokeWidth={4} />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col items-center justify-center text-center relative ${
        userState.isOnMaintenance ? 'bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_30px_rgba(49,46,129,0.3)]' : 'bg-brand/5 border-brand/20'
      }`}>
        <div className="flex items-center space-x-2 mb-2">
          {userState.isOnMaintenance ? <Coffee className="text-indigo-400" size={16} /> : <TrendingUp className="text-brand" size={16} />}
          <span className={`text-[10px] font-black uppercase tracking-widest ${userState.isOnMaintenance ? 'text-indigo-400' : 'text-brand'}`}>
            {userState.isOnMaintenance ? 'Active Recovery' : 'Growth Objective'}
          </span>
        </div>
        
        <div className="w-full mb-2">
          {isEditingObjective && !userState.isOnMaintenance ? (
            <input 
              autoFocus
              className="w-full bg-transparent border-none outline-none text-2xl font-black italic tracking-tighter uppercase text-brand text-center leading-tight animate-in zoom-in-95"
              value={tempObjective}
              onChange={(e) => setTempObjective(e.target.value)}
              onBlur={saveObjective}
              onKeyDown={(e) => e.key === 'Enter' && saveObjective()}
            />
          ) : (
            <h2 
              onClick={() => !userState.isOnMaintenance && setIsEditingObjective(true)}
              className={`text-2xl font-black italic tracking-tighter uppercase text-white leading-tight ${!userState.isOnMaintenance ? 'cursor-pointer hover:text-brand transition-colors select-none' : ''}`}
            >
              {userState.isOnMaintenance ? 'Break Day' : (userState.growthObjective || 'INCREASE DAILY UNIQUE VISITORS')}
            </h2>
          )}
        </div>

        <div className="w-full px-4">
          {isEditingWebsite ? (
            <div className="flex items-center space-x-2 bg-black/60 p-1.5 rounded-2xl border border-white/10 w-full animate-in slide-in-from-top-2">
              <input 
                autoFocus
                type="text" 
                value={tempWebsite} 
                onChange={(e) => setTempWebsite(e.target.value)}
                onBlur={saveWebsite}
                onKeyDown={(e) => e.key === 'Enter' && saveWebsite()}
                placeholder="yourwebsite.com"
                className="flex-1 bg-transparent border-none outline-none text-[10px] font-bold text-white px-3 placeholder:text-gray-700"
              />
              <button onClick={saveWebsite} className="p-2 bg-brand/20 text-brand rounded-xl hover:bg-brand/40 transition-colors">
                <Check size={14} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditingWebsite(true)}
              className="group flex items-center justify-center space-x-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/5 hover:border-brand/40 hover:bg-brand/5 transition-all w-full max-w-[200px] mx-auto overflow-hidden"
            >
              {userState.websiteUrl ? (
                <>
                  <Globe size={10} className="text-brand/60 group-hover:text-brand" />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate group-hover:text-white transition-colors">{userState.websiteUrl.replace(/^https?:\/\//, '')}</span>
                  <Edit3 size={8} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              ) : (
                <>
                  <Plus size={10} className="text-brand/60" />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Add Website</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className={`bg-gradient-to-br from-dark-accent to-black p-6 rounded-[32px] text-center space-y-6 border border-brand/20 shadow-2xl transition-all duration-500 ${userState.isOnMaintenance ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center">
          <h3 className="text-white font-black text-xl italic uppercase tracking-tighter">Growth Terminal</h3>
          <div className="flex items-center space-x-1.5 bg-black px-3 py-1.5 rounded-full border border-brand/30">
            <Zap size={12} className="text-brand" />
            <span className="text-[10px] font-black text-brand">Live Volume</span>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center space-x-6 bg-black/60 p-4 rounded-3xl border border-white/5 w-full">
             <button 
              onClick={() => onUpdateLoops(-1)} 
              className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand hover:bg-brand/20 active:scale-90 transition-all"
             >
               <Minus size={20} />
             </button>
             
             <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">LOOPS TODAY</span>
                <span className="text-4xl font-black italic text-white tracking-tighter tabular-nums">{todayLoops}</span>
             </div>

             <button 
              onClick={() => onUpdateLoops(1)} 
              className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand hover:bg-brand/20 active:scale-90 transition-all"
             >
               <Plus size={20} />
             </button>
          </div>

          <button 
            className={`w-full py-6 rounded-2xl font-black uppercase tracking-widest border transition-all flex items-center justify-center space-x-3 shadow-xl active:scale-95 ${todayShipped ? 'bg-orange-600 border-orange-400 text-white' : 'bg-brand border-brand/30 text-white hover:bg-brand-dark'}`} 
            onClick={() => setShowLogConfirm(true)}
          >
            {todayShipped ? <CheckCircle size={24} /> : <ShieldCheck size={24} />}
            <span className="text-lg">{todayShipped ? 'Honor Code Kept' : 'Honor Code Entry'}</span>
          </button>
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest flex items-center justify-center space-x-1 italic">
            <span>Did you ship something</span>
            <ArrowUp size={12} strokeWidth={3} className="text-brand" />
          </p>
        </div>
      </div>

      <ChallengesBlock userState={userState} />

      <div className="flex justify-center pt-2">
        <button onClick={() => setShowBreakConfirm(true)} className={`px-8 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center space-x-2 shadow-2xl ${userState.isOnMaintenance ? 'bg-indigo-900 border-indigo-700 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-indigo-400/80'}`}>
          {userState.isOnMaintenance ? <Coffee size={14} /> : <Moon size={14} />}
          <span>{userState.isOnMaintenance ? 'End Break' : 'Take a Break'}</span>
        </button>
      </div>

      {showLogConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-dark-card border border-brand/50 p-8 rounded-[40px] shadow-2xl max-w-xs w-full text-center space-y-6 animate-in zoom-in-95">
            {todayShipped ? (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400"><RefreshCw size={32} /></div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase text-white">Revoke Vow?</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    Are you sure you want to undo your Honor Code status for today? This may impact your survival streak.
                  </p>
                </div>
                <div className="flex flex-col space-y-2">
                  <button onClick={() => { onSetHonorVow(false); setShowLogConfirm(false); }} className="w-full py-4 bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2">
                    <X size={16} strokeWidth={4} />
                    <span>Yes, Undo Status</span>
                  </button>
                  <button onClick={() => setShowLogConfirm(false)} className="w-full py-4 bg-white/5 text-gray-600 font-black uppercase text-[10px] rounded-2xl">Nevermind</button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand"><Skull size={32} /></div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase text-white">Survival Vow</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    Lying about growth leads to death. Did you actually complete your loops and ship something today?
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="What did you ship? (optional)"
                  value={shipNote}
                  onChange={(e) => setShipNote(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50"
                />
                <div className="flex flex-col space-y-2">
                  <button onClick={() => { onSetHonorVow(true, shipNote.trim() || undefined); setShowLogConfirm(false); setShipNote(''); }} className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2">
                    <Check size={16} strokeWidth={4} />
                    <span>Yes, I Shipped</span>
                  </button>
                  <button onClick={() => setShowLogConfirm(false)} className="w-full py-4 bg-white/5 text-gray-600 font-black uppercase text-[10px] rounded-2xl">Abort</button>
                </div>
              </>
            )}
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
                {userState.isOnMaintenance 
                  ? 'Ready to get back to the hunt? Survival depends on volume.' 
                  : 'Breaks are for maintenance. Ensure your systems are solid before resting.'}
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

const AchievementsDashboard: React.FC<{ userState: UserState }> = ({ userState }) => {
  const stats = userState.stats;

  return (
    <div className="space-y-8 pb-20 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col">
        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Acquisition Stats</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Growth Velocity Metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Globe className="text-brand" size={18} />} label="Total Units" value={stats.totalUniqueVisitors.toLocaleString()} desc="Lifetime Traffic" />
        <StatCard icon={<Flame className="text-brand" size={18} />} label="Streak" value={userState.streak} desc="Active Survival" />
        <StatCard icon={<Target className="text-brand" size={18} />} label="Avg Daily" value={stats.avgUvPerDay} desc="Acq Velocity" />
        <StatCard icon={<TrendingUp className="text-brand" size={18} />} label="Conv Rate" value={`${stats.conversionResilience}%`} desc="Efficiency" />
      </div>

      <div className="space-y-4">
        <h3 className="text-brand font-black text-xs uppercase px-1 tracking-widest flex items-center space-x-2">
          <Award size={14} />
          <span>Survival Milestones</span>
        </h3>
        <div className="space-y-3">
          {userState.achievements.map(ach => (
            <div key={ach.id} className={`p-5 rounded-3xl border transition-all ${ach.unlocked ? 'bg-dark-card border-brand/40 shadow-xl' : 'bg-black border-white/5 opacity-50'}`}>
              <div className="flex items-center space-x-4">
                <div className={`text-3xl w-14 h-14 flex items-center justify-center rounded-2xl bg-black border ${ach.unlocked ? 'border-brand shadow-md' : 'border-gray-800'}`}>{ach.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1"><h4 className="font-black text-white uppercase text-sm italic">{ach.title}</h4><span className="text-[10px] font-bold text-brand/80">{ach.progress}/{ach.target}</span></div>
                  <p className="text-[10px] text-gray-500 font-medium mb-3">{ach.description}</p>
                  <div className="w-full h-1 bg-black rounded-full overflow-hidden border border-white/5"><div className={`h-full transition-all duration-1000 ${ach.unlocked ? 'bg-brand' : 'bg-gray-800'}`} style={{ width: `${Math.min(100, (ach.progress / ach.target) * 100)}%` }}></div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileScreen: React.FC<{ userState: UserState }> = ({ userState }) => {
  type TimeFrame = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('MONTH');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [displayName, setDisplayNameState] = useState(getDisplayName);
  const [editingName, setEditingName] = useState(false);
  const [followLinkCopied, setFollowLinkCopied] = useState(false);

  const weekData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      days.push({ 
        date: dateStr, 
        uvs: userState.dailyUvs[dateStr] || 0,
        isFocus: !!userState.dailyInfrastructureFocus[dateStr],
        isShipped: !!userState.dailyShipped[dateStr],
        isToday: dateStr === now.toLocaleDateString('en-CA')
      });
    }
    return days;
  }, [userState.dailyUvs, userState.dailyInfrastructureFocus, userState.dailyShipped]);

  const monthData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      days.push({ 
        date: dateStr, 
        uvs: userState.dailyUvs[dateStr] || 0,
        isFocus: !!userState.dailyInfrastructureFocus[dateStr],
        isShipped: !!userState.dailyShipped[dateStr],
        isToday: dateStr === now.toLocaleDateString('en-CA')
      });
    }
    return days;
  }, [userState.dailyUvs, userState.dailyInfrastructureFocus, userState.dailyShipped]);

  const yearGroups = useMemo(() => {
    const years: Record<number, { name: string, days: any[] }[]> = {};
    const merged = Array.from(new Set([
      ...Object.keys(userState.dailyUvs), 
      ...Object.keys(userState.dailyInfrastructureFocus),
      ...Object.keys(userState.dailyShipped)
    ]));
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
          monthDays.push({ 
            date: dateStr, 
            uvs: userState.dailyUvs[dateStr] || 0,
            isFocus: !!userState.dailyInfrastructureFocus[dateStr],
            isShipped: !!userState.dailyShipped[dateStr]
          });
          d.setDate(d.getDate() + 1);
        }
        months.push({ name: monthName, days: monthDays });
      }
      years[y] = months;
    }
    return years;
  }, [userState.dailyUvs, userState.dailyInfrastructureFocus, userState.dailyShipped]);

  const yearsAvailable = Object.keys(yearGroups).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-4">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Profile</h3>
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Display name</p>
          {editingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setDisplayName(displayName), setEditingName(false))}
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white text-sm font-bold outline-none focus:border-brand/50"
                autoFocus
              />
              <button onClick={() => { setDisplayName(displayName); setEditingName(false); }} className="px-4 py-2 bg-brand text-white rounded-xl font-bold">Save</button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="text-white font-bold">{displayName}</button>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Let people follow you</p>
          <button
            onClick={() => {
              const link = getFollowMeLink(displayName, userState);
              navigator.clipboard.writeText(link);
              setFollowLinkCopied(true);
              setTimeout(() => setFollowLinkCopied(false), 2000);
            }}
            className="w-full py-3 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center space-x-2 text-brand font-bold hover:bg-brand/30 transition-colors"
          >
            {followLinkCopied ? <Check size={16} /> : <Copy size={16} />}
            <span>{followLinkCopied ? 'Copied!' : 'Copy follow link'}</span>
          </button>
          <p className="text-[9px] text-gray-500 mt-1">Share this link so others can follow your progress</p>
        </div>
      </div>
      <div className="flex flex-col">
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Field Analytics</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Consistency & Retention Metrics</p>
      </div>

      <div className="flex bg-dark-card border border-white/5 rounded-2xl p-1 shadow-inner">
        {(['WEEK', 'MONTH', 'YEAR', 'ALL'] as TimeFrame[]).map(tf => (
          <button 
            key={tf} 
            onClick={() => setTimeFrame(tf)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${timeFrame === tf ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="bg-dark-card border border-white/5 rounded-[32px] p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase text-brand/60 tracking-widest">Growth Presence</p>
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
            {timeFrame === 'WEEK' ? 'LAST 7 DAYS' : timeFrame === 'MONTH' ? 'CURRENT CYCLE' : timeFrame === 'YEAR' ? `${new Date().getFullYear()} OVERVIEW` : `HISTORICAL: ${selectedYear}`}
          </span>
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
              <div className="grid grid-cols-7 gap-2 text-center opacity-30">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <span key={i} className="text-[8px] font-black uppercase">{l}</span>)}
              </div>
              <FrequencyMap data={monthData} columns={7} />
            </div>
          )}
          {(timeFrame === 'YEAR' || timeFrame === 'ALL') && (
            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
              {(yearGroups[timeFrame === 'YEAR' ? new Date().getFullYear() : selectedYear] || []).map((m, idx) => (
                <div key={idx} className="space-y-2">
                  <span className="text-[8px] font-black text-brand/40 uppercase tracking-[0.2em] block text-center border-b border-white/5 pb-1">{m.name}</span>
                  <div className="grid grid-cols-7 gap-0.5">
                    {m.days.map((d, dIdx) => (
                       <div key={dIdx} className="aspect-square rounded-[1px] flex items-center justify-center relative overflow-hidden" style={getHeatmapColor(d.uvs, d.isFocus, d.isShipped)}>
                          {d.isFocus ? (
                             <Coffee size={4} className="text-indigo-200 opacity-50" />
                          ) : (
                             <div className="relative w-full h-full flex items-center justify-center">
                                {d.isShipped && <Check className={`absolute -top-1 -right-1 ${getHeatmapColor(d.uvs, d.isFocus, d.isShipped).color === '#000' ? 'text-black' : 'text-white'}`} size={6} strokeWidth={4} />}
                                {d.uvs > 0 && <span className="text-[6px] font-black tabular-nums scale-75 leading-none">{d.uvs}</span>}
                             </div>
                          )}
                        </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Flame className="text-brand" size={16} />} label="Streak" value={userState.streak} desc="Active Days" />
        <StatCard icon={<TrendingUp className="text-brand" size={16} />} label="Units Logged" value={userState.stats.totalUniqueVisitors.toLocaleString()} desc="Total Volume" />
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