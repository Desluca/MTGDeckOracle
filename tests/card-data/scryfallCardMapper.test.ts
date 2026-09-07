import { describe, expect, it } from "vitest";

import { mapScryfallCardToCard } from "../../src/card-data/index.js";
import type { ScryfallCard } from "../../src/card-data/index.js";

describe("mapScryfallCardToCard", () => {
  it("maps core Scryfall fields to Card", () => {
    const card = mapScryfallCardToCard(createScryfallCard());

    expect(card.identity.name).toBe("Atraxa, Praetors' Voice");
    expect(card.identity.normalizedName).toBe("atraxa, praetors' voice");
    expect(card.print?.setCode).toBe("c16");
    expect(card.print?.collectorNumber).toBe("28");
    expect(card.rules.manaValue).toBe(4);
    expect(card.rules.colorIdentity).toEqual(["W", "U", "B", "G"]);
    expect(card.rules.commanderLegality).toBe("legal");
    expect(card.rules.canBeCommander).toBe(true);
  });

  it("detects cards that can be commanders via oracle text", () => {
    const card = mapScryfallCardToCard(
      createScryfallCard({
        name: "Background Test",
        type_line: "Legendary Enchantment — Background",
        oracle_text: "Commander creatures you own have something.\nThis can be your commander.",
      }),
    );

    expect(card.rules.canBeCommander).toBe(true);
  });

  it("maps game changers", () => {
    const card = mapScryfallCardToCard(createScryfallCard({ game_changer: true }));

    expect(card.rules.isGameChanger).toBe(true);
  });

  it("maps banned Commander legality", () => {
    const card = mapScryfallCardToCard(
      createScryfallCard({
        legalities: {
          commander: "banned",
        },
      }),
    );

    expect(card.rules.commanderLegality).toBe("banned");
  });
});

function createScryfallCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: "scryfall-id",
    oracle_id: "oracle-id",
    name: "Atraxa, Praetors' Voice",
    set: "c16",
    collector_number: "28",
    mana_cost: "{G}{W}{U}{B}",
    cmc: 4,
    colors: ["W", "U", "B", "G"],
    color_identity: ["W", "U", "B", "G"],
    type_line: "Legendary Creature — Phyrexian Angel Horror",
    oracle_text: "Flying, vigilance, deathtouch, lifelink",
    legalities: {
      commander: "legal",
    },
    ...overrides,
  };
}
