import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { FileCardTagProvider, InMemoryCardTagProvider, normalizeExternalTagLabel } from "../../src/tagging/index.js";

describe("normalizeExternalTagLabel", () => {
  it("maps common deck-builder labels to internal functional tags", () => {
    expect(normalizeExternalTagLabel("Card Draw")).toBe("card_draw");
    expect(normalizeExternalTagLabel("Graveyard")).toBe("graveyard_synergy");
    expect(normalizeExternalTagLabel("Board Wipes")).toBe("board_wipe");
    expect(normalizeExternalTagLabel("fast-mana")).toBe("fast_mana");
  });
});

describe("InMemoryCardTagProvider", () => {
  it("returns normalized tags by card name", async () => {
    const provider = new InMemoryCardTagProvider([
      { name: "Reanimate", source: "moxfield", tags: ["Recursion", "Graveyard"] },
    ]);

    const tagsByName = await provider.findTagsByNames(["reanimate"]);

    expect(tagsByName.get("reanimate")).toEqual(["graveyard_synergy", "recursion"]);
  });

  it("preserves tag evidence source and confidence", async () => {
    const provider = new InMemoryCardTagProvider([
      {
        name: "Underworld Breach",
        tags: [
          { tag: "Combo", source: "commander_spellbook" },
          { tag: "Graveyard", source: "moxfield", confidence: 0.72 },
        ],
      },
    ]);

    const evidenceByName = await provider.findTagEvidenceByNames!(["underworld breach"]);

    expect(evidenceByName.get("underworld breach")).toEqual([
      { tag: "combo_piece", source: "commander_spellbook", confidence: 0.95, rawLabel: "Combo" },
      { tag: "graveyard_synergy", source: "moxfield", confidence: 0.72, rawLabel: "Graveyard" },
    ]);
  });
});

describe("FileCardTagProvider", () => {
  it("loads external tag files exported from hub data", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "mtg-deck-oracle-tags-"));
    const tagFile = join(tempDir, "external-card-tags.json");

    await writeFile(
      tagFile,
      JSON.stringify({
        cards: [
          { name: "Skullclamp", source: "archidekt", tags: ["Card Draw", { tag: "Value", confidence: 0.9 }] },
        ],
      }),
      "utf8",
    );

    try {
      const provider = new FileCardTagProvider(tagFile);
      const tagsByName = await provider.findTagsByNames(["skullclamp"]);

      expect(tagsByName.get("skullclamp")).toEqual(["card_draw", "value_engine"]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
