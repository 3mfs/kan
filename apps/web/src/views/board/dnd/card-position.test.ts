import { describe, expect, it } from "vitest";

import { getCardInsertionIndex, getNearestCardId } from "./card-position";

const cards = [{ publicId: "card-1" }, { publicId: "card-2" }];

describe("card drop positioning", () => {
  it("places a card above the first card", () => {
    expect(
      getCardInsertionIndex(cards, "card-1", 90, { top: 100, height: 50 }),
    ).toBe(0);
  });

  it("places a card between two cards when the first card is nearest", () => {
    expect(
      getCardInsertionIndex(cards, "card-1", 160, {
        top: 100,
        height: 50,
      }),
    ).toBe(1);
  });

  it("places a card between two cards when the second card is nearest", () => {
    expect(
      getCardInsertionIndex(cards, "card-2", 160, {
        top: 170,
        height: 50,
      }),
    ).toBe(1);
  });

  it("places a card below the last card", () => {
    expect(
      getCardInsertionIndex(cards, "card-2", 230, {
        top: 170,
        height: 50,
      }),
    ).toBe(2);
  });

  it("places a card first when the column header is the drop target", () => {
    expect(getCardInsertionIndex(cards, null, 50, { top: 0, height: 0 })).toBe(
      0,
    );
  });

  it("selects the nearest card using the pointer rather than card height", () => {
    const cardRects = [
      { id: "card-1", top: 100, height: 50 },
      { id: "card-2", top: 170, height: 50 },
    ];

    expect(getNearestCardId(90, cardRects)).toBe("card-1");
    expect(getNearestCardId(160, cardRects)).toBe("card-1");
    expect(getNearestCardId(230, cardRects)).toBe("card-2");
  });
});
