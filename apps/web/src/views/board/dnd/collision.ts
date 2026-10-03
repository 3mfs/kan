import type { CollisionDetection, UniqueIdentifier } from "@dnd-kit/core";
import {
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";

import type { DragData } from "./types";

function getData(
  entity: { data: { current: unknown } } | undefined,
): DragData | undefined {
  return entity?.data.current as DragData | undefined;
}

export function createBoardCollisionDetection(lastOverIdRef: {
  current: UniqueIdentifier | null;
}, pointerYRef: { current: number | null }): CollisionDetection {
  return (args) => {
    pointerYRef.current = args.pointerCoordinates?.y ?? null;
    const activeData = getData(args.active);

    if (activeData?.type === "LIST") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (container) => getData(container)?.type === "LIST",
        ),
      });
    }

    const pointerIntersections = pointerWithin(args);
    const intersections =
      pointerIntersections.length > 0
        ? pointerIntersections
        : rectIntersection(args);

    let overId = getFirstCollision(intersections, "id");

    if (overId != null) {
      const overContainer = args.droppableContainers.find(
        (container) => container.id === overId,
      );
      let overData = getData(overContainer);

      // The column drop zone covers the whole column so its header and
      // padding are valid targets. If the pointer is actually over the card
      // area, prefer the more specific body drop zone for normal sorting.
      if (overData?.type === "LIST_HEADER" && args.pointerCoordinates) {
        const headerListPublicId = overData.listPublicId;
        const bodyContainer = args.droppableContainers.find((container) => {
          const data = getData(container);
          return (
            data?.type === "LIST_BODY" &&
            data.listPublicId === headerListPublicId
          );
        });
        const bodyRect = bodyContainer
          ? args.droppableRects.get(bodyContainer.id)
          : undefined;
        const { x, y } = args.pointerCoordinates;

        if (
          bodyContainer &&
          bodyRect &&
          x >= bodyRect.left &&
          x <= bodyRect.right &&
          y >= bodyRect.top &&
          y <= bodyRect.bottom
        ) {
          overId = bodyContainer.id;
          overData = getData(bodyContainer);
        }
      }

      if (overData?.type === "LIST_BODY") {
        const cardContainers = args.droppableContainers.filter((container) => {
          const data = getData(container);
          return (
            data?.type === "CARD" && data.listPublicId === overData.listPublicId
          );
        });

        if (cardContainers.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: cardContainers,
          })[0]?.id;

          if (closest != null) {
            overId = closest;
          }
        }
      }

      lastOverIdRef.current = overId;
      return [{ id: overId }];
    }

    return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
  };
}
