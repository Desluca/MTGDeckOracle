import { describe, expect, it } from "vitest";

import {
  commanderThemeMultiplier,
  inferCommanderThemes,
  mentionsCreatureType,
} from "../../src/scoring/index.js";
import { createTestCard } from "../utils/cardFactory.js";
import { createResolvedTestDeck, mainboardCard } from "../utils/resolvedDeckFactory.js";

describe("inferCommanderThemes", () => {
  it("returns no themes for a generic commander", () => {
    const deck = createResolvedTestDeck({
      mainboard: [mainboardCard(createTestCard({ name: "Filler" }))],
    });

    expect(inferCommanderThemes(deck.cards)).toEqual([]);
  });

  it("detects multiple commander themes from tags and oracle text", () => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Teysa Karlov",
          canBeCommander: true,
          typeLine: "Legendary Creature — Human Advisor",
          oracleText:
            "If a creature dying causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time. Whenever a creature you control dies, you gain 1 life.",
          functionalTags: ["aristocrats", "lifegain"],
        }),
      ],
      mainboard: [mainboardCard(createTestCard({ name: "Filler" }))],
    });

    expect(inferCommanderThemes(deck.cards)).toEqual(expect.arrayContaining(["aristocrats", "lifegain"]));
  });

  it.each([
    {
      name: "Muldrotha, the Gravetide",
      oracleText: "You may play lands and cast permanent spells from your graveyard.",
      expected: "graveyard",
    },
    {
      name: "Urza, Lord High Artificer",
      oracleText: "Tap an untapped artifact you control: Add {C}.",
      expected: "artifacts",
    },
    {
      name: "Adeline, Resplendent Cathar",
      oracleText: "Whenever you attack, create X 1/1 white Human creature tokens.",
      expected: "tokens",
    },
    {
      name: "Mizzix of the Izmagnus",
      oracleText: "Whenever you cast an instant or sorcery spell, you get an experience counter.",
      expected: "spellslinger",
    },
    {
      name: "Heliod, Sun-Crowned",
      oracleText: "Lifelink. Whenever you gain life, put a +1/+1 counter on target creature or enchantment you control.",
      expected: "lifegain",
    },
    {
      name: "Teysa, Orzhov Scion",
      oracleText: "Sacrifice three white creatures: Exile target creature.",
      expected: "aristocrats",
    },
    {
      name: "Atraxa, Praetors' Voice",
      oracleText: "At the beginning of your end step, proliferate.",
      expected: "counters",
    },
    {
      name: "Sythis, Harvest's Hand",
      oracleText: "Whenever you cast an enchantment spell, you gain 1 life and draw a card. Enchantments you control have hexproof.",
      expected: "enchantments",
    },
    {
      name: "Ardenn, Intrepid Archaeologist",
      oracleText: "At the beginning of combat on your turn, you may attach any number of Auras and Equipment you control to target creature.",
      expected: "equipment",
    },
    {
      name: "Krenko, Mob Boss",
      typeLine: "Legendary Creature — Goblin Warrior",
      oracleText: "Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.",
      expected: "tribal",
    },
    {
      name: "Aesi, Tyrant of Gyre Strait",
      oracleText: "You may play an additional land on each of your turns. Whenever a land you control enters, you draw a card.",
      expected: "landfall",
    },
    {
      name: "Brago, King Eternal",
      oracleText: "Whenever Brago deals combat damage to a player, exile any number of target nonland permanents you control, then return those cards to the battlefield under their owner's control.",
      expected: "blink",
    },
    {
      name: "Teferi, Mage of Zhalfir",
      oracleText: "Flash. Creature cards you own that aren't on the battlefield have flash. Each opponent can cast spells only any time they could cast a sorcery.",
      expected: "control",
    },
  ] as const)("detects $expected from $name", ({ name, oracleText, expected, ...rest }) => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name,
          canBeCommander: true,
          typeLine: "typeLine" in rest ? rest.typeLine : "Legendary Creature — Test",
          oracleText,
        }),
      ],
    });

    expect(inferCommanderThemes(deck.cards)).toContain(expected);
  });

  it("does not treat gaining control as lifegain", () => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Control Commander",
          canBeCommander: true,
          typeLine: "Legendary Creature — Wizard",
          oracleText: "You gain control of target creature.",
        }),
      ],
    });

    expect(inferCommanderThemes(deck.cards)).not.toContain("lifegain");
  });

  it("does not treat nontoken text as a token theme", () => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Nontoken Commander",
          canBeCommander: true,
          typeLine: "Legendary Creature — Soldier",
          oracleText: "Nontoken creatures you control get +1/+1.",
        }),
      ],
    });

    expect(inferCommanderThemes(deck.cards)).not.toContain("tokens");
  });

  it("merges themes from partner commanders", () => {
    const deck = createResolvedTestDeck({
      commanders: [
        createTestCard({
          name: "Muldrotha, the Gravetide",
          canBeCommander: true,
          typeLine: "Legendary Creature — Elemental Avatar",
          oracleText: "You may play lands and cast permanent spells from your graveyard.",
        }),
        createTestCard({
          name: "Urza, Lord High Artificer",
          canBeCommander: true,
          typeLine: "Legendary Creature — Human Artificer",
          oracleText: "Tap an untapped artifact you control: Add {C}.",
        }),
      ],
    });

    expect(inferCommanderThemes(deck.cards)).toEqual(expect.arrayContaining(["graveyard", "artifacts"]));
  });
});

describe("commanderThemeMultiplier", () => {
  it("doubles only the matching package target", () => {
    expect(commanderThemeMultiplier("graveyard", ["graveyard"])).toBe(2);
    expect(commanderThemeMultiplier("artifacts", ["graveyard"])).toBe(1);
    expect(commanderThemeMultiplier("unknown", ["tokens"])).toBe(1);
  });
});

describe("mentionsCreatureType", () => {
  it("matches irregular elf plurals and regular goblin plurals", () => {
    expect(mentionsCreatureType("other elves you control", "Elf")).toBe(true);
    expect(mentionsCreatureType("goblins you control", "Goblin")).toBe(true);
    expect(mentionsCreatureType("angels you control", "Bear")).toBe(false);
  });
});
