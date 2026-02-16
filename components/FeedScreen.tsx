import React, { useState } from 'react';
import { Activity, CheckCircle, Zap, Coffee, ThumbsUp, FileText, MessageCircle } from 'lucide-react';
import type { FeedActivity, FollowedPerson, Group } from '../types';
import { buildFeedActivities } from '../lib/feedUtils';
import { hasKudos, addKudos, removeKudos, getCommentsForActivity, addComment } from '../lib/storage';
import type { ReactionEmoji } from '../types';

const REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '👏', label: 'Clap' },
];

const formatTime = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date().toLocaleDateString('en-CA');
  const dateStr = d.toLocaleDateString('en-CA');
  if (dateStr === today) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const ActivityCard: React.FC<{
  activity: FeedActivity;
  currentUserName: string;
  onReaction: (key: string, emoji: ReactionEmoji) => void;
  onRemoveReaction: (key: string) => void;
  onCommentAdded: () => void;
}> = ({ activity, currentUserName, onReaction, onRemoveReaction, onCommentAdded }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const activityKey = activity.id;
  const myKudos = hasKudos(activityKey);
  const comments = getCommentsForActivity(activityKey);

  const icon = activity.type === 'ship' ? <CheckCircle size={18} className="text-green-500" /> :
    activity.type === 'loops' ? <Zap size={18} className="text-brand" /> :
    activity.type === 'post' ? <FileText size={18} className="text-amber-400" /> :
    <Coffee size={18} className="text-indigo-400" />;

  const formatHours = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)}m`;
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };
  const text = activity.type === 'ship'
    ? `Shipped${activity.note ? `: ${activity.note}` : ''}`
    : activity.type === 'loops'
    ? `Logged ${activity.value} loops`
    : activity.type === 'post'
    ? (activity.note || 'Posted today\'s inputs')
    : 'Taking a break';

  const today = new Date().toLocaleDateString('en-CA');
  const timeStr = formatTime(activity.time);
  const dateLabel = timeStr
    ? (activity.date === today ? `Today · ${timeStr}` : timeStr)
    : (activity.date === today ? 'Today' : new Date(activity.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

  const handleAddComment = () => {
    if (!commentDraft.trim()) return;
    addComment(activityKey, commentDraft.trim(), currentUserName);
    setCommentDraft('');
    onCommentAdded();
  };

  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand font-black text-sm">
            {activity.personName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold">{activity.personName}</p>
            <p className="text-[10px] text-gray-500">{dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activity.type === 'post' && activity.hours != null && activity.hours > 0 && (
            <span className="text-[10px] font-black text-brand/80 bg-brand/10 px-2 py-0.5 rounded-lg">
              {formatHours(activity.hours)}
            </span>
          )}
          {icon}
        </div>
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
        <button
          onClick={() => setShowComments(!showComments)}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${showComments ? 'text-brand bg-brand/10' : 'text-gray-500 hover:text-brand hover:bg-brand/10'}`}
          title="Comments"
        >
          <MessageCircle size={16} />
          {comments.length > 0 && (
            <span className="text-[10px] font-bold">{comments.length}</span>
          )}
        </button>
      </div>

      {showComments && (
        <div className="pt-3 border-t border-white/5 space-y-3">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Comments</p>
          {comments.length === 0 ? (
            <p className="text-[11px] text-gray-600">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white">{c.author}</span>
                    <span className="text-[9px] text-gray-500">{formatTime(c.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{c.text}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value.slice(0, 280))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-gray-500 outline-none focus:border-brand/50"
            />
            <button
              onClick={handleAddComment}
              disabled={!commentDraft.trim()}
              className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-dark transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface FeedSectionProps {
  following: Record<string, FollowedPerson>;
  groups: Record<string, Group>;
  currentUserName: string;
  currentUserState?: import('../types').UserState;
  compact?: boolean;
}

/** Reusable feed section for embedding in Home */
export const FeedSection: React.FC<FeedSectionProps> = ({ following, groups, currentUserName, currentUserState, compact }) => {
  const activities = buildFeedActivities(following, groups, currentUserName, currentUserState);

  const [kudosVersion, setKudosVersion] = useState(0);
  const [commentsVersion, setCommentsVersion] = useState(0);

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
              currentUserName={currentUserName}
              onReaction={handleReaction}
              onRemoveReaction={handleRemoveReaction}
              onCommentAdded={() => setCommentsVersion(v => v + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
