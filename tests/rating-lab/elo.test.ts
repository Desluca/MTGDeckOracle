import { describe, expect, it } from "vitest";

import { updateEloRatings } from "../../src/rating-lab/index.js";

describe("updateEloRatings", () => {
  it("increases winner rating and decreases loser rating", () => {
    const result = updateEloRatings(1500, 1500);

    expect(result.winnerRating).toBe(1516);
    expect(result.loserRating).toBe(1484);
  });

  it("gives fewer points when a high-rated card beats a low-rated card", () => {
    const evenMatch = updateEloRatings(1500, 1500);
    const expectedWin = updateEloRatings(1800, 1200);

    expect(expectedWin.winnerRating - 1800).toBeLessThan(evenMatch.winnerRating - 1500);
  });
}
);
