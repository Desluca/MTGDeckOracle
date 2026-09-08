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
  const types = options.types ?? (typeLine.toLowerCase().includes("creature") ? ["creature"] : ["instant"]);

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

function parseSubtypes(typeLine: string): readonly string[] {
  const [, subtypeLine] = typeLine.split(/\s+[—–-]\s+/);
  return subtypeLine?.split(/\s+/).filter(Boolean) ?? [];
}

export function createCardMap(cards: readonly Card[]): ReadonlyMap<string, Card> {
  return new Map(cards.map((card) => [card.identity.normalizedName, card]));
}
