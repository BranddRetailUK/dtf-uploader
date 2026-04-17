import { v2 as cloudinary } from "cloudinary";

import { getServerEnv } from "@/lib/env";

function configureCloudinary() {
  const env = getServerEnv();

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return env;
}

function sanitizeFileStem(originalName: string) {
  const stem = originalName.replace(/\.[^.]+$/, "");
  const sanitized = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return sanitized || "upload";
}

export function buildCloudinaryFolder(userId: string, orderId: string) {
  return `DTF/${userId}/${orderId}`;
}

export function buildCloudinaryAssetName(orderFileId: string, originalName: string) {
  return `${orderFileId}-${sanitizeFileStem(originalName)}.pdf`;
}

export function buildCloudinaryPublicId(input: {
  userId: string;
  orderId: string;
  orderFileId: string;
  originalName: string;
}) {
  return `${buildCloudinaryFolder(input.userId, input.orderId)}/${buildCloudinaryAssetName(
    input.orderFileId,
    input.originalName,
  )}`;
}

export function isTrustedCloudinaryAssetUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  try {
    const env = getServerEnv();
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/raw/upload/`)
    );
  } catch {
    return false;
  }
}

async function destroyRawAsset(publicId: string) {
  try {
    configureCloudinary();

    await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
      type: "upload",
      invalidate: true,
    });
  } catch {
    // Best-effort cleanup for rejected uploads.
  }
}

export function createSignedUploadPayload(input: {
  userId: string;
  orderId: string;
  orderFileId: string;
  originalName: string;
}) {
  const env = configureCloudinary();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = buildCloudinaryFolder(input.userId, input.orderId);
  const publicId = buildCloudinaryAssetName(input.orderFileId, input.originalName);
  const tags = ["dtf", "pdf", input.orderId].join(",");
  const allowedFormats = "pdf";

  const signature = cloudinary.utils.api_sign_request(
    {
      allowed_formats: allowedFormats,
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
    allowedFormats,
    tags,
    resourceType: "raw",
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
  };
}

export async function verifyUploadedPdfAsset(input: {
  userId: string;
  orderId: string;
  orderFileId: string;
  originalName: string;
  reportedPublicId: string;
}) {
  const expectedPublicId = buildCloudinaryPublicId(input);

  if (input.reportedPublicId !== expectedPublicId) {
    return {
      ok: false as const,
      error: "Uploaded file could not be verified.",
    };
  }

  try {
    configureCloudinary();

    const resource = (await cloudinary.api.resource(expectedPublicId, {
      resource_type: "raw",
    })) as {
      bytes?: number;
      format?: string;
      public_id?: string;
      resource_type?: string;
      secure_url?: string;
    };

    if (
      resource.public_id !== expectedPublicId ||
      resource.resource_type !== "raw" ||
      !isTrustedCloudinaryAssetUrl(resource.secure_url)
    ) {
      return {
        ok: false as const,
        error: "Uploaded file could not be verified.",
      };
    }

    if (String(resource.format ?? "").toLowerCase() !== "pdf") {
      await destroyRawAsset(expectedPublicId);

      return {
        ok: false as const,
        error: "Only PDF files are allowed.",
      };
    }

    return {
      ok: true as const,
      bytes: typeof resource.bytes === "number" ? resource.bytes : 0,
      cloudinaryPublicId: expectedPublicId,
      cloudinaryUrl: resource.secure_url!,
    };
  } catch {
    return {
      ok: false as const,
      error: "Uploaded file could not be verified.",
    };
  }
}
