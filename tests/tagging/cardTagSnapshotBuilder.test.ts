import { describe, expect, it } from "vitest";

import { buildOracleCardTagSnapshot } from "../../src/tagging/index.js";
import { createTestCard } from "../utils/cardFactory.js";

describe("buildOracleCardTagSnapshot", () => {
  it("builds structured evidence from inferred Oracle text tags", () => {
    const snapshot = buildOracleCardTagSnapshot(
      [
        createTestCard({
          name: "Rampant Growth",
          manaValue: 2,
          oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
        }),
        createTestCard({ name: "Vanilla Creature", typeLine: "Creature — Bear", oracleText: "" }),
      ],
      "2026-09-08T12:00:00.000Z",
    );

    expect(snapshot).toEqual({
      generatedAt: "2026-09-08T12:00:00.000Z",
      cards: [
        {
          name: "Rampant Growth",
          normalizedName: "rampant growth",
          source: "oracle_text",
          tags: [
            { tag: "ramp", source: "oracle_text", confidence: 0.9 },
            { tag: "tutor", source: "oracle_text", confidence: 0.9 },
          ],
        },
      ],
    });
  });
});
