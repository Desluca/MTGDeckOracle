export type LegalitySeverity = "info" | "warning" | "error" | "blocking";

export type LegalityIssueCode =
  | "missing_commander"
  | "invalid_commander"
  | "invalid_deck_size"
  | "unknown_card"
  | "banned_card"
  | "not_legal_card"
  | "duplicate_card"
  | "color_identity_violation"
  | "unsupported_partner_configuration"
  | "ambiguous_parse";

export interface LegalityIssue {
  readonly code: LegalityIssueCode;
  readonly severity: LegalitySeverity;
  readonly message: string;
  readonly cardName?: string;
  readonly expected?: string;
  readonly actual?: string;
}

export interface CommanderLegalityReport {
  readonly isLegal: boolean;
  readonly legalityCap: number;
  readonly issues: readonly LegalityIssue[];
}
