import { defaultScoringWeights } from "./domain/index.js";

console.log("MTG Deck Oracle engine bootstrap", {
  scoringWeights: defaultScoringWeights,
});

export * from "./domain/index.js";
export * from "./analysis/index.js";
export * from "./card-data/index.js";
export * from "./combo/index.js";
export * from "./consistency/index.js";
export * from "./deck/index.js";
export * from "./explanation/index.js";
export * from "./parser/index.js";
export * from "./pipeline/index.js";
export * from "./probability/index.js";
export * from "./recommendations/index.js";
export * from "./report/index.js";
export * from "./ratings/index.js";
export * from "./rating-lab/index.js";
export * from "./scoring/index.js";
export * from "./tagging/index.js";
export * from "./validation/index.js";
