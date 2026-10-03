import type { CollisionDetection } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";

import { createBoardCollisionDetection } from "./collision";

type CollisionArgs = Parameters<CollisionDetection>[0];

const rect = (top: number, height: number) => ({
  top,
  bottom: top + height,
  left: 0,
  right: 300,
  width: 300,
  height,
});

function detectAt(pointerY: number) {
  const listRect = rect(0, 300);
  const bodyRect = rect(80, 220);
  const cardOneRect = rect(100, 50);
  const cardTwoRect = rect(170, 50);
  const droppableContainers = [
    { id: "list-a", data: { current: { type: "LIST" } } },
    {
      id: "list-body:list-a",
      data: { current: { type: "LIST_BODY", listPublicId: "list-a" } },
    },
    {
      id: "card-1",
      data: { current: { type: "CARD", listPublicId: "list-a" } },
    },
    {
      id: "card-2",
      data: { current: { type: "CARD", listPublicId: "list-a" } },
    },
  ];
  const args = {
    active: {
      id: "active-card",
      data: { current: { type: "CARD", listPublicId: "source-list" } },
    },
    collisionRect: rect(pointerY, 50),
    droppableContainers,
    droppableRects: new Map([
      ["list-a", listRect],
      ["list-body:list-a", bodyRect],
      ["card-1", cardOneRect],
      ["card-2", cardTwoRect],
    ]),
    pointerCoordinates: { x: 150, y: pointerY },
  } as unknown as CollisionArgs;

  const lastOverIdRef = { current: null };
  const pointerYRef = { current: null };
  return createBoardCollisionDetection(lastOverIdRef, pointerYRef)(args)[0]?.id;
}

describe("board collision detection", () => {
  it("uses the list target when dropping on its header", () => {
    expect(detectAt(50)).toBe("list-a");
  });

  it("selects the first card when dropping above it", () => {
    expect(detectAt(90)).toBe("card-1");
  });

  it("selects a neighboring card when dropping between cards", () => {
    expect(detectAt(160)).toBe("card-1");
  });

  it("selects the last card when dropping below it", () => {
    expect(detectAt(230)).toBe("card-2");
  });
});
