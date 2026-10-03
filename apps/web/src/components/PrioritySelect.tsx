import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";
import { HiCheck } from "react-icons/hi2";

import type { CardPriority } from "@kan/shared/constants";

interface PrioritySelectProps {
  value: CardPriority | null | undefined;
  onChange: (priority: CardPriority | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: "action" | "detail";
}

export default function PrioritySelect({
  value,
  onChange,
  disabled = false,
  isLoading = false,
  variant = "action",
}: PrioritySelectProps) {
  const options: { value: CardPriority | null; label: string }[] = [
    { value: null, label: t`No priority` },
    { value: "very_high", label: t`Very High` },
    { value: "high", label: t`High` },
    { value: "normal", label: t`Normal` },
    { value: "low", label: t`Low` },
  ];

  const selectedLabel =
    options.find((option) => option.value === (value ?? null))?.label ??
    t`No priority`;

  const isDetailVariant = variant === "detail";

  return (
    <Menu
      as="div"
      className={
        isDetailVariant
          ? "relative flex w-full items-center text-left"
          : "relative w-fit text-left"
      }
    >
      <Menu.Button
        type="button"
        aria-label={t`Priority`}
        disabled={disabled || isLoading}
        className={
          isDetailVariant
            ? `flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 dark:border-dark-50 dark:text-dark-1000 ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"}`
            : "flex h-full w-full items-center rounded-[5px] border-[1px] border-light-600 bg-light-200 px-2 py-1 text-left text-xs text-light-800 hover:bg-light-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-600 dark:bg-dark-400 dark:text-dark-1000 dark:hover:bg-dark-500"
        }
      >
        {selectedLabel}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 top-full z-50 mt-1 w-40 origin-top-left rounded-md border border-light-200 bg-light-50 p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-400 dark:bg-dark-300">
          {options.map((option) => (
            <Menu.Item key={option.value ?? "none"}>
              <button
                type="button"
                onClick={() => onChange(option.value)}
                className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm text-neutral-900 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-400"
              >
                <span className="w-4">
                  {option.value === (value ?? null) && (
                    <HiCheck aria-hidden="true" />
                  )}
                </span>
                {option.label}
              </button>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
