import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { verifyUploadedAsset } from "@/lib/cloudinary";
import { deriveOrderStatus, getSerializedOrderById } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/rate-limit";
import { uploadFinalizeSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = uploadFinalizeSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!payload.success) {
    return NextResponse.json(
      {
        error: payload.error.issues[0]?.message ?? "Invalid finalize payload.",
      },
      { status: 400 },
    );
  }

  try {
    await enforceRateLimit({
      scope: "uploads:finalize:user",
      identifier: user.id,
      limit: 240,
      windowMs: 15 * 60 * 1000,
      message: "Too many upload callbacks. Please wait and try again.",
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }

    throw error;
  }

  const existingFile = await prisma.orderFile.findFirst({
    where: {
      id: payload.data.orderFileId,
      orderId: payload.data.orderId,
      order: {
        userId: user.id,
      },
    },
    select: {
      id: true,
      orderId: true,
      originalName: true,
    },
  });

  if (!existingFile) {
    return NextResponse.json({ error: "Upload record not found." }, { status: 404 });
  }

  const verifiedAsset =
    payload.data.success && payload.data.cloudinaryPublicId
      ? await verifyUploadedAsset({
          userId: user.id,
          orderId: existingFile.orderId,
          orderFileId: existingFile.id,
          originalName: existingFile.originalName,
          reportedPublicId: payload.data.cloudinaryPublicId,
        })
      : null;

  const errorMessage =
    payload.data.success && verifiedAsset && !verifiedAsset.ok
      ? verifiedAsset.error
      : payload.data.errorMessage;
  let updateData: Prisma.OrderFileUpdateInput;

  if (payload.data.success && verifiedAsset && verifiedAsset.ok) {
    updateData = {
      uploadStatus: "UPLOADED",
      cloudinaryPublicId: verifiedAsset.cloudinaryPublicId,
      cloudinaryUrl: verifiedAsset.cloudinaryUrl,
      bytes: verifiedAsset.bytes,
      errorMessage: null,
    };
  } else {
    updateData = {
      uploadStatus: "FAILED",
      errorMessage: errorMessage ?? "Upload verification failed.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderFile.update({
      where: {
        id: existingFile.id,
      },
      data: updateData,
    });

    const uploadStatuses = await tx.orderFile.findMany({
      where: {
        orderId: existingFile.orderId,
      },
      select: {
        uploadStatus: true,
      },
    });

    await tx.order.update({
      where: {
        id: existingFile.orderId,
      },
      data: {
        status: deriveOrderStatus(uploadStatuses),
      },
    });
  });

  const order = await getSerializedOrderById(existingFile.orderId);

  if (payload.data.success && verifiedAsset && !verifiedAsset.ok) {
    return NextResponse.json(
      { error: verifiedAsset.error, order },
      { status: 422 },
    );
  }

  return NextResponse.json({ order });
}
