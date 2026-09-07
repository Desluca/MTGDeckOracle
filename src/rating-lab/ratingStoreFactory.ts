import { join } from "node:path";

import { FileRatingStore, type RatingStore } from "./ratingStore.js";
import { PostgresRatingStore } from "./postgresRatingStore.js";

export function createRatingStore(): RatingStore {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return new PostgresRatingStore(databaseUrl);
  }

  return new FileRatingStore(process.env.RATING_LAB_DB_PATH ?? join(process.cwd(), ".cache", "rating-lab-db.json"));
}
