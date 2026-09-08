import { describe, expect, it } from "vitest";

import { inferFunctionalTags, tagCard, tagDeckCards, tagDeckCardsWithProvider, InMemoryCardTagProvider } from "../../src/tagging/index.js";
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

  it("tags artifact, token, spellslinger and lifegain synergies", () => {
    expect(inferFunctionalTags(createTestCard({ name: "Artifact Payoff", oracleText: "Artifacts you control have hexproof." }))).toContain("artifact_synergy");
    expect(inferFunctionalTags(createTestCard({ name: "Token Maker", oracleText: "Create two 1/1 white Soldier creature tokens." }))).toContain("token_synergy");
    expect(inferFunctionalTags(createTestCard({ name: "Storm Payoff", oracleText: "Whenever you cast an instant or sorcery spell, copy it." }))).toContain("spellslinger");
    expect(inferFunctionalTags(createTestCard({ name: "Soul Warden", oracleText: "Whenever another creature enters, you gain 1 life." }))).toContain("lifegain");
  });

  it("tags aristocrats, counters, enchantress and equipment synergies", () => {
    expect(inferFunctionalTags(createTestCard({ name: "Blood Artist", oracleText: "Whenever a creature you control dies, each opponent loses 1 life." }))).toContain("aristocrats");
    expect(inferFunctionalTags(createTestCard({ name: "Hardened Scales", oracleText: "If one or more +1/+1 counters would be put on a creature you control, put that many plus one +1/+1 counters on it instead." }))).toContain("counters_synergy");
    expect(inferFunctionalTags(createTestCard({ name: "Enchantress", oracleText: "Whenever you cast an enchantment spell, draw a card. Enchantments you control have hexproof." }))).toContain("enchantment_synergy");
    expect(inferFunctionalTags(createTestCard({ name: "Sword", typeLine: "Artifact — Equipment", oracleText: "Equipped creature gets +2/+2. Equip {2}" }))).toContain("equipment_synergy");
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

  it("tags tribal cards that match a commander who cares about its creature type", () => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Krenko, Mob Boss",
          canBeCommander: true,
          typeLine: "Legendary Creature — Goblin Warrior",
          oracleText: "Tap: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.",
        }),
      ],
      mainboard: [
        mainboardCard(createTestCard({ name: "Goblin Guide", typeLine: "Creature — Goblin Warrior" })),
        mainboardCard(createTestCard({ name: "Random Bear", typeLine: "Creature — Bear" })),
      ],
    });

    const taggedDeck = tagDeckCards(deck);

    expect(taggedDeck.cards.find((deckCard) => deckCard.card.identity.name === "Goblin Guide")?.card.evaluation.functionalTags).toContain("tribal_synergy");
    expect(taggedDeck.cards.find((deckCard) => deckCard.card.identity.name === "Random Bear")?.card.evaluation.functionalTags).not.toContain("tribal_synergy");
  });

  it("merges external provider tags with inferred card tags", async () => {
    const deck = createResolvedTestDeck({
      mainboard: [
        mainboardCard(createTestCard({ name: "Reanimate", oracleText: "Return target creature card from your graveyard to the battlefield." })),
      ],
    });
    const provider = new InMemoryCardTagProvider([
      { name: "Reanimate", source: "moxfield", tags: ["Combo", "Graveyard"] },
    ]);

    const taggedDeck = await tagDeckCardsWithProvider(deck, provider);

    expect(taggedDeck.cards[1]?.card.evaluation.functionalTags).toEqual(
      expect.arrayContaining(["combo_piece", "graveyard_synergy", "recursion"]),
    );
  });
});
