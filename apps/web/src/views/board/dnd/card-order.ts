interface IndexedCard {
  publicId: string;
  index: number;
}

interface CardList<TCard extends IndexedCard> {
  publicId: string;
  cards: TCard[];
}

export function moveCardInLists<
  TCard extends IndexedCard,
  TList extends CardList<TCard>,
>(
  lists: TList[],
  cardPublicId: string,
  destinationListPublicId: string,
  destinationIndex: number,
): TList[] | null {
  const nextLists = lists.map((list) => ({
    ...list,
    cards: list.cards.map((card) => ({ ...card })),
  })) as TList[];

  const sourceList = nextLists.find((list) =>
    list.cards.some((card) => card.publicId === cardPublicId),
  );
  const destinationList = nextLists.find(
    (list) => list.publicId === destinationListPublicId,
  );
  if (!sourceList || !destinationList) return null;

  const sourceArrayIndex = sourceList.cards.findIndex(
    (card) => card.publicId === cardPublicId,
  );
  const [movedCard] = sourceList.cards.splice(sourceArrayIndex, 1);
  if (!movedCard) return null;

  const clampedDestinationIndex = Math.max(
    0,
    Math.min(destinationIndex, destinationList.cards.length),
  );
  destinationList.cards.splice(clampedDestinationIndex, 0, movedCard);

  const affectedLists = new Set([
    sourceList.publicId,
    destinationList.publicId,
  ]);
  for (const list of nextLists) {
    if (!affectedLists.has(list.publicId)) continue;
    list.cards = list.cards.map((card, index) => ({ ...card, index }));
  }

  return nextLists;
}
