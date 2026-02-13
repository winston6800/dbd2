import React, { useState } from 'react';
import { Users, Plus, Link2, Copy, Check, X, Flame, CheckCircle, Coffee, UserPlus } from 'lucide-react';
import type { Group, FollowedPerson } from '../types';
import { createGroup, getGroups, getJoinLink, updateGroup, removeFollowed, getFollowing } from '../lib/storage';
import { calculateCurrentStreak } from '../lib/utils';

interface GroupsScreenProps {
  groups: Record<string, Group>;
  onGroupsChange: (groups: Record<string, Group>) => void;
  following: Record<string, FollowedPerson>;
  onFollowingChange: (f: Record<string, FollowedPerson>) => void;
  currentUserName: string;
  currentUserState: import('../types').UserState;
}

const MemberCard: React.FC<{
  name: string;
  userState: import('../types').UserState;
  onRemove?: () => void;
}> = ({ name, userState, onRemove }) => {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const streak = calculateCurrentStreak(userState.growthDates, userState.dailyInfrastructureFocus, userState.dailyShipped);
  const shipped = !!userState.dailyShipped[todayStr];
  const isBreak = !!userState.isOnMaintenance;
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand font-black text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-bold">{name}</p>
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="flex items-center space-x-1 text-brand">
              <Flame size={10} />
              <span>{streak}d streak</span>
            </span>
            {shipped && <span className="flex items-center text-green-500"><CheckCircle size={10} /> Shipped</span>}
            {isBreak && <span className="flex items-center text-indigo-400"><Coffee size={10} /> Break</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-[10px] font-black text-gray-500">{userState.stats.totalUniqueVisitors} loops</span>
        {onRemove && (
          <button onClick={onRemove} className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10" title="Unfollow">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export const GroupsScreen: React.FC<GroupsScreenProps> = ({
  groups,
  onGroupsChange,
  following,
  onFollowingChange,
  currentUserName,
  currentUserState
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  const groupList = Object.values(groups);
  const followingList = Object.values(following);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup(newGroupName.trim(), currentUserName, currentUserState);
    onGroupsChange(getGroups());
    setNewGroupName('');
    setShowCreate(false);
  };

  const handleCopyLink = (group: Group) => {
    const link = getJoinLink(group);
    navigator.clipboard.writeText(link);
    setCopiedGroupId(group.id);
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col">
        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Groups & Following</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Groups and people you follow</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center space-x-2">
          <UserPlus size={12} />
          <span>Following</span>
        </h3>
        {followingList.length === 0 ? (
          <div className="bg-dark-card border border-white/5 rounded-3xl p-6 text-center">
            <UserPlus size={28} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm font-bold">No one yet</p>
            <p className="text-gray-600 text-[10px] mt-1">Visit someone&apos;s follow link or share yours from Profile</p>
          </div>
        ) : (
          <div className="space-y-2">
            {followingList.map(p => (
              <MemberCard
                key={p.id}
                name={p.name}
                userState={p.userState}
                onRemove={() => {
                  removeFollowed(p.id);
                  onFollowingChange(getFollowing());
                }}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="w-full py-4 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center space-x-2 text-brand font-black uppercase tracking-widest hover:bg-brand/30 transition-colors"
      >
        <Plus size={18} />
        <span>Create Group</span>
      </button>

      {showCreate && (
        <div className="bg-dark-card border border-brand/30 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-black uppercase">New Group</h3>
            <button onClick={() => setShowCreate(false)} className="p-2 text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <input
            type="text"
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50"
          />
          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim()}
            className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center space-x-2">
          <Users size={12} />
          <span>Your Groups</span>
        </h3>
        {groupList.length === 0 ? (
          <div className="bg-dark-card border border-white/5 rounded-3xl p-8 text-center">
            <Link2 size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm font-bold">No groups yet</p>
            <p className="text-gray-600 text-[10px] mt-1">Create a group and share the link with friends</p>
          </div>
        ) : (
          groupList.map(group => (
              <div key={group.id} className="bg-dark-card border border-white/10 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-white font-black uppercase">{group.name}</h4>
                  <button
                    onClick={() => handleCopyLink(group)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-brand/20 text-brand hover:bg-brand/30 transition-colors text-[10px] font-bold"
                  >
                    {copiedGroupId === group.id ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedGroupId === group.id ? 'Copied!' : 'Copy link'}</span>
                  </button>
                </div>
                <p className="text-[9px] text-gray-500">Share this link for others to join</p>
                <div className="space-y-2">
                  {group.members.map(m => (
                    <MemberCard key={m.id} name={m.name} userState={m.userState} />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
