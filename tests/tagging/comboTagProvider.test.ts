import { describe, expect, it } from "vitest";

import { createComboTagEvidenceByName, createComboTagsByName } from "../../src/tagging/index.js";
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
