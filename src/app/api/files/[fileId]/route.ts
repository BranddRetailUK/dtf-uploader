import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  createSignedAssetDeliveryUrl,
  getCloudinaryAssetVersion,
  isTrustedCloudinaryAssetUrl,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { fileId } = await context.params;

  const file = await prisma.orderFile.findUnique({
    where: {
      id: fileId,
    },
    select: {
      id: true,
      uploadStatus: true,
      cloudinaryPublicId: true,
      cloudinaryUrl: true,
      order: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (user.role !== "ADMIN" && file.order.userId !== user.id) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (
    file.uploadStatus !== "UPLOADED" ||
    !file.cloudinaryPublicId ||
    !isTrustedCloudinaryAssetUrl(file.cloudinaryUrl)
  ) {
    return NextResponse.json({ error: "File is not available." }, { status: 409 });
  }

  const signedUrl = createSignedAssetDeliveryUrl({
    cloudinaryPublicId: file.cloudinaryPublicId,
    version: getCloudinaryAssetVersion(file.cloudinaryUrl),
  });

  return NextResponse.redirect(signedUrl);
}
