import { describe, expect, it } from "vitest";

import { workspaceCardPrefixSchema } from "./workspace";

describe("workspaceCardPrefixSchema", () => {
  it("trims and normalizes a valid prefix", () => {
    expect(workspaceCardPrefixSchema.parse(" eng ")).toBe("ENG");
  });

  it.each(["", "TOO-LONG-PREFIX", "with spaces", "ENG_"])(
    "rejects invalid prefix %s",
    (prefix) => {
      expect(() => workspaceCardPrefixSchema.parse(prefix)).toThrow();
    },
  );
});
