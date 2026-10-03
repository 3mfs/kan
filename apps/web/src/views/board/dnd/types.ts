export interface ListDragData {
  type: "LIST";
}

export interface ListBodyDragData {
  type: "LIST_BODY";
  listPublicId: string;
}

export interface ListHeaderDragData {
  type: "LIST_HEADER";
  listPublicId: string;
}

export interface CardDragData {
  type: "CARD";
  listPublicId: string;
}

export type DragData =
  | ListDragData
  | ListBodyDragData
  | ListHeaderDragData
  | CardDragData;
