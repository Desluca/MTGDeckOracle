import { describe, expect, it } from "vitest";

import { summarizeRatingActivity, type CardComparison } from "../../src/rating-lab/index.js";

describe("summarizeRatingActivity", () => {
  it("summarizes comparisons by day and distinct anonymous visitor", () => {
    const summary = summarizeRatingActivity([
      comparison("a", "2026-09-07T10:00:00.000Z", "visitor-a"),
      comparison("b", "2026-09-07T11:00:00.000Z", "visitor-a"),
      comparison("c", "2026-09-08T10:00:00.000Z", "visitor-b"),
      comparison("d", "2026-09-08T11:00:00.000Z"),
    ]);

    expect(summary).toEqual({
      totalComparisons: 4,
      uniqueVisitors: 2,
      dailyComparisons: [
        {
          date: "2026-09-07",
          comparisons: 2,
          uniqueVisitors: 1,
        },
        {
          date: "2026-09-08",
          comparisons: 2,
          uniqueVisitors: 1,
        },
      ],
    });
  });
});

function comparison(id: string, createdAt: string, visitorId?: string): CardComparison {
  return {
    id,
    winnerCardId: "winner",
    loserCardId: "loser",
    winnerRatingBefore: 1500,
    loserRatingBefore: 1500,
    winnerRatingAfter: 1516,
    loserRatingAfter: 1484,
    strategy: "random",
    ...(visitorId ? { visitorId } : {}),
    createdAt,
  };
}
