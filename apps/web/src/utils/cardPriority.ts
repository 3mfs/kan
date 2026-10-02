import type { CardPriority } from "@kan/shared/constants";

export const getCardPriorityHeaderClass = (
  priority: CardPriority | null | undefined,
): string | null => {
  switch (priority) {
    case "very_high":
      return "bg-red-200 dark:bg-red-900";
    case "high":
      return "bg-orange-200 dark:bg-orange-900";
    case "normal":
      return "bg-blue-200 dark:bg-blue-900";
    case "low":
      return "bg-green-200 dark:bg-green-900";
    default:
      return null;
  }
};
