import React, { useState } from 'react';
import { Activity, CheckCircle, Zap, Coffee, ThumbsUp } from 'lucide-react';
import type { FeedActivity, FollowedPerson, Group } from '../types';
import { buildFeedActivities } from '../lib/feedUtils';
import { hasKudos, addKudos, removeKudos } from '../lib/storage';
import type { ReactionEmoji } from '../types';

const REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '👏', label: 'Clap' },
];

const ActivityCard: React.FC<{
  activity: FeedActivity;
  onReaction: (key: string, emoji: ReactionEmoji) => void;
  onRemoveReaction: (key: string) => void;
}> = ({ activity, onReaction, onRemoveReaction }) => {
  const [showReactions, setShowReactions] = useState(false);
  const activityKey = activity.id;
  const myKudos = hasKudos(activityKey);

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

interface FeedSectionProps {
  following: Record<string, FollowedPerson>;
  groups: Record<string, Group>;
  currentUserName: string;
  compact?: boolean;
}

/** Reusable feed section for embedding in Home */
export const FeedSection: React.FC<FeedSectionProps> = ({ following, groups, currentUserName, compact }) => {
  const activities = buildFeedActivities(following, groups, currentUserName);

  const [kudosVersion, setKudosVersion] = useState(0);

  const handleReaction = (key: string, emoji: ReactionEmoji) => {
    addKudos(key, emoji);
    setKudosVersion(v => v + 1);
  };

  const handleRemoveReaction = (key: string) => {
    removeKudos(key);
    setKudosVersion(v => v + 1);
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6 pb-20 animate-in fade-in duration-500'}>
      {!compact && (
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Activity Feed</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">What your squad is building</p>
        </div>
      )}

      {activities.length === 0 ? (
        <div className={`bg-dark-card border border-white/5 rounded-3xl text-center ${compact ? 'p-6' : 'p-12'}`}>
          <Activity size={compact ? 24 : 40} className={`mx-auto text-gray-600 ${compact ? 'mb-2' : 'mb-4'}`} />
          <p className="text-gray-500 font-bold text-sm">No activity yet</p>
          <p className="text-gray-600 text-[10px] mt-1">Follow people or join groups</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map(a => (
            <ActivityCard
              key={a.id}
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
