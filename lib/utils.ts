export function calculateCurrentStreak(
  growthDates: string[],
  infrastructureFocus: Record<string, boolean>,
  dailyShipped: Record<string, boolean>
): number {
  const focusDates = Object.entries(infrastructureFocus)
    .filter(([_, active]) => active)
    .map(([date]) => date);

  const shippedDates = Object.entries(dailyShipped)
    .filter(([_, shipped]) => shipped)
    .map(([date]) => date);

  const allActiveDates = Array.from(new Set([...growthDates, ...focusDates, ...shippedDates])).sort((a, b) => b.localeCompare(a));

  if (allActiveDates.length === 0) return 0;

  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
  const latestDate = allActiveDates[0];

  if (latestDate !== today && latestDate !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < allActiveDates.length - 1; i++) {
    const d1 = new Date(allActiveDates[i]);
    const d2 = new Date(allActiveDates[i + 1]);
    const diffDays = Math.round((d1.getTime() - d2.getTime()) / 86400000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}
