export interface OrderedCard {
  id: number;
  index: number;
}

export function reorderCardsByPosition<TCard extends OrderedCard>(
  sourceCards: TCard[],
  destinationCards: TCard[],
  cardId: number,
  destinationIndex: number | undefined,
): { sourceCards: TCard[]; destinationCards: TCard[] } | null {
  const movedCard = sourceCards.find((card) => card.id === cardId);
  if (!movedCard) return null;

  const sourceWithoutMovedCard = sourceCards.filter(
    (card) => card.id !== cardId,
  );
  const destinationWithoutMovedCard = (
    sourceCards === destinationCards ? sourceWithoutMovedCard : destinationCards
  ).filter((card) => card.id !== cardId);
  const insertionIndex = Math.max(
    0,
    Math.min(
      destinationIndex ?? destinationWithoutMovedCard.length,
      destinationWithoutMovedCard.length,
    ),
  );

  return {
    sourceCards: sourceWithoutMovedCard,
    destinationCards: [
      ...destinationWithoutMovedCard.slice(0, insertionIndex),
      movedCard,
      ...destinationWithoutMovedCard.slice(insertionIndex),
    ],
  };
}
