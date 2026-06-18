export function postedAtSortKey(postedAt?: string): number {
  if (!postedAt) return 0;
  const lower = postedAt.toLowerCase();

  if (lower.includes('hour') || lower.includes('today') || lower.includes('just now')) {
    return Date.now();
  }

  const daysMatch = lower.match(/(\d+)\s*day/);
  if (daysMatch) {
    return Date.now() - parseInt(daysMatch[1], 10) * 86_400_000;
  }

  const weeksMatch = lower.match(/(\d+)\s*week/);
  if (weeksMatch) {
    return Date.now() - parseInt(weeksMatch[1], 10) * 7 * 86_400_000;
  }

  if (lower.includes('month')) {
    const monthsMatch = lower.match(/(\d+)\s*month/);
    const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 1;
    return Date.now() - months * 30 * 86_400_000;
  }

  const parsed = Date.parse(postedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}
