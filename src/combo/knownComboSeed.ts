import { normalizeLookupName } from "../card-data/index.js";
import type { KnownCombo } from "../domain/index.js";

/**
 * Checked-in Spellbook subset used by tests, `--offline`, and CI.
 * Keep this small and tied to fixture lists; the full catalog stays in
 * gitignored `.cache/commander-spellbook-combos.json` via `npm run build-combo-cache`.
 */
export const knownComboSeed: readonly KnownCombo[] = [
  {
    id: "isochron-dramatic",
    name: "Isochron Scepter + Dramatic Reversal",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Isochron Scepter", required: true },
      { cardName: "Dramatic Reversal", required: true },
    ],
    outcomes: ["infinite_mana"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 3,
    description: "Untap rocks with the imprinted reversal to make infinite mana.",
  },
  {
    id: "isochron-dramatic-ballista",
    name: "Isochron Scepter + Dramatic Reversal + Walking Ballista",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Isochron Scepter", required: true },
      { cardName: "Dramatic Reversal", required: true },
      { cardName: "Walking Ballista", required: true },
    ],
    outcomes: ["wins_game", "infinite_damage"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 4,
    description: "Infinite mana plus Ballista removes the table.",
  },
  {
    id: "thoracle-consult",
    name: "Thassa's Oracle + Demonic Consultation",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Thassa's Oracle", required: true },
      { cardName: "Demonic Consultation", required: true },
    ],
    outcomes: ["wins_game"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 3,
    description: "Exile the library and win with Oracle's devotion check.",
  },
  {
    id: "thoracle-tainted-pact",
    name: "Thassa's Oracle + Tainted Pact",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Thassa's Oracle", required: true },
      { cardName: "Tainted Pact", required: true },
    ],
    outcomes: ["wins_game"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 4,
    description: "Empty the library with Tainted Pact, then win with Oracle.",
  },
  {
    id: "breach-led-brain-freeze",
    name: "Underworld Breach + Lion's Eye Diamond + Brain Freeze",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Underworld Breach", required: true },
      { cardName: "Lion's Eye Diamond", required: true },
      { cardName: "Brain Freeze", required: true },
    ],
    outcomes: ["wins_game", "infinite_mill"],
    estimatedSpeed: "instant",
    estimatedClosingTurnMana: 4,
    description: "Storm mill with LED rituals from the graveyard under Breach.",
  },
  {
    id: "dualcaster-twinflame",
    name: "Dualcaster Mage + Twinflame",
    source: "commander_spellbook",
    pieces: [
      { cardName: "Dualcaster Mage", required: true },
      { cardName: "Twinflame", required: true },
    ],
    outcomes: ["infinite_tokens", "wins_game"],
    estimatedSpeed: "sorcery",
    estimatedClosingTurnMana: 6,
    description: "Copy Twinflame targeting Dualcaster Mage for infinite hasty copies.",
  },
];

export function indexCombosByCard(combos: readonly KnownCombo[] = knownComboSeed): Record<string, KnownCombo[]> {
  const byCard: Record<string, KnownCombo[]> = {};

  for (const combo of combos) {
    const names = combo.pieces.flatMap((piece) => [piece.cardName, ...(piece.alternatives ?? [])]);
    for (const cardName of names) {
      const normalizedName = normalizeLookupName(cardName);
      const existing = byCard[normalizedName] ?? [];
      if (!existing.some((candidate) => candidate.id === combo.id)) {
        byCard[normalizedName] = [...existing, combo];
      }
    }
  }

  return byCard;
}

export function createComboSeedCache(combos: readonly KnownCombo[] = knownComboSeed) {
  return {
    catalog: combos,
    byCard: indexCombosByCard(combos),
  };
}
