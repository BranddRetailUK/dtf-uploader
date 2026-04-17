import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { deriveOrderStatus, getSerializedOrderById } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
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
    },
  });

  if (!existingFile) {
    return NextResponse.json({ error: "Upload record not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderFile.update({
      where: {
        id: existingFile.id,
      },
      data: payload.data.success
        ? {
            uploadStatus: "UPLOADED",
            cloudinaryPublicId: payload.data.cloudinaryPublicId,
            cloudinaryUrl: payload.data.cloudinaryUrl,
            bytes: payload.data.bytes,
            errorMessage: null,
          }
        : {
            uploadStatus: "FAILED",
            errorMessage: payload.data.errorMessage,
          },
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

  return NextResponse.json({ order });
}
