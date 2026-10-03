import type { NextApiRequest, NextApiResponse } from "next";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { createNextApiContext } from "@kan/api/trpc-context";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { hasPermission } from "@kan/api/utils/permissions";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createS3Client, deleteObject, generateUID } from "@kan/shared/utils";

import { env } from "~/env";

const MAX_SIZE_BYTES = parseInt(env.S3_AVATAR_UPLOAD_LIMIT ?? "2097152", 10);
const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"];

export const config = {
  api: {
    bodyParser: false,
  },
};

const getWorkspacePublicId = (req: NextApiRequest) => {
  const workspacePublicId = req.query.workspacePublicId;
  return typeof workspacePublicId === "string" ? workspacePublicId : null;
};

export default withRateLimit(
  { points: 30, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST" && req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const workspacePublicId = getWorkspacePublicId(req);
      if (!workspacePublicId || workspacePublicId.length < 12) {
        return res.status(400).json({ error: "Workspace is required" });
      }

      const { user, db } = await createNextApiContext(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const workspace = await workspaceRepo.getByPublicId(
        db,
        workspacePublicId,
      );
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!(await hasPermission(db, user.id, workspace.id, "workspace:edit"))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (req.method === "DELETE") {
        if (workspace.image && !workspace.image.startsWith("http")) {
          try {
            const bucket = env.NEXT_PUBLIC_AVATAR_BUCKET_NAME;
            if (bucket) {
              await deleteObject(bucket, workspace.image);
            }
          } catch {
            // Removing the database reference is still safe if the old object
            // is already missing or the storage provider is unavailable.
          }
        }

        await workspaceRepo.update(db, workspacePublicId, { image: null });
        return res.status(200).json({ image: null });
      }

      const bucket = env.NEXT_PUBLIC_AVATAR_BUCKET_NAME;
      if (!bucket) {
        return res.status(500).json({ error: "Avatar bucket not configured" });
      }

      const contentType = req.headers["content-type"];
      const contentLengthHeader = req.headers["content-length"];
      const contentLength = contentLengthHeader
        ? Number.parseInt(contentLengthHeader, 10)
        : NaN;

      if (typeof contentType !== "string") {
        return res.status(400).json({ error: "Missing content type" });
      }

      if (!allowedContentTypes.includes(contentType)) {
        return res.status(400).json({ error: "Invalid content type" });
      }

      if (!Number.isFinite(contentLength) || contentLength <= 0) {
        return res
          .status(400)
          .json({ error: "Missing or invalid content length" });
      }

      if (contentLength > MAX_SIZE_BYTES) {
        return res.status(400).json({ error: "File too large" });
      }

      const extensionByType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const extension = extensionByType[contentType];
      const s3Key = `workspaces/${workspacePublicId}/image-${generateUID()}.${extension}`;

      const client = createS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: req,
          ContentType: contentType,
          ContentLength: contentLength,
        }),
      );

      await workspaceRepo.update(db, workspacePublicId, { image: s3Key });

      return res.status(200).json({ image: s3Key });
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  }),
);
