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

function sanitizeFileExtension(originalName: string) {
  const match = originalName.toLowerCase().match(/\.([a-z0-9]{1,12})$/);

  return match ? `.${match[1]}` : "";
}

export function buildCloudinaryFolder(userId: string, orderId: string) {
  return `DTF/${userId}/${orderId}`;
}

export function buildCloudinaryAssetName(orderFileId: string, originalName: string) {
  return `${orderFileId}-${sanitizeFileStem(originalName)}${sanitizeFileExtension(
    originalName,
  )}`;
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

export function getCloudinaryAssetVersion(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/raw\/upload\/v(\d+)\//);

    if (!match) {
      return null;
    }

    const version = Number(match[1]);

    return Number.isFinite(version) ? version : null;
  } catch {
    return null;
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
  const tags = ["dtf", "upload", input.orderId].join(",");

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

export function createSignedAssetDeliveryUrl(input: {
  cloudinaryPublicId: string;
  version?: number | null;
}) {
  configureCloudinary();

  return cloudinary.url(input.cloudinaryPublicId, {
    resource_type: "raw",
    type: "upload",
    secure: true,
    sign_url: true,
    analytics: false,
    version: input.version ?? undefined,
  });
}

export async function verifyUploadedAsset(input: {
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
