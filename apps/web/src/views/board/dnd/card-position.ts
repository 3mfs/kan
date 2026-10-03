import type { UniqueIdentifier } from "@dnd-kit/core";

interface CardRect {
  id: UniqueIdentifier;
  top: number;
  height: number;
}

export function getNearestCardId(
  pointerY: number,
  cards: CardRect[],
): UniqueIdentifier | null {
  return cards.reduce<{ id: UniqueIdentifier | null; distance: number }>(
    (nearest, card) => {
      const distance = Math.abs(pointerY - (card.top + card.height / 2));
      return distance < nearest.distance ? { id: card.id, distance } : nearest;
    },
    { id: null, distance: Number.POSITIVE_INFINITY },
  ).id;
}

export function getCardInsertionIndex(
  cards: { publicId: string }[],
  overCardId: string | null,
  dropY: number,
  overRect: { top: number; height: number },
): number {
  if (overCardId === null) return 0;

  const overIndex = cards.findIndex((card) => card.publicId === overCardId);
  if (overIndex === -1) return cards.length;

  return overIndex + (dropY > overRect.top + overRect.height / 2 ? 1 : 0);
}

export function getStableCardPreviewIndex(
  currentIndex: number,
  candidateIndex: number,
  pointerY: number | null,
  lastMovePointerY: number | null,
  movementThreshold: number,
): number {
  if (candidateIndex === currentIndex) return currentIndex;

  const direction = candidateIndex > currentIndex ? 1 : -1;
  if (pointerY === null || lastMovePointerY === null) {
    return currentIndex + direction;
  }

  const pointerMovement = pointerY - lastMovePointerY;
  const movedFarEnough = Math.abs(pointerMovement) >= movementThreshold;
  const movedInReorderDirection = Math.sign(pointerMovement) === direction;

  return movedFarEnough && movedInReorderDirection
    ? currentIndex + direction
    : currentIndex;
}
