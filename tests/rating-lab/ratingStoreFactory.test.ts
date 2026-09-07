import { afterEach, describe, expect, it, vi } from "vitest";

import { createRatingStore, FileRatingStore, PostgresRatingStore } from "../../src/rating-lab/index.js";

describe("createRatingStore", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the file store when DATABASE_URL is not set", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(createRatingStore()).toBeInstanceOf(FileRatingStore);
  });

  it("uses PostgreSQL when DATABASE_URL is set", () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:password@example.com:5432/mtgdeckoracle");

    expect(createRatingStore()).toBeInstanceOf(PostgresRatingStore);
  });
});
