import type { FeedActivity, FollowedPerson, Group, UserState } from '../types';

/** Build feed activities from following + groups (excluding self) */
export function buildFeedActivities(
  following: Record<string, FollowedPerson>,
  groups: Record<string, Group>,
  currentUserName: string
): FeedActivity[] {
  const activities: FeedActivity[] = [];
  const today = new Date().toLocaleDateString('en-CA');
  const seen = new Set<string>();

  const addFromPerson = (personId: string, personName: string, userState: UserState) => {
    if (personName === currentUserName) return;

    if (userState.isOnMaintenance) {
      const key = `${personId}_${today}_break`;
      if (!seen.has(key)) {
        seen.add(key);
        activities.push({
          id: key,
          personId,
          personName,
          type: 'break',
          date: today,
        });
      }
    }

    const shipped = userState.dailyShipped[today];
    if (shipped) {
      const key = `${personId}_${today}_ship`;
      if (!seen.has(key)) {
        seen.add(key);
        activities.push({
          id: key,
          personId,
          personName,
          type: 'ship',
          date: today,
          note: userState.dailyShipNote?.[today],
        });
      }
    }

    const loops = userState.dailyUvs[today] || 0;
    if (loops > 0) {
      const key = `${personId}_${today}_loops`;
      if (!seen.has(key)) {
        seen.add(key);
        activities.push({
          id: key,
          personId,
          personName,
          type: 'loops',
          date: today,
          value: loops,
        });
      }
    }
  };

  for (const p of Object.values(following)) {
    addFromPerson(p.id, p.name, p.userState);
  }

  for (const g of Object.values(groups)) {
    for (const m of g.members) {
      addFromPerson(m.id, m.name, m.userState);
    }
  }

  return activities.sort((a, b) => {
    const dateA = a.date;
    const dateB = b.date;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const typeOrder = { ship: 0, loops: 1, break: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
}
