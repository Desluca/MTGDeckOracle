import { describe, expect, it } from "vitest";

import { inferFunctionalTags, tagCard, tagDeckCards } from "../../src/tagging/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("inferFunctionalTags", () => {
  it("tags lands", () => {
    const card = createTestCard({ name: "Forest", types: ["land"], typeLine: "Basic Land — Forest" });

    expect(inferFunctionalTags(card)).toContain("land");
  });

  it("tags fast mana", () => {
    const card = createTestCard({ name: "Sol Ring", manaValue: 1, typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." });

    expect(inferFunctionalTags(card)).toContain("fast_mana");
  });

  it("tags ramp spells", () => {
    const card = createTestCard({
      name: "Rampant Growth",
      manaValue: 2,
      oracleText: "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
    });

    expect(inferFunctionalTags(card)).toEqual(expect.arrayContaining(["ramp", "tutor"]));
  });

  it("tags card draw and selection", () => {
    const card = createTestCard({ name: "Cantrip", oracleText: "Scry 1, then draw a card." });

    expect(inferFunctionalTags(card)).toEqual(expect.arrayContaining(["card_draw", "card_selection"]));
  });

  it("tags counterspells", () => {
    const card = createTestCard({ name: "Counterspell", oracleText: "Counter target spell." });

    expect(inferFunctionalTags(card)).toContain("counterspell");
  });

  it("tags spot removal", () => {
    const card = createTestCard({ name: "Swords to Plowshares", oracleText: "Exile target creature." });

    expect(inferFunctionalTags(card)).toContain("spot_removal");
  });

  it("tags board wipes", () => {
    const card = createTestCard({ name: "Wrath of God", oracleText: "Destroy all creatures. They can't be regenerated." });

    expect(inferFunctionalTags(card)).toContain("board_wipe");
  });

  it("tags protection", () => {
    const card = createTestCard({ name: "Teferi's Protection", oracleText: "Your life total can't change. You phase out." });

    expect(inferFunctionalTags(card)).toContain("protection");
  });

  it("tags graveyard synergy", () => {
    const card = createTestCard({ name: "Graveyard Engine", oracleText: "Whenever one or more creature cards leave your graveyard, draw a card." });

    expect(inferFunctionalTags(card)).toContain("graveyard_synergy");
  });

  it("keeps existing manual tags", () => {
    const card = createTestCard({ name: "Manual Combo Piece", functionalTags: ["combo_piece"] });

    expect(tagCard(card).evaluation.functionalTags).toContain("combo_piece");
  });

  it("tags every card in a deck", () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Sol Ring", manaValue: 1, typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." })),
      ],
    });

    const taggedDeck = tagDeckCards(deck);

    expect(taggedDeck.cards[1]?.card.evaluation.functionalTags).toContain("fast_mana");
  });
});
