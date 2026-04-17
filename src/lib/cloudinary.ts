import { v2 as cloudinary } from "cloudinary";

import { getServerEnv } from "@/lib/env";

function sanitizeFileStem(originalName: string) {
  const stem = originalName.replace(/\.[^.]+$/, "");
  const sanitized = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return sanitized || "upload";
}

export function createSignedUploadPayload(input: {
  userId: string;
  orderId: string;
  orderFileId: string;
  originalName: string;
}) {
  const env = getServerEnv();

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `DTF/${input.userId}/${input.orderId}`;
  const publicId = `${input.orderFileId}-${sanitizeFileStem(input.originalName)}`;
  const tags = ["dtf", "pdf", input.orderId].join(",");

  const signature = cloudinary.utils.api_sign_request(
    {
      folder,
      public_id: publicId,
      tags,
      timestamp,
    },
    env.CLOUDINARY_API_SECRET,
  );

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    publicId,
    tags,
    resourceType: "raw",
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
  };
}
