import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedCloudinaryAssetUrl } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import {
  buildTemplateFilename,
  isGeneratedTemplateFileName,
} from "@/lib/template-files";

function buildInlineContentDisposition(filename: string) {
  const asciiFilename = filename.replace(/[^\x20-\x7E]+/g, "").replace(/["\\]/g, "");
  const fallbackFilename = asciiFilename || "file";

  return `inline; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}

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
      originalName: true,
      mimeType: true,
      cloudinaryUrl: true,
      createdAt: true,
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
    !isTrustedCloudinaryAssetUrl(file.cloudinaryUrl)
  ) {
    return NextResponse.json({ error: "File is not available." }, { status: 409 });
  }

  const assetUrl = file.cloudinaryUrl;

  if (!assetUrl) {
    return NextResponse.json({ error: "File is not available." }, { status: 409 });
  }

  const assetResponse = await fetch(assetUrl, {
    cache: "no-store",
  }).catch(() => null);

  if (!assetResponse?.ok || !assetResponse.body) {
    return NextResponse.json(
      { error: "We couldn't open this file right now." },
      { status: 502 },
    );
  }

  const filename = isGeneratedTemplateFileName(file.originalName)
    ? buildTemplateFilename(file.createdAt)
    : file.originalName;
  const headers = new Headers();
  const contentType = assetResponse.headers.get("Content-Type") ?? file.mimeType;
  const contentLength = assetResponse.headers.get("Content-Length");

  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", buildInlineContentDisposition(filename));
  headers.set("Cache-Control", "private, no-store");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new Response(assetResponse.body, {
    status: 200,
    headers,
  });
}
