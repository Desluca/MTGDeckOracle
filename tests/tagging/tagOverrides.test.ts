import { describe, expect, it } from "vitest";

import { applyTagOverridesToCard, applyTagOverridesToDeck, createTagOverrideMap } from "../../src/tagging/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("tag overrides", () => {
  it("adds manual tags to a card", () => {
    const card = createTestCard({ name: "Demonic Tutor" });
    const overrides = createTagOverrideMap([{ cardName: "Demonic Tutor", add: ["tutor"] }]);

    expect(applyTagOverridesToCard(card, overrides).evaluation.functionalTags).toEqual(["tutor"]);
  });

  it("removes incorrect tags from a card", () => {
    const card = createTestCard({ name: "False Positive", functionalTags: ["ramp", "tutor"] });
    const overrides = createTagOverrideMap([{ cardName: "False Positive", remove: ["ramp"] }]);

    expect(applyTagOverridesToCard(card, overrides).evaluation.functionalTags).toEqual(["tutor"]);
  });

  it("stores override notes", () => {
    const card = createTestCard({ name: "Complex Card" });
    const overrides = createTagOverrideMap([{ cardName: "Complex Card", add: ["combo_piece"], notes: "Manual combo override." }]);

    expect(applyTagOverridesToCard(card, overrides).evaluation.notes).toBe("Manual combo override.");
  });

  it("applies overrides to all deck cards", () => {
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Demonic Tutor" }))],
    });
    const overrides = createTagOverrideMap([{ cardName: "Demonic Tutor", add: ["tutor"] }]);

    const updatedDeck = applyTagOverridesToDeck(deck, overrides);

    expect(updatedDeck.cards[1]?.card.evaluation.functionalTags).toEqual(["tutor"]);
  });
});
