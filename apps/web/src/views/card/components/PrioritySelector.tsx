import { t } from "@lingui/core/macro";

import type { CardPriority } from "@kan/shared/constants";

import PrioritySelect from "~/components/PrioritySelect";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface PrioritySelectorProps {
  cardPublicId: string;
  priority: CardPriority | null | undefined;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PrioritySelector({
  cardPublicId,
  priority,
  isLoading = false,
  disabled = false,
}: PrioritySelectorProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const updatePriority = api.card.update.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel({ cardPublicId });

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) =>
        oldCard
          ? { ...oldCard, priority: update.priority as CardPriority | null }
          : oldCard,
      );

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update priority`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  return (
    <PrioritySelect
      value={priority}
      onChange={(nextPriority) =>
        updatePriority.mutate({
          cardPublicId,
          priority: nextPriority,
        })
      }
      isLoading={isLoading || updatePriority.isPending}
      disabled={disabled}
      variant="detail"
    />
  );
}
