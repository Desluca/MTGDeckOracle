import type { Card, CardLegality, CardType, Color, FunctionalTag } from "../../src/domain/index.js";
import { normalizeLookupName } from "../../src/card-data/index.js";

export interface TestCardOptions {
  readonly name: string;
  readonly colors?: readonly Color[];
  readonly colorIdentity?: readonly Color[];
  readonly types?: readonly CardType[];
  readonly typeLine?: string;
  readonly oracleText?: string;
  readonly commanderLegality?: CardLegality;
  readonly canBeCommander?: boolean;
  readonly isGameChanger?: boolean;
  readonly manaValue?: number;
  readonly functionalTags?: readonly FunctionalTag[];
  readonly basePowerRating?: number;
  readonly subtypes?: readonly string[];
}

export function createTestCard(options: TestCardOptions): Card {
  const colors = options.colors ?? options.colorIdentity ?? [];
  const colorIdentity = options.colorIdentity ?? colors;
  const typeLine = options.typeLine ?? (options.canBeCommander ? "Legendary Creature — Test" : "Instant");
  const types = options.types ?? inferTypesFromTypeLine(typeLine);

  return {
    identity: {
      id: normalizeLookupName(options.name),
      name: options.name,
      normalizedName: normalizeLookupName(options.name),
    },
    rules: {
      manaValue: options.manaValue ?? 1,
      colors,
      colorIdentity,
      supertypes: typeLine.toLowerCase().includes("legendary") ? ["legendary"] : [],
      types,
      subtypes: options.subtypes ?? parseSubtypes(typeLine),
      typeLine,
      oracleText: options.oracleText ?? "",
      commanderLegality: options.commanderLegality ?? "legal",
      canBeCommander: options.canBeCommander ?? false,
      isGameChanger: options.isGameChanger ?? false,
    },
    evaluation: {
      functionalTags: options.functionalTags ?? [],
      ...(options.basePowerRating !== undefined ? { basePowerRating: options.basePowerRating } : {}),
    },
  };
}

function inferTypesFromTypeLine(typeLine: string): readonly CardType[] {
  const lower = typeLine.toLowerCase();
  const types: CardType[] = [];
  const candidates: readonly CardType[] = ["land", "creature", "artifact", "enchantment", "instant", "sorcery", "planeswalker", "battle"];

  for (const type of candidates) {
    if (lower.includes(type)) {
      types.push(type);
    }
  }

  return types.length > 0 ? types : ["instant"];
}

function parseSubtypes(typeLine: string): readonly string[] {
  const [, subtypeLine] = typeLine.split(/\s+[—–-]\s+/);
  return subtypeLine?.split(/\s+/).filter(Boolean) ?? [];
}

export function createCardMap(cards: readonly Card[]): ReadonlyMap<string, Card> {
  return new Map(cards.map((card) => [card.identity.normalizedName, card]));
}
