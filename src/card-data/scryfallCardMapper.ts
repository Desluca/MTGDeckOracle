import type { Card, CardLegality, CardSupertype, CardType, Color } from "../domain/index.js";
import { normalizeLookupName } from "./cardDataSource.js";
import type { ScryfallCard } from "./scryfallTypes.js";

const CARD_TYPES: readonly CardType[] = [
  "artifact",
  "battle",
  "creature",
  "enchantment",
  "instant",
  "land",
  "planeswalker",
  "sorcery",
  "tribal",
];

const CARD_SUPERTYPES: readonly CardSupertype[] = [
  "basic",
  "legendary",
  "snow",
  "world",
  "ongoing",
];

export function mapScryfallCardToCard(scryfallCard: ScryfallCard): Card {
  const oracleText = getOracleText(scryfallCard);
  const typeLine = scryfallCard.type_line;

  return {
    identity: {
      id: scryfallCard.oracle_id ?? scryfallCard.id,
      name: scryfallCard.name,
      normalizedName: normalizeLookupName(scryfallCard.name),
    },
    print: {
      setCode: scryfallCard.set,
      collectorNumber: scryfallCard.collector_number,
      scryfallId: scryfallCard.id,
      ...(scryfallCard.oracle_id ? { oracleId: scryfallCard.oracle_id } : {}),
    },
    rules: {
      ...(scryfallCard.mana_cost ? { manaCost: scryfallCard.mana_cost } : {}),
      manaValue: scryfallCard.cmc,
      colors: scryfallCard.colors ?? getFaceColors(scryfallCard),
      colorIdentity: scryfallCard.color_identity,
      supertypes: parseSupertypes(typeLine),
      types: parseCardTypes(typeLine),
      subtypes: parseSubtypes(typeLine),
      typeLine,
      oracleText,
      commanderLegality: mapCommanderLegality(scryfallCard.legalities.commander),
      canBeCommander: canBeCommander(typeLine, oracleText),
      isGameChanger: scryfallCard.game_changer ?? false,
    },
    evaluation: {
      functionalTags: [],
    },
  };
}

function getOracleText(scryfallCard: ScryfallCard): string {
  if (scryfallCard.oracle_text) {
    return scryfallCard.oracle_text;
  }

  return scryfallCard.card_faces?.map((face) => face.oracle_text).filter(Boolean).join("\n---\n") ?? "";
}

function getFaceColors(scryfallCard: ScryfallCard): readonly Color[] {
  const colors = new Set<Color>();

  for (const face of scryfallCard.card_faces ?? []) {
    for (const color of face.colors ?? []) {
      colors.add(color);
    }
  }

  return [...colors];
}

function parseSupertypes(typeLine: string): readonly CardSupertype[] {
  const normalizedTypeLine = typeLine.toLowerCase();
  return CARD_SUPERTYPES.filter((supertype) => normalizedTypeLine.includes(supertype));
}

function parseCardTypes(typeLine: string): readonly CardType[] {
  const normalizedTypeLine = typeLine.toLowerCase();
  const foundTypes = CARD_TYPES.filter((cardType) => normalizedTypeLine.includes(cardType));
  return foundTypes.length > 0 ? foundTypes : ["unknown"];
}

function parseSubtypes(typeLine: string): readonly string[] {
  const [, subtypes] = typeLine.split("—").map((part) => part.trim());
  return subtypes?.split(/\s+/).filter(Boolean) ?? [];
}

function mapCommanderLegality(commanderLegality: string | undefined): CardLegality {
  switch (commanderLegality) {
    case "legal":
      return "legal";
    case "banned":
      return "banned";
    case "restricted":
      return "restricted";
    case "not_legal":
      return "not_legal";
    default:
      return "unknown";
  }
}

function canBeCommander(typeLine: string, oracleText: string): boolean {
  const normalizedTypeLine = typeLine.toLowerCase();
  const normalizedOracleText = oracleText.toLowerCase();

  return (
    (normalizedTypeLine.includes("legendary") && normalizedTypeLine.includes("creature")) ||
    normalizedOracleText.includes("can be your commander")
  );
}
