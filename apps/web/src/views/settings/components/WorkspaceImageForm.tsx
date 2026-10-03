import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useRef, useState } from "react";

import Button from "~/components/Button";
import WorkspaceIcon from "~/components/WorkspaceIcon";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const WorkspaceImageForm = ({
  workspacePublicId,
  workspaceName,
  workspaceImage,
  disabled = false,
}: {
  workspacePublicId: string;
  workspaceName: string;
  workspaceImage: string | null | undefined;
  disabled?: boolean;
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageUrl = previewUrl ?? workspaceImage;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showPopup({
        header: t`Invalid workspace image`,
        message: t`Please select a PNG, JPEG, or WebP image.`,
        icon: "error",
      });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
      const response = await fetch(
        `${baseUrl}/api/upload/workspace-image?workspacePublicId=${encodeURIComponent(workspacePublicId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": selectedFile.type,
            "x-original-filename": encodeURIComponent(selectedFile.name),
          },
          body: selectedFile,
        },
      );

      if (!response.ok) throw new Error("Failed to upload workspace image");

      await Promise.all([
        utils.workspace.all.refetch(),
        utils.workspace.byId.invalidate({ workspacePublicId }),
      ]);
      clearSelection();
      showPopup({
        header: t`Workspace image updated`,
        message: t`Your workspace image has been updated.`,
        icon: "success",
      });
    } catch {
      showPopup({
        header: t`Error uploading workspace image`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsUploading(true);
      const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
      const response = await fetch(
        `${baseUrl}/api/upload/workspace-image?workspacePublicId=${encodeURIComponent(workspacePublicId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) throw new Error("Failed to remove workspace image");

      await Promise.all([
        utils.workspace.all.refetch(),
        utils.workspace.byId.invalidate({ workspacePublicId }),
      ]);
      clearSelection();
      showPopup({
        header: t`Workspace image removed`,
        message: t`Your workspace initials are now being used.`,
        icon: "success",
      });
    } catch {
      showPopup({
        header: t`Error removing workspace image`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={t`Workspace image preview`}
            className="h-full w-full object-cover"
          />
        ) : (
          <WorkspaceIcon name={workspaceName} size="lg" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />
        {selectedFile ? (
          <>
            <Button
              onClick={handleUpload}
              disabled={disabled || isUploading}
              isLoading={isUploading}
            >
              {t`Save image`}
            </Button>
            <Button
              variant="ghost"
              onClick={clearSelection}
              disabled={isUploading}
            >
              {t`Cancel`}
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {t`Choose image`}
          </Button>
        )}
        {workspaceImage && !selectedFile && (
          <Button
            variant="ghost"
            onClick={handleRemove}
            disabled={disabled || isUploading}
          >
            {t`Remove image`}
          </Button>
        )}
        <p className="w-full text-xs text-light-700 dark:text-dark-700">
          {t`PNG, JPEG, or WebP up to 2 MB.`}
        </p>
      </div>
    </div>
  );
};

export default WorkspaceImageForm;
