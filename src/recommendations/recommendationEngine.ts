import { normalizeLookupName } from "../card-data/index.js";
import type { DeckStructureSummary } from "../analysis/index.js";
import type { Color, DeckCard, DeckList, FunctionalTag } from "../domain/index.js";

export type RecommendationPriority = "high" | "medium" | "low";

export interface DeckRecommendation {
  readonly priority: RecommendationPriority;
  readonly category: string;
  readonly message: string;
  readonly reason: string;
  readonly suggestedAdds: readonly string[];
  readonly suggestedCuts: readonly string[];
}

interface CardSuggestion {
  readonly name: string;
  readonly colorIdentity: readonly Color[];
}

const MANA_BASE_CARDS: readonly CardSuggestion[] = [
  { name: "Command Tower", colorIdentity: [] },
  { name: "Path of Ancestry", colorIdentity: [] },
  { name: "Exotic Orchard", colorIdentity: [] },
];

const RAMP_CARDS: readonly CardSuggestion[] = [
  { name: "Sol Ring", colorIdentity: [] },
  { name: "Arcane Signet", colorIdentity: [] },
  { name: "Fellwar Stone", colorIdentity: [] },
  { name: "Nature's Lore", colorIdentity: ["G"] },
  { name: "Three Visits", colorIdentity: ["G"] },
  { name: "Dark Ritual", colorIdentity: ["B"] },
];

const CARD_ADVANTAGE_CARDS: readonly CardSuggestion[] = [
  { name: "Brainstorm", colorIdentity: ["U"] },
  { name: "Night's Whisper", colorIdentity: ["B"] },
  { name: "Harmonize", colorIdentity: ["G"] },
  { name: "Esper Sentinel", colorIdentity: ["W"] },
  { name: "Guardian Project", colorIdentity: ["G"] },
  { name: "Phyrexian Arena", colorIdentity: ["B"] },
  { name: "Fact or Fiction", colorIdentity: ["U"] },
];

const INTERACTION_CARDS: readonly CardSuggestion[] = [
  { name: "Swords to Plowshares", colorIdentity: ["W"] },
  { name: "Path to Exile", colorIdentity: ["W"] },
  { name: "Counterspell", colorIdentity: ["U"] },
  { name: "Swan Song", colorIdentity: ["U"] },
  { name: "Pongify", colorIdentity: ["U"] },
  { name: "Beast Within", colorIdentity: ["G"] },
  { name: "Nature's Claim", colorIdentity: ["G"] },
  { name: "Chaos Warp", colorIdentity: ["R"] },
  { name: "Toxic Deluge", colorIdentity: ["B"] },
  { name: "Generous Gift", colorIdentity: ["W"] },
  { name: "Assassin's Trophy", colorIdentity: ["B", "G"] },
];

const WIN_CONDITION_CARDS: readonly CardSuggestion[] = [
  { name: "Walking Ballista", colorIdentity: [] },
  { name: "Craterhoof Behemoth", colorIdentity: ["G"] },
  { name: "Overwhelming Stampede", colorIdentity: ["G"] },
];

export function recommendDeckImprovements(deck: DeckList, structure: DeckStructureSummary): readonly DeckRecommendation[] {
  const deckSize = structure.composition.totalCards;
  const recommendations: DeckRecommendation[] = [];

  if (landRatio(structure) < 0.32) {
    recommendations.push({
      priority: "high",
      category: "mana_base",
      message: "Aumentare il numero di terre o fonti mana stabili.",
      reason: `Il mazzo ha ${structure.composition.landCount} terre su ${deckSize} carte.`,
      suggestedAdds: [
        ...legalCardSuggestions(deck, MANA_BASE_CARDS, 2),
        "terre doppie coerenti con la color identity",
      ],
      suggestedCuts: findLowImpactCuts(deck, 3),
    });
  }

  if (normalizedRoleCount(deck, ["ramp", "fast_mana"], deckSize) < 8) {
    recommendations.push({
      priority: "high",
      category: "ramp",
      message: "Aumentare ramp o fast mana.",
      reason: "Il mazzo rischia di partire lentamente o non lanciare in curva le magie piu' costose.",
      suggestedAdds: legalCardSuggestions(deck, RAMP_CARDS, 3),
      suggestedCuts: findLowImpactCuts(deck, 3),
    });
  }

  if (normalizedRoleCount(deck, ["card_draw", "card_selection"], deckSize) < 8) {
    recommendations.push({
      priority: "medium",
      category: "card_advantage",
      message: "Aumentare draw, selezione o fonti di vantaggio carte.",
      reason: "Il mazzo potrebbe finire le risorse o trovare con fatica i pezzi chiave.",
      suggestedAdds: [
        ...legalCardSuggestions(deck, CARD_ADVANTAGE_CARDS, 2),
        "draw engine ripetibile coerente col comandante",
      ],
      suggestedCuts: findLowImpactCuts(deck, 2),
    });
  }

  if (normalizedRoleCount(deck, ["spot_removal", "board_wipe", "counterspell", "graveyard_hate"], deckSize) < 7) {
    recommendations.push({
      priority: "medium",
      category: "interaction",
      message: "Aumentare interaction.",
      reason: "Il mazzo ha poche risposte a minacce, combo o permanenti problematici.",
      suggestedAdds: [
        ...legalCardSuggestions(deck, INTERACTION_CARDS, 2),
        "removal flessibile nei colori del mazzo",
      ],
      suggestedCuts: findLowImpactCuts(deck, 2),
    });
  }

  if (normalizedRoleCount(deck, ["win_condition", "combo_payoff"], deckSize) < 2) {
    recommendations.push({
      priority: "medium",
      category: "win_conditions",
      message: "Chiarire le win condition.",
      reason: "Il mazzo sembra avere pochi modi espliciti per chiudere la partita.",
      suggestedAdds: [
        ...legalCardSuggestions(deck, WIN_CONDITION_CARDS, 1),
        "payoff principale del tema",
        "finisher resiliente",
      ],
      suggestedCuts: findLowImpactCuts(deck, 2),
    });
  }

  if (structure.composition.averageManaValue > 3.5) {
    recommendations.push({
      priority: "medium",
      category: "curve",
      message: "Abbassare la curva di mana.",
      reason: `Il mana value medio e' ${structure.composition.averageManaValue}, quindi il mazzo puo' avere mani lente.`,
      suggestedAdds: ["spell a costo 1-2 coerenti col piano", "ramp economico", "interaction efficiente"],
      suggestedCuts: findExpensiveCuts(deck, 3),
    });
  }

  return recommendations;
}

export function isLegalSuggestionForIdentity(
  colorIdentity: readonly Color[],
  commanderColorIdentity: readonly Color[],
): boolean {
  return colorIdentity.every((color) => commanderColorIdentity.includes(color));
}

function legalCardSuggestions(deck: DeckList, cards: readonly CardSuggestion[], limit: number): readonly string[] {
  const presentNames = new Set(
    commanderDeckCards(deck).map((deckCard) => deckCard.card.identity.normalizedName),
  );

  return cards
    .filter((card) => isLegalSuggestionForIdentity(card.colorIdentity, deck.commander.colorIdentity))
    .filter((card) => !presentNames.has(normalizeLookupName(card.name)))
    .slice(0, limit)
    .map((card) => card.name);
}

function landRatio(structure: DeckStructureSummary): number {
  if (structure.composition.totalCards === 0) {
    return 0;
  }

  return structure.composition.landCount / structure.composition.totalCards;
}

function normalizedRoleCount(deck: DeckList, tags: readonly FunctionalTag[], deckSize: number): number {
  if (deckSize === 0) {
    return 0;
  }

  const count = commanderDeckCards(deck).reduce((total, deckCard) => {
    const hasTag = tags.some((tag) => deckCard.card.evaluation.functionalTags.includes(tag));
    return total + (hasTag ? deckCard.quantity : 0);
  }, 0);

  return (count / deckSize) * 100;
}

function findLowImpactCuts(deck: DeckList, limit: number): readonly string[] {
  return commanderDeckCards(deck)
    .filter((deckCard) => !deckCard.card.rules.types.includes("land"))
    .filter((deckCard) => deckCard.card.evaluation.functionalTags.length === 0)
    .sort((left, right) => right.card.rules.manaValue - left.card.rules.manaValue)
    .slice(0, limit)
    .map((deckCard) => deckCard.card.identity.name);
}

function findExpensiveCuts(deck: DeckList, limit: number): readonly string[] {
  return commanderDeckCards(deck)
    .filter((deckCard) => !deckCard.card.rules.types.includes("land"))
    .sort((left, right) => right.card.rules.manaValue - left.card.rules.manaValue)
    .slice(0, limit)
    .map((deckCard) => deckCard.card.identity.name);
}

function commanderDeckCards(deck: DeckList): readonly DeckCard[] {
  return deck.cards.filter((deckCard) => deckCard.section === "commander" || deckCard.section === "mainboard");
}
