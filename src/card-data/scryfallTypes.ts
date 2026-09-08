import type { Color } from "../domain/index.js";

export interface ScryfallCard {
  readonly id: string;
  readonly oracle_id?: string;
  readonly name: string;
  readonly set?: string;
  readonly collector_number?: string;
  readonly mana_cost?: string;
  readonly cmc: number;
  readonly colors?: readonly Color[];
  readonly color_identity: readonly Color[];
  readonly type_line: string;
  readonly oracle_text?: string;
  readonly legalities: Readonly<Record<string, string>>;
  readonly card_faces?: readonly ScryfallCardFace[];
  readonly game_changer?: boolean;
}

export interface ScryfallCardFace {
  readonly name: string;
  readonly mana_cost?: string;
  readonly colors?: readonly Color[];
  readonly type_line?: string;
  readonly oracle_text?: string;
}

export interface ScryfallCollectionResponse {
  readonly data: readonly ScryfallCard[];
  readonly not_found?: readonly ScryfallIdentifier[];
}

export interface ScryfallIdentifier {
  readonly name: string;
}

export interface ScryfallBulkData {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly download_uri: string;
  readonly updated_at?: string;
  readonly size?: number;
}
