import type { DeckStructureSummary } from "../analysis/index.js";
import type { DeckCard, DeckList, FunctionalTag } from "../domain/index.js";

export type RecommendationPriority = "high" | "medium" | "low";

export interface DeckRecommendation {
  readonly priority: RecommendationPriority;
  readonly category: string;
  readonly message: string;
  readonly reason: string;
  readonly suggestedAdds: readonly string[];
  readonly suggestedCuts: readonly string[];
}

export function recommendDeckImprovements(deck: DeckList, structure: DeckStructureSummary): readonly DeckRecommendation[] {
  const deckSize = structure.composition.totalCards;
  const recommendations: DeckRecommendation[] = [];

  if (landRatio(structure) < 0.32) {
    recommendations.push({
      priority: "high",
      category: "mana_base",
      message: "Aumentare il numero di terre o fonti mana stabili.",
      reason: `Il mazzo ha ${structure.composition.landCount} terre su ${deckSize} carte.`,
      suggestedAdds: ["Command Tower", "Path of Ancestry", "terre doppie coerenti con la color identity"],
      suggestedCuts: findLowImpactCuts(deck, 3),
    });
  }

  if (normalizedRoleCount(deck, ["ramp", "fast_mana"], deckSize) < 8) {
    recommendations.push({
      priority: "high",
      category: "ramp",
      message: "Aumentare ramp o fast mana.",
      reason: "Il mazzo rischia di partire lentamente o non lanciare in curva le magie piu' costose.",
      suggestedAdds: ["Sol Ring", "Arcane Signet", "Fellwar Stone"],
      suggestedCuts: findLowImpactCuts(deck, 3),
    });
  }

  if (normalizedRoleCount(deck, ["card_draw", "card_selection"], deckSize) < 8) {
    recommendations.push({
      priority: "medium",
      category: "card_advantage",
      message: "Aumentare draw, selezione o fonti di vantaggio carte.",
      reason: "Il mazzo potrebbe finire le risorse o trovare con fatica i pezzi chiave.",
      suggestedAdds: ["generatore di card advantage coerente col comandante", "cantrip efficienti", "draw engine ripetibile"],
      suggestedCuts: findLowImpactCuts(deck, 2),
    });
  }

  if (normalizedRoleCount(deck, ["spot_removal", "board_wipe", "counterspell", "graveyard_hate"], deckSize) < 7) {
    recommendations.push({
      priority: "medium",
      category: "interaction",
      message: "Aumentare interaction.",
      reason: "Il mazzo ha poche risposte a minacce, combo o permanenti problematici.",
      suggestedAdds: ["Swords to Plowshares", "Counterspell", "removal flessibile nei colori del mazzo"],
      suggestedCuts: findLowImpactCuts(deck, 2),
    });
  }

  if (normalizedRoleCount(deck, ["win_condition", "combo_payoff"], deckSize) < 2) {
    recommendations.push({
      priority: "medium",
      category: "win_conditions",
      message: "Chiarire le win condition.",
      reason: "Il mazzo sembra avere pochi modi espliciti per chiudere la partita.",
      suggestedAdds: ["payoff principale del tema", "combo payoff se coerente", "finisher resiliente"],
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
