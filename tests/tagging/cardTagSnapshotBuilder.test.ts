import { describe, expect, it } from "vitest";

import { buildOracleCardTagSnapshot, mergeCardTagSnapshots } from "../../src/tagging/index.js";
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

describe("mergeCardTagSnapshots", () => {
  it("merges entries by card and keeps the strongest evidence per source", () => {
    const merged = mergeCardTagSnapshots(
      [
        {
          generatedAt: "old",
          cards: [
            {
              name: "Reanimate",
              source: "moxfield",
              tags: [
                { tag: "Graveyard", confidence: 0.7 },
                { tag: "Recursion", confidence: 0.8 },
              ],
            },
          ],
        },
        {
          generatedAt: "new",
          cards: [
            {
              name: "Reanimate",
              source: "archidekt",
              tags: [{ tag: "Graveyard", confidence: 0.82 }],
            },
            {
              name: "Reanimate",
              source: "moxfield",
              tags: [{ tag: "Graveyard", confidence: 0.9 }],
            },
          ],
        },
      ],
      "2026-09-08T12:05:00.000Z",
    );

    expect(merged).toEqual({
      generatedAt: "2026-09-08T12:05:00.000Z",
      cards: [
        {
          name: "Reanimate",
          normalizedName: "reanimate",
          tags: [
            { tag: "graveyard_synergy", source: "archidekt", confidence: 0.82, rawLabel: "Graveyard" },
            { tag: "graveyard_synergy", source: "moxfield", confidence: 0.9, rawLabel: "Graveyard" },
            { tag: "recursion", source: "moxfield", confidence: 0.8, rawLabel: "Recursion" },
          ],
        },
      ],
    });
  });
});
