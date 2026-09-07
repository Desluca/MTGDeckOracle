import { describe, expect, it } from "vitest";

import { scoreCommanderDeck } from "../../src/scoring/index.js";
import { scoringBenchmarks } from "../fixtures/benchmarks/benchmarkDecks.js";
import type { ScoringBenchmark } from "../fixtures/benchmarks/benchmarkTypes.js";

describe("scoring benchmarks", () => {
  for (const benchmark of scoringBenchmarks) {
    it(`${benchmark.id}: ${benchmark.description}`, () => {
      const score = scoreBenchmark(benchmark);

      expect(score.finalScore).toBeGreaterThanOrEqual(benchmark.expectedScoreRange.min);
      expect(score.finalScore).toBeLessThanOrEqual(benchmark.expectedScoreRange.max);

      if (benchmark.expectedBracket) {
        expect(score.commanderBracket).toBe(benchmark.expectedBracket);
      }
    });
  }

  it("keeps legal 200-card Whtz-style decks above illegal 200-card goodstuff decks", () => {
    const illegalBenchmark = scoringBenchmarks.find((benchmark) => benchmark.id === "illegal_200_goodstuff");
    const whtzBenchmark = scoringBenchmarks.find((benchmark) => benchmark.id === "whtz_200_legal");

    expect(illegalBenchmark).toBeDefined();
    expect(whtzBenchmark).toBeDefined();

    const illegalScore = scoreBenchmark(illegalBenchmark!);
    const whtzScore = scoreBenchmark(whtzBenchmark!);

    expect(whtzScore.finalScore).toBeGreaterThan(illegalScore.finalScore);
  });
});

function scoreBenchmark(benchmark: ScoringBenchmark) {
  return scoreCommanderDeck({
    deck: benchmark.deck,
    legality: benchmark.legality,
    ...(benchmark.comboEvaluations ? { comboEvaluations: benchmark.comboEvaluations } : {}),
  });
}
