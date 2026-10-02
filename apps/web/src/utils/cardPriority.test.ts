import { describe, expect, it } from "vitest";

import { getCardPriorityHeaderClass } from "./cardPriority";

describe("getCardPriorityHeaderClass", () => {
  it("returns a red header for very high priority", () => {
    expect(getCardPriorityHeaderClass("very_high")).toBe(
      "bg-red-200 dark:bg-red-900",
    );
  });

  it("returns an orange header for high priority", () => {
    expect(getCardPriorityHeaderClass("high")).toBe(
      "bg-orange-200 dark:bg-orange-900",
    );
  });

  it("returns blue and green headers for normal and low priority", () => {
    expect(getCardPriorityHeaderClass("normal")).toBe(
      "bg-blue-200 dark:bg-blue-900",
    );
    expect(getCardPriorityHeaderClass("low")).toBe(
      "bg-green-200 dark:bg-green-900",
    );
  });

  it("does not color cards without a recognized priority", () => {
    expect(getCardPriorityHeaderClass(null)).toBeNull();
    expect(getCardPriorityHeaderClass(undefined)).toBeNull();
  });
});
