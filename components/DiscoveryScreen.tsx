import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Link2, Plus, X } from 'lucide-react';
import type { DiscoverablePerson, FollowedPerson, Group } from '../types';
import { getDiscoveryList, addToDiscoveryList, decodeFollowProfileFromUrl, addFollowed, getFollowing } from '../lib/storage';

interface DiscoveryScreenProps {
  groups: Record<string, Group>;
  following: Record<string, FollowedPerson>;
  onFollowingChange: (f: Record<string, FollowedPerson>) => void;
  currentUserName: string;
}

/** Build discoverable people from groups (members you're not following) + decoded community links */
function buildDiscoverable(
  groups: Record<string, Group>,
  following: Record<string, FollowedPerson>,
  currentUserName: string
): DiscoverablePerson[] {
  const followingIds = new Set(Object.keys(following));
  const followingNames = new Set(Object.values(following).map(p => p.name));
  const seen = new Set<string>();
  const out: DiscoverablePerson[] = [];

  for (const g of Object.values(groups)) {
    for (const m of g.members) {
      if (m.name === currentUserName) continue;
      if (followingNames.has(m.name)) continue;
      const key = `group_${m.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: m.id, name: m.name, userState: m.userState, source: 'group' });
    }
  }

  const links = getDiscoveryList();
  for (const link of links) {
    try {
      const url = link.startsWith('http') ? new URL(link) : new URL(link, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
      const code = url.searchParams.get('follow');
      if (!code) continue;
      const decoded = decodeFollowProfileFromUrl(code);
      if (!decoded || decoded.name === currentUserName) continue;
      if (followingNames.has(decoded.name)) continue;
      const key = `community_${decoded.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: 'c_' + decoded.name,
        name: decoded.name,
        userState: decoded.userState,
        source: 'community',
      });
    } catch {
      // invalid link, skip
    }
  }

  return out;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({
  groups,
  following,
  onFollowingChange,
  currentUserName,
}) => {
  const [search, setSearch] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  const discoverable = useMemo(
    () => buildDiscoverable(groups, following, currentUserName),
    [groups, following, currentUserName]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return discoverable;
    const q = search.trim().toLowerCase();
    return discoverable.filter(p => p.name.toLowerCase().includes(q));
  }, [discoverable, search]);

  const handleFollow = (person: DiscoverablePerson) => {
    const id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    addFollowed({ id, name: person.name, userState: person.userState });
    onFollowingChange({ ...getFollowing() });
  };

  const handleAddLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    addToDiscoveryList(trimmed);
    setLinkInput('');
    setShowAddLink(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col">
        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Discover</h2>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Find founders to follow</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-dark-card border border-white/10 rounded-2xl text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          {filtered.length} founder{filtered.length !== 1 ? 's' : ''} to follow
        </span>
        <button
          onClick={() => setShowAddLink(true)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-brand/20 border border-brand/40 text-brand text-[10px] font-bold hover:bg-brand/30"
        >
          <Link2 size={12} />
          <span>Add follow link</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-dark-card border border-white/5 rounded-3xl p-12 text-center">
          <UserPlus size={40} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 font-bold">No one to discover</p>
          <p className="text-gray-600 text-[10px] mt-2">
            Join groups or add follow links to find founders
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div
              key={`${p.source}_${p.id}`}
              className="bg-dark-card border border-white/10 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center text-brand font-black text-lg">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold">{p.name}</p>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    {p.source === 'group' ? 'From your groups' : 'Community'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleFollow(p)}
                className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-sm flex items-center space-x-2 hover:bg-brand/90"
              >
                <UserPlus size={14} />
                <span>Follow</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-dark-card border border-brand/50 p-8 rounded-[40px] shadow-2xl max-w-xs w-full space-y-6">
            <h3 className="text-xl font-black italic uppercase text-white">Add follow link</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Paste a link shared by someone so you can follow them
            </p>
            <input
              type="text"
              placeholder="https://...?follow=..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 outline-none focus:border-brand/50"
            />
            <div className="flex flex-col space-y-2">
              <button
                onClick={handleAddLink}
                disabled={!linkInput.trim()}
                className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl disabled:opacity-40"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddLink(false); setLinkInput(''); }}
                className="w-full py-4 bg-white/5 text-gray-600 font-black uppercase text-[10px] rounded-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
