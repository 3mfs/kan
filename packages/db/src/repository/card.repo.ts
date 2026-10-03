import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { CardPriority } from "@kan/shared/constants";
import {
  cardActivities,
  cardAttachments,
  cards,
  cardsToLabels,
  cardToWorkspaceMembers,
  checklistItems,
  checklists,
  labels,
  lists,
  workspaceMembers,
  workspaces,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

import { reorderCardsByPosition } from "./card-order";

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(cards)
    .where(isNull(cards.deletedAt));

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  cardInput: {
    title: string;
    description: string | null;
    createdBy: string;
    listId: number;
    workspaceId: number;
    position: "start" | "end";
    dueDate?: Date | null;
    priority?: CardPriority | null;
  },
) => {
  return db.transaction(async (tx) => {
    let index = 0;

    if (cardInput.position === "end") {
      const lastCard = await tx.query.cards.findFirst({
        columns: {
          index: true,
        },
        where: and(eq(cards.listId, cardInput.listId), isNull(cards.deletedAt)),
        orderBy: desc(cards.index),
      });

      if (lastCard) index = lastCard.index + 1;
    }

    const getExistingCardAtIndex = async () =>
      tx.query.cards.findFirst({
        columns: {
          id: true,
        },
        where: and(
          eq(cards.listId, cardInput.listId),
          eq(cards.index, index),
          isNull(cards.deletedAt),
        ),
      });

    const existingCardAtIndex = await getExistingCardAtIndex();

    if (existingCardAtIndex?.id) {
      await tx.execute(sql`
        UPDATE card
        SET index = index + 1
        WHERE "listId" = ${cardInput.listId} AND index >= ${index} AND "deletedAt" IS NULL;
      `);
    }

    const [counterResult] = await tx
      .update(workspaces)
      .set({ cardCounter: sql`${workspaces.cardCounter} + 1` })
      .where(eq(workspaces.id, cardInput.workspaceId))
      .returning({ cardCounter: workspaces.cardCounter });

    if (!counterResult)
      throw new Error(`Workspace ${cardInput.workspaceId} not found`);

    const cardNumber = counterResult.cardCounter;

    const result = await tx
      .insert(cards)
      .values({
        publicId: generateUID(),
        title: cardInput.title,
        description: cardInput.description,
        createdBy: cardInput.createdBy,
        listId: cardInput.listId,
        index: index,
        cardNumber,
        dueDate: cardInput.dueDate ?? null,
        priority: cardInput.priority ?? null,
      })
      .returning({
        id: cards.id,
        listId: cards.listId,
        publicId: cards.publicId,
        cardNumber: cards.cardNumber,
      });

    if (!result[0]) throw new Error("Unable to create card");

    await tx.insert(cardActivities).values({
      publicId: generateUID(),
      cardId: result[0].id,
      type: "card.created",
      createdBy: cardInput.createdBy,
    });

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(and(eq(cards.listId, result[0].listId), isNull(cards.deletedAt)))
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      // Compact indices for this list to sequential values (0..n-1) preserving order
      await tx.execute(sql`
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
          FROM "card"
          WHERE "listId" = ${result[0].listId} AND "deletedAt" IS NULL
        )
        UPDATE "card" c
        SET "index" = o.new_index
        FROM ordered o
        WHERE c.id = o.id;
      `);

      // Last resort: verify fix; rollback if duplicates persist
      const postFixDupes = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(and(eq(cards.listId, result[0].listId), isNull(cards.deletedAt)))
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          `Invariant violation: duplicate card indices remain after compaction in list ${result[0].listId}`,
        );
      }
    }

    return result[0];
  });
};

export const bulkCreateCardLabelRelationships = async (
  db: dbClient,
  cardLabelRelationshipInput: {
    cardId: number;
    labelId: number;
  }[],
) => {
  const result = await db
    .insert(cardsToLabels)
    .values(cardLabelRelationshipInput)
    .returning();

  return result;
};

export const bulkCreateCardWorkspaceMemberRelationships = async (
  db: dbClient,
  cardWorkspaceMemberRelationshipInput: {
    cardId: number;
    workspaceMemberId: number;
  }[],
) => {
  const result = await db
    .insert(cardToWorkspaceMembers)
    .values(cardWorkspaceMemberRelationshipInput)
    .returning();

  return result;
};

export const update = async (
  db: dbClient,
  cardInput: {
    title?: string;
    description?: string | null;
    dueDate?: Date | null;
    priority?: CardPriority | null;
  },
  args: {
    cardPublicId: string;
  },
) => {
  const [result] = await db
    .update(cards)
    .set({
      title: cardInput.title,
      description: cardInput.description,
      dueDate: cardInput.dueDate !== undefined ? cardInput.dueDate : undefined,
      priority:
        cardInput.priority !== undefined ? cardInput.priority : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(cards.publicId, args.cardPublicId), isNull(cards.deletedAt)))
    .returning({
      id: cards.id,
      publicId: cards.publicId,
      title: cards.title,
      description: cards.description,
      dueDate: cards.dueDate,
      priority: cards.priority,
    });

  return result;
};

export const getCardWithListByPublicId = (
  db: dbClient,
  cardPublicId: string,
) => {
  return db.query.cards.findFirst({
    columns: {
      id: true,
      index: true,
    },
    with: {
      list: {
        columns: {
          id: true,
          boardId: true,
        },
      },
    },
    where: and(eq(cards.publicId, cardPublicId), isNull(cards.deletedAt)),
  });
};

export const getByPublicId = (db: dbClient, cardPublicId: string) => {
  return db.query.cards.findFirst({
    columns: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      listId: true,
      dueDate: true,
      priority: true,
    },
    with: {
      list: {
        columns: {
          publicId: true,
          name: true,
        },
      },
    },
    where: eq(cards.publicId, cardPublicId),
  });
};

export const getCardLabelRelationship = async (
  db: dbClient,
  args: { cardId: number; labelId: number },
) => {
  return db.query.cardsToLabels.findFirst({
    where: and(
      eq(cardsToLabels.cardId, args.cardId),
      eq(cardsToLabels.labelId, args.labelId),
    ),
  });
};

export const bulkCreate = async (
  db: dbClient,
  cardInput: {
    publicId: string;
    title: string;
    description: string | null;
    createdBy: string;
    listId: number;
    workspaceId: number;
    index: number;
    importId?: number;
    priority?: CardPriority | null;
  }[],
) => {
  if (cardInput.length === 0) return [];

  return db.transaction(async (tx) => {
    // Group incoming cards by list to compute safe, sequential indices per list
    const byList = new Map<number, typeof cardInput>();
    for (const item of cardInput) {
      const arr = byList.get(item.listId) ?? [];
      arr.push(item);
      byList.set(item.listId, arr);
    }

    // Atomically reserve a contiguous range of cardNumbers per workspace by
    // bumping cardCounter once per workspace.
    const countsByWorkspace = new Map<number, number>();
    for (const item of cardInput) {
      countsByWorkspace.set(
        item.workspaceId,
        (countsByWorkspace.get(item.workspaceId) ?? 0) + 1,
      );
    }

    const cardNumberByWorkspaceQueue = new Map<number, number[]>();
    for (const [workspaceId, count] of countsByWorkspace.entries()) {
      const [counterResult] = await tx
        .update(workspaces)
        .set({ cardCounter: sql`${workspaces.cardCounter} + ${count}` })
        .where(eq(workspaces.id, workspaceId))
        .returning({ cardCounter: workspaces.cardCounter });

      if (!counterResult) throw new Error(`Workspace ${workspaceId} not found`);

      const last = counterResult.cardCounter;
      const start = last - count + 1;
      const queue: number[] = [];
      for (let n = start; n <= last; n++) queue.push(n);
      cardNumberByWorkspaceQueue.set(workspaceId, queue);
    }

    const allValuesToInsert: {
      publicId: string;
      title: string;
      description: string | null;
      createdBy: string;
      listId: number;
      index: number;
      cardNumber: number;
      importId?: number;
      priority?: CardPriority | null;
    }[] = [];

    // For each list, append incoming cards after current max index, preserving incoming order
    for (const [listId, items] of byList.entries()) {
      const last = await tx.query.cards.findFirst({
        columns: { index: true },
        where: and(eq(cards.listId, listId), isNull(cards.deletedAt)),
        orderBy: [desc(cards.index)],
      });

      let nextIndex = last ? last.index + 1 : 0;
      const sorted = [...items].sort((a, b) => a.index - b.index);
      for (const it of sorted) {
        const queue = cardNumberByWorkspaceQueue.get(it.workspaceId);
        const cardNumber = queue?.shift();
        if (cardNumber === undefined)
          throw new Error(
            `Failed to allocate cardNumber for workspace ${it.workspaceId}`,
          );
        allValuesToInsert.push({
          publicId: it.publicId,
          title: it.title,
          description: it.description,
          createdBy: it.createdBy,
          listId: it.listId,
          index: nextIndex++,
          cardNumber,
          importId: it.importId,
          priority: it.priority ?? null,
        });
      }
    }

    const inserted = await tx
      .insert(cards)
      .values(allValuesToInsert)
      .returning({ id: cards.id });

    // Post-insert: compact per list if duplicates exist; then verify
    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);
    for (const listId of byList.keys()) {
      const duplicateIndices = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(and(eq(cards.listId, listId), isNull(cards.deletedAt)))
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (duplicateIndices.length > 0) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
            FROM "card"
            WHERE "listId" = ${listId} AND "deletedAt" IS NULL
          )
          UPDATE "card" c
          SET "index" = o.new_index
          FROM ordered o
          WHERE c.id = o.id;
        `);

        const postFixDupes = await tx
          .select({ index: cards.index, count: countExpr })
          .from(cards)
          .where(and(eq(cards.listId, listId), isNull(cards.deletedAt)))
          .groupBy(cards.listId, cards.index)
          .having(gt(countExpr, 1));

        if (postFixDupes.length > 0) {
          throw new Error(
            `Invariant violation: duplicate card indices remain after compaction in list ${listId}`,
          );
        }
      }
    }

    return inserted;
  });
};

export const createCardLabelRelationship = async (
  db: dbClient,
  cardLabelRelationshipInput: { cardId: number; labelId: number },
) => {
  const [result] = await db
    .insert(cardsToLabels)
    .values({
      cardId: cardLabelRelationshipInput.cardId,
      labelId: cardLabelRelationshipInput.labelId,
    })
    .returning();

  return result;
};

export const bulkCreateCardLabelRelationship = async (
  db: dbClient,
  cardLabelRelationshipInput: { cardId: number; labelId: number }[],
) => {
  const [result] = await db
    .insert(cardsToLabels)
    .values(cardLabelRelationshipInput)
    .returning();

  return result;
};

export const getCardMemberRelationship = (
  db: dbClient,
  args: { cardId: number; memberId: number },
) => {
  return db.query.cardToWorkspaceMembers.findFirst({
    where: and(
      eq(cardToWorkspaceMembers.cardId, args.cardId),
      eq(cardToWorkspaceMembers.workspaceMemberId, args.memberId),
    ),
  });
};

export const createCardMemberRelationship = async (
  db: dbClient,
  cardMemberRelationshipInput: { cardId: number; memberId: number },
) => {
  const [result] = await db
    .insert(cardToWorkspaceMembers)
    .values({
      cardId: cardMemberRelationshipInput.cardId,
      workspaceMemberId: cardMemberRelationshipInput.memberId,
    })
    .returning();

  return { success: !!result };
};

export const getWithListAndMembersByPublicId = async (
  db: dbClient,
  cardPublicId: string,
) => {
  const card = await db.query.cards.findFirst({
    columns: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      dueDate: true,
      priority: true,
      createdBy: true,
      cardNumber: true,
      index: true,
    },
    with: {
      labels: {
        with: {
          label: {
            columns: {
              publicId: true,
              name: true,
              colourCode: true,
            },
          },
        },
      },
      attachments: {
        columns: {
          publicId: true,
          contentType: true,
          s3Key: true,
          originalFilename: true,
          size: true,
        },
        where: isNull(cardAttachments.deletedAt),
        orderBy: asc(cardAttachments.createdAt),
      },
      checklists: {
        columns: {
          publicId: true,
          name: true,
          index: true,
        },
        where: isNull(checklists.deletedAt),
        orderBy: asc(checklists.index),
        with: {
          items: {
            columns: {
              publicId: true,
              title: true,
              completed: true,
              index: true,
            },
            where: isNull(checklistItems.deletedAt),
            orderBy: asc(checklistItems.index),
          },
        },
      },
      list: {
        columns: {
          publicId: true,
          name: true,
        },
        with: {
          board: {
            columns: {
              publicId: true,
              name: true,
            },
            with: {
              labels: {
                columns: {
                  publicId: true,
                  colourCode: true,
                  name: true,
                },
                where: isNull(labels.deletedAt),
              },
              lists: {
                columns: {
                  publicId: true,
                  name: true,
                },
                where: isNull(lists.deletedAt),
                orderBy: asc(lists.index),
              },
              workspace: {
                columns: {
                  publicId: true,
                  cardPrefix: true,
                },
                with: {
                  members: {
                    columns: {
                      publicId: true,
                      email: true,
                      status: true,
                    },
                    with: {
                      user: {
                        columns: {
                          id: true,
                          name: true,
                          email: true,
                          image: true,
                        },
                      },
                    },
                    where: isNull(workspaceMembers.deletedAt),
                  },
                },
              },
            },
          },
        },
        // https://github.com/drizzle-team/drizzle-orm/issues/2903
        // where: isNull(lists.deletedAt),
      },
      members: {
        with: {
          member: {
            columns: {
              publicId: true,
              email: true,
            },
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
            // https://github.com/drizzle-team/drizzle-orm/issues/2903
            // where: isNull(workspaceMembers.deletedAt),
          },
        },
      },
      activities: {
        columns: {
          publicId: true,
          type: true,
          createdAt: true,
          fromIndex: true,
          toIndex: true,
          fromTitle: true,
          toTitle: true,
          fromDescription: true,
          toDescription: true,
          fromDueDate: true,
          toDueDate: true,
        },
        with: {
          fromList: {
            columns: {
              publicId: true,
              name: true,
              index: true,
            },
          },
          toList: {
            columns: {
              publicId: true,
              name: true,
              index: true,
            },
          },
          label: {
            columns: {
              publicId: true,
              name: true,
            },
          },
          member: {
            columns: {
              publicId: true,
            },
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          comment: {
            columns: {
              publicId: true,
              comment: true,
              createdBy: true,
              updatedAt: true,
              deletedAt: true,
            },
            // https://github.com/drizzle-team/drizzle-orm/issues/2903
            // where: isNull(comments.deletedAt),
          },
        },
      },
    },
    where: and(eq(cards.publicId, cardPublicId), isNull(cards.deletedAt)),
  });

  if (!card) return null;

  const formattedResult = {
    ...card,
    labels: card.labels.map((label) => label.label),
    members: card.members.map((member) => member.member),
    activities: card.activities.filter(
      (activity) => !activity.comment?.deletedAt,
    ),
  };

  return formattedResult;
};

export const reorder = async (
  db: dbClient,
  args: {
    newListId: number | undefined;
    newIndex: number | undefined;
    cardId: number;
  },
) => {
  return db.transaction(async (tx) => {
    const card = await tx.query.cards.findFirst({
      columns: {
        id: true,
        listId: true,
      },
      where: and(eq(cards.id, args.cardId), isNull(cards.deletedAt)),
    });

    if (!card) throw new Error(`Card not found for public ID ${args.cardId}`);

    const currentListId = card.listId;
    const destinationListId = args.newListId ?? currentListId;

    if (args.newListId && args.newListId !== currentListId) {
      const destinationList = await tx.query.lists.findFirst({
        columns: {
          id: true,
        },
        where: and(eq(lists.id, args.newListId), isNull(lists.deletedAt)),
      });

      if (!destinationList)
        throw new Error(`List not found for public ID ${args.newListId}`);
    }

    const affectedListIds = [currentListId, destinationListId].filter(
      (listId, index, listIds) => listIds.indexOf(listId) === index,
    );
    const orderedCards = await tx
      .select({
        id: cards.id,
        index: cards.index,
        listId: cards.listId,
      })
      .from(cards)
      .where(
        and(inArray(cards.listId, affectedListIds), isNull(cards.deletedAt)),
      )
      .orderBy(asc(cards.index), asc(cards.id));

    const sourceCards = orderedCards.filter(
      (orderedCard) => orderedCard.listId === currentListId,
    );
    const destinationCards =
      currentListId === destinationListId
        ? sourceCards
        : orderedCards.filter(
            (orderedCard) => orderedCard.listId === destinationListId,
          );
    const reorderedCards = reorderCardsByPosition(
      sourceCards,
      destinationCards,
      card.id,
      args.newIndex,
    );
    if (!reorderedCards)
      throw new Error(`Card not found for public ID ${args.cardId}`);

    const cardsByList = new Map<number, typeof orderedCards>([
      [destinationListId, reorderedCards.destinationCards],
    ]);
    if (currentListId !== destinationListId) {
      cardsByList.set(currentListId, reorderedCards.sourceCards);
    }

    await Promise.all(
      Array.from(cardsByList.entries()).flatMap(([listId, listCards]) =>
        listCards.map((orderedCard, index) =>
          tx
            .update(cards)
            .set({
              index,
              ...(orderedCard.id === card.id && listId !== currentListId
                ? { listId }
                : {}),
            })
            .where(eq(cards.id, orderedCard.id)),
        ),
      ),
    );

    const updatedCard = await tx.query.cards.findFirst({
      columns: {
        id: true,
        publicId: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
      },
      where: eq(cards.id, card.id),
    });

    return updatedCard;
  });
};

export const softDelete = async (
  db: dbClient,
  args: {
    cardId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .update(cards)
      .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
      .where(eq(cards.id, args.cardId))
      .returning({
        id: cards.id,
        listId: cards.listId,
        index: cards.index,
      });

    if (!result)
      throw new Error(`Unable to soft delete card ID ${args.cardId}`);

    await tx.execute(sql`
      UPDATE card
      SET index = index - 1
      WHERE "listId" = ${result.listId} AND index > ${result.index} AND "deletedAt" IS NULL;
    `);

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(and(eq(cards.listId, result.listId), isNull(cards.deletedAt)))
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      throw new Error(
        `Duplicate indices found after soft deleting ${result.id}`,
      );
    }

    return result;
  });
};

export const softDeleteAllByListIds = async (
  db: dbClient,
  args: {
    listIds: number[];
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const updatedCards = await db
    .update(cards)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(and(inArray(cards.listId, args.listIds), isNull(cards.deletedAt)))
    .returning({
      id: cards.id,
    });

  return updatedCards;
};

export const hardDeleteCardMemberRelationship = async (
  db: dbClient,
  args: { cardId: number; memberId: number },
) => {
  const [result] = await db
    .delete(cardToWorkspaceMembers)
    .where(
      and(
        eq(cardToWorkspaceMembers.cardId, args.cardId),
        eq(cardToWorkspaceMembers.workspaceMemberId, args.memberId),
      ),
    )
    .returning();

  return { success: !!result };
};

export const hardDeleteCardLabelRelationship = async (
  db: dbClient,
  args: { cardId: number; labelId: number },
) => {
  const [result] = await db
    .delete(cardsToLabels)
    .where(
      and(
        eq(cardsToLabels.cardId, args.cardId),
        eq(cardsToLabels.labelId, args.labelId),
      ),
    )
    .returning();

  return result;
};

export const hardDeleteAllCardLabelRelationships = async (
  db: dbClient,
  labelId: number,
) => {
  const [result] = await db
    .delete(cardsToLabels)
    .where(eq(cardsToLabels.labelId, labelId))
    .returning();

  return result;
};

export const getWorkspaceAndCardIdByCardPublicId = async (
  db: dbClient,
  cardPublicId: string,
) => {
  const result = await db.query.cards.findFirst({
    columns: { id: true, createdBy: true },
    where: and(eq(cards.publicId, cardPublicId), isNull(cards.deletedAt)),
    with: {
      list: {
        columns: { name: true, publicId: true },
        with: {
          board: {
            columns: {
              publicId: true,
              workspaceId: true,
              visibility: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return result
    ? {
        id: result.id,
        createdBy: result.createdBy,
        workspaceId: result.list.board.workspaceId,
        workspaceVisibility: result.list.board.visibility,
        listPublicId: result.list.publicId,
        listName: result.list.name,
        boardPublicId: result.list.board.publicId,
        boardName: result.list.board.name,
      }
    : null;
};
