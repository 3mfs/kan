export const cardPriorities = ["very_high", "high", "normal", "low"] as const;

export type CardPriority = (typeof cardPriorities)[number];
