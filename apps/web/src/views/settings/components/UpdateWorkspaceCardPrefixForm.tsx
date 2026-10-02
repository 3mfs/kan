import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const schema = z.object({
  cardPrefix: z
    .string()
    .trim()
    .min(1, { message: t`Ticket ID prefix is required` })
    .max(10, { message: t`Ticket ID prefix cannot exceed 10 characters` })
    .regex(/^[a-zA-Z0-9]+$/, {
      message: t`Ticket ID prefix can only contain letters and numbers`,
    }),
});

type FormValues = z.infer<typeof schema>;

const UpdateWorkspaceCardPrefixForm = ({
  workspacePublicId,
  workspaceName,
  workspaceCardPrefix,
  disabled = false,
}: {
  workspacePublicId: string;
  workspaceName: string;
  workspaceCardPrefix: string;
  disabled?: boolean;
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      cardPrefix: workspaceCardPrefix,
    },
  });

  const updateWorkspaceCardPrefix = api.workspace.update.useMutation({
    onSuccess: async () => {
      showPopup({
        header: t`Ticket ID prefix updated`,
        message: t`Existing ticket IDs will now use the new prefix.`,
        icon: "success",
      });

      await Promise.all([
        utils.workspace.all.refetch(),
        utils.board.byId.invalidate(),
      ]);
    },
    onError: () => {
      showPopup({
        header: t`Error updating ticket ID prefix`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateWorkspaceCardPrefix.mutate({
      workspacePublicId,
      cardPrefix: data.cardPrefix,
    });
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="mb-2 flex w-full max-w-[325px] items-center gap-2">
          <Input
            aria-label={t`Ticket ID prefix`}
            {...register("cardPrefix")}
            className="uppercase"
            errorMessage={errors.cardPrefix?.message}
            disabled={disabled}
          />
        </div>
        {isDirty && !disabled && (
          <div>
            <Button
              onClick={handleSubmit(onSubmit)}
              variant="primary"
              disabled={updateWorkspaceCardPrefix.isPending}
              isLoading={updateWorkspaceCardPrefix.isPending}
            >
              {t`Update`}
            </Button>
          </div>
        )}
      </div>
      <p className="mb-4 text-xs text-light-800 dark:text-dark-800">
        {t`Ticket IDs will look like PREFIX-123. Changing this prefix updates existing ticket IDs for the ${workspaceName} workspace.`}
      </p>
    </div>
  );
};

export default UpdateWorkspaceCardPrefixForm;
