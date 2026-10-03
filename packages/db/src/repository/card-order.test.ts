import { describe, expect, it } from "vitest";

import { reorderCardsByPosition } from "./card-order";

describe("reorderCardsByPosition", () => {
  it("uses ordinal position even when stored indexes have gaps", () => {
    const cards = [
      { id: 1, index: 0 },
      { id: 2, index: 2 },
      { id: 3, index: 3 },
    ];

    const result = reorderCardsByPosition(cards, cards, 1, 1);

    expect(result?.destinationCards.map((card) => card.id)).toEqual([2, 1, 3]);
  });

  it("moves a card between lists and appends when no position is supplied", () => {
    const sourceCards = [
      { id: 1, index: 0 },
      { id: 2, index: 1 },
    ];
    const destinationCards = [{ id: 3, index: 5 }];

    const result = reorderCardsByPosition(
      sourceCards,
      destinationCards,
      1,
      undefined,
    );

    expect(result?.sourceCards.map((card) => card.id)).toEqual([2]);
    expect(result?.destinationCards.map((card) => card.id)).toEqual([3, 1]);
  });

  it("clamps an out-of-range destination position", () => {
    const cards = [
      { id: 1, index: 0 },
      { id: 2, index: 1 },
    ];

    const result = reorderCardsByPosition(cards, cards, 2, 99);

    expect(result?.destinationCards.map((card) => card.id)).toEqual([1, 2]);
  });
});
