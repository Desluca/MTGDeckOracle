import { describe, expect, it } from "vitest";

import { buildComboCardTagSnapshot, createComboTagEvidenceByName, createComboTagsByName } from "../../src/tagging/index.js";
import type { DetectedCombo } from "../../src/domain/index.js";

describe("createComboTagEvidenceByName", () => {
  it("marks present combo pieces using combo source evidence", () => {
    const detectedCombo: DetectedCombo = {
      combo: {
        id: "combo-1",
        name: "A + B",
        source: "commander_spellbook",
        pieces: [
          { cardName: "Piece A", required: true },
          { cardName: "Piece B", required: true },
        ],
        outcomes: ["wins_game"],
      },
      completeness: "complete",
      presentPieces: ["Piece A", "Piece B"],
      missingPieces: [],
    };

    const evidenceByName = createComboTagEvidenceByName([detectedCombo]);
    const tagsByName = createComboTagsByName([detectedCombo]);

    expect(evidenceByName.get("piece a")).toEqual([
      { tag: "combo_piece", source: "commander_spellbook", confidence: 0.95 },
    ]);
    expect(tagsByName.get("piece b")).toEqual(["combo_piece"]);
  });
});

describe("buildComboCardTagSnapshot", () => {
  it("builds catalog evidence for every combo piece", () => {
    const snapshot = buildComboCardTagSnapshot(
      [
        {
          id: "combo-1",
          name: "Isochron Scepter + Dramatic Reversal",
          source: "commander_spellbook",
          pieces: [
            { cardName: "Isochron Scepter", required: true },
            { cardName: "Dramatic Reversal", required: true },
          ],
          outcomes: ["infinite_mana"],
        },
      ],
      "2026-09-08T12:10:00.000Z",
    );

    expect(snapshot).toEqual({
      generatedAt: "2026-09-08T12:10:00.000Z",
      cards: [
        {
          name: "Dramatic Reversal",
          normalizedName: "dramatic reversal",
          source: "commander_spellbook",
          tags: [{ tag: "combo_piece", source: "commander_spellbook", confidence: 0.95 }],
        },
        {
          name: "Isochron Scepter",
          normalizedName: "isochron scepter",
          source: "commander_spellbook",
          tags: [{ tag: "combo_piece", source: "commander_spellbook", confidence: 0.95 }],
        },
      ],
    });
  });
});
