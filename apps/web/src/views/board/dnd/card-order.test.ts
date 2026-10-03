import { describe, expect, it } from "vitest";

import { moveCardInLists } from "./card-order";

describe("moveCardInLists", () => {
  it("moves a card by public ID rather than its stored database index", () => {
    const lists = [
      {
        publicId: "source",
        cards: [
          { publicId: "card-a", index: 40 },
          { publicId: "card-b", index: 41 },
        ],
      },
      {
        publicId: "destination",
        cards: [
          { publicId: "card-c", index: 10 },
          { publicId: "card-d", index: 11 },
        ],
      },
    ];

    const result = moveCardInLists(lists, "card-a", "destination", 1);

    expect(
      result?.map((list) => list.cards.map((card) => card.publicId)),
    ).toEqual([["card-b"], ["card-c", "card-a", "card-d"]]);
    expect(result?.map((list) => list.cards.map((card) => card.index))).toEqual(
      [[0], [0, 1, 2]],
    );
    expect(lists[0]?.cards.map((card) => card.publicId)).toEqual([
      "card-a",
      "card-b",
    ]);
  });

  it("reorders cards in the same list using the requested final index", () => {
    const lists = [
      {
        publicId: "list-a",
        cards: [
          { publicId: "card-a", index: 0 },
          { publicId: "card-b", index: 1 },
          { publicId: "card-c", index: 2 },
        ],
      },
    ];

    const result = moveCardInLists(lists, "card-a", "list-a", 1);

    expect(result?.[0]?.cards).toEqual([
      { publicId: "card-b", index: 0 },
      { publicId: "card-a", index: 1 },
      { publicId: "card-c", index: 2 },
    ]);
  });
});
