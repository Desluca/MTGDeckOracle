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

  it("orders common power bands from precon to cEDH", () => {
    const precon = scoreById("precon_core");
    const casual = scoreById("casual_tuned");
    const highPower = scoreById("high_power");
    const cedh = scoreById("cedh_like");

    expect(precon.finalScore).toBeLessThan(casual.finalScore);
    expect(casual.finalScore).toBeLessThan(highPower.finalScore);
    expect(highPower.finalScore).toBeLessThan(cedh.finalScore);
  });

  it("orders real oracle-tagged lists from precon to high power", () => {
    const pantlaza = scoreById("real_pantlaza_precon");
    const muldrotha = scoreById("real_muldrotha_casual");
    const kinnan = scoreById("real_kinnan_high_power");

    expect(pantlaza.finalScore).toBeLessThan(muldrotha.finalScore);
    expect(muldrotha.finalScore).toBeLessThan(kinnan.finalScore);
  });
});

function scoreBenchmark(benchmark: ScoringBenchmark) {
  return scoreCommanderDeck({
    deck: benchmark.deck,
    legality: benchmark.legality,
    ...(benchmark.comboEvaluations ? { comboEvaluations: benchmark.comboEvaluations } : {}),
  });
}

function scoreById(id: string) {
  const benchmark = scoringBenchmarks.find((candidate) => candidate.id === id);

  if (!benchmark) {
    throw new Error(`Missing scoring benchmark: ${id}`);
  }

  return scoreBenchmark(benchmark);
}
