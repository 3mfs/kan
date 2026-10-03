import type { CollisionDetection, UniqueIdentifier } from "@dnd-kit/core";
import {
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";

import type { DragData } from "./types";
import { getNearestCardId } from "./card-position";

function getData(
  entity: { data: { current: unknown } } | undefined,
): DragData | undefined {
  return entity?.data.current as DragData | undefined;
}

export function createBoardCollisionDetection(
  lastOverIdRef: { current: UniqueIdentifier | null },
  pointerYRef: { current: number | null },
): CollisionDetection {
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

    const pointerIntersections = pointerWithin(args).filter(
      (collision) => collision.id !== args.active.id,
    );
    const intersections = (
      pointerIntersections.length > 0
        ? pointerIntersections
        : rectIntersection(args)
    ).filter((collision) => collision.id !== args.active.id);

    // Nested card, body, and list drop targets can all intersect at once.
    // Always prefer the most specific target so a list's sortable target does
    // not swallow card drops over its body.
    const prioritizedTypes: DragData["type"][] = ["CARD", "LIST_BODY", "LIST"];
    let overId: UniqueIdentifier | null = null;

    for (const type of prioritizedTypes) {
      const collision = intersections.find((candidate) => {
        const container = args.droppableContainers.find(
          (item) => item.id === candidate.id,
        );
        return getData(container)?.type === type;
      });

      if (collision) {
        overId = collision.id;
        break;
      }
    }

    overId ??= getFirstCollision(intersections, "id");

    if (overId != null) {
      const overContainer = args.droppableContainers.find(
        (container) => container.id === overId,
      );
      const overData = getData(overContainer);

      if (overData?.type === "LIST_BODY") {
        const cardContainers = args.droppableContainers.filter((container) => {
          const data = getData(container);
          return (
            container.id !== args.active.id &&
            data?.type === "CARD" &&
            data.listPublicId === overData.listPublicId
          );
        });

        if (cardContainers.length > 0) {
          const pointerY = args.pointerCoordinates?.y;
          const closest =
            pointerY === undefined
              ? closestCenter({
                  ...args,
                  droppableContainers: cardContainers,
                })[0]?.id
              : getNearestCardId(
                  pointerY,
                  cardContainers.flatMap((container) => {
                    const rect = args.droppableRects.get(container.id);
                    return rect
                      ? [
                          {
                            id: container.id,
                            top: rect.top,
                            height: rect.height,
                          },
                        ]
                      : [];
                  }),
                );

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
