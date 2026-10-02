import { t } from "@lingui/core/macro";

import type { CardPriority } from "@kan/shared/constants";

interface PrioritySelectProps {
  value: CardPriority | null | undefined;
  onChange: (priority: CardPriority | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function PrioritySelect({
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: PrioritySelectProps) {
  return (
    <select
      aria-label={t`Priority`}
      value={value ?? ""}
      onChange={(event) => {
        const nextValue = event.target.value;
        onChange(nextValue === "" ? null : (nextValue as CardPriority));
      }}
      disabled={disabled || isLoading}
      className="w-full rounded-[5px] border border-light-50 bg-light-50 px-2 py-1 text-xs text-neutral-900 hover:border-light-300 hover:bg-light-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-50 dark:bg-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100"
    >
      <option value="">{t`No priority`}</option>
      <option value="very_high">{t`Very High`}</option>
      <option value="high">{t`High`}</option>
      <option value="normal">{t`Normal`}</option>
      <option value="low">{t`Low`}</option>
    </select>
  );
}
