import React, { useState } from 'react';
import { Activity, CheckCircle, Zap, Coffee, ThumbsUp, Gem, Plus, X as XIcon } from 'lucide-react';
import type { FeedActivity, FollowedPerson, Group, ReactionEmoji } from '../../lib/growth/types';
import { buildFeedActivities } from '../../lib/growth/feedUtils';
import { hasKudos, addKudos, removeKudos } from '../../lib/growth/storage';

const REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '👏', label: 'Clap' },
];

const ActivityCard: React.FC<{
  userId: string | null | undefined;
  activity: FeedActivity;
  onReaction: (key: string, emoji: ReactionEmoji) => void;
  onRemoveReaction: (key: string) => void;
}> = ({ userId, activity, onReaction, onRemoveReaction }) => {
  const [showReactions, setShowReactions] = useState(false);
  const activityKey = activity.id;
  const myKudos = hasKudos(userId, activityKey);

  const icon = activity.type === 'ship' ? <CheckCircle size={18} className="text-green-500" /> :
    activity.type === 'loops' ? <Zap size={18} className="text-brand" /> :
    <Coffee size={18} className="text-indigo-400" />;

  const text = activity.type === 'ship'
    ? `Shipped${activity.note ? `: ${activity.note}` : ''}`
    : activity.type === 'loops'
    ? `Logged ${activity.value} loops`
    : 'Taking a break';

  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand font-black text-sm">
            {activity.personName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold">{activity.personName}</p>
            <p className="text-[10px] text-gray-500">{activity.date}</p>
          </div>
        </div>
        {icon}
      </div>
      <p className="text-sm text-gray-300">{text}</p>
      <div className="flex items-center space-x-2">
        {myKudos ? (
          <button
            onClick={() => onRemoveReaction(activityKey)}
            className="px-4 py-1.5 rounded-full bg-brand/20 text-brand text-sm font-bold"
          >
            {myKudos.emoji} You reacted
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-brand hover:bg-brand/10 transition-colors"
            >
              <ThumbsUp size={16} />
            </button>
            {showReactions && (
              <div className="flex gap-1">
                {REACTIONS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    onClick={() => { onReaction(activityKey, emoji); setShowReactions(false); }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-brand/20 text-lg transition-colors"
                    title={label}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Value: a simple list of skills you have — proof of what you can build
 * yourself, independent of anyone's permission to hire you for it. Kept
 * deliberately simple for now: add a skill, remove a skill, nothing more.
 */
const ValueCard: React.FC<{
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
}> = ({ skills, onAdd, onRemove }) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    onAdd(draft);
    setDraft('');
  };

  return (
    <div className="bg-dark-card border border-brand/20 rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gem size={14} className="text-brand" />
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Value</h3>
      </div>
      <p className="text-[10px] text-gray-600 -mt-2">Skills you have. What you can build yourself, no permission needed.</p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Add a skill..."
          className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium placeholder:text-gray-600 outline-none focus:border-brand/50"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-brand text-white flex items-center justify-center disabled:opacity-30"
          title="Add skill"
        >
          <Plus size={18} />
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-[11px] text-gray-600">Nothing added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map(skill => (
            <span key={skill} className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold text-white">
              {skill}
              <button onClick={() => onRemove(skill)} className="text-gray-600 hover:text-gray-300" title={`Remove ${skill}`}>
                <XIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

interface FeedScreenProps {
  userId: string | null | undefined;
  following: Record<string, FollowedPerson>;
  groups: Record<string, Group>;
  currentUserName: string;
  skills: string[];
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ userId, following, groups, currentUserName, skills, onAddSkill, onRemoveSkill }) => {
  const activities = buildFeedActivities(following, groups, currentUserName);

  const [, forceUpdate] = useState(0);

  const handleReaction = (key: string, emoji: ReactionEmoji) => {
    addKudos(userId, key, emoji);
    forceUpdate(v => v + 1);
  };

  const handleRemoveReaction = (key: string) => {
    removeKudos(userId, key);
    forceUpdate(v => v + 1);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col">
        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Activity Feed</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">What your squad is building</p>
      </div>

      <ValueCard skills={skills} onAdd={onAddSkill} onRemove={onRemoveSkill} />

      {activities.length === 0 ? (
        <div className="bg-dark-card border border-white/5 rounded-3xl p-12 text-center">
          <Activity size={40} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 font-bold">No activity yet</p>
          <p className="text-gray-600 text-[10px] mt-2">Follow people or join groups to see their activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map(a => (
            <ActivityCard
              key={a.id}
              userId={userId}
              activity={a}
              onReaction={handleReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
};
