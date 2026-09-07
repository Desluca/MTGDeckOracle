import type { CardComparison } from "./ratingTypes.js";

export interface RatingActivitySummary {
  readonly totalComparisons: number;
  readonly uniqueVisitors: number;
  readonly dailyComparisons: readonly DailyRatingActivity[];
}

export interface DailyRatingActivity {
  readonly date: string;
  readonly comparisons: number;
  readonly uniqueVisitors: number;
}

export function summarizeRatingActivity(comparisons: readonly CardComparison[]): RatingActivitySummary {
  const visitorIds = new Set<string>();
  const dailyStats = new Map<string, { comparisons: number; visitorIds: Set<string> }>();

  for (const comparison of comparisons) {
    const date = comparison.createdAt.slice(0, 10);
    const stats = dailyStats.get(date) ?? { comparisons: 0, visitorIds: new Set<string>() };

    stats.comparisons += 1;

    if (comparison.visitorId) {
      stats.visitorIds.add(comparison.visitorId);
      visitorIds.add(comparison.visitorId);
    }

    dailyStats.set(date, stats);
  }

  return {
    totalComparisons: comparisons.length,
    uniqueVisitors: visitorIds.size,
    dailyComparisons: [...dailyStats.entries()]
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, stats]) => ({
        date,
        comparisons: stats.comparisons,
        uniqueVisitors: stats.visitorIds.size,
      })),
  };
}
