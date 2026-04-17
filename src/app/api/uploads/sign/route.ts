import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createSignedUploadPayload } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { uploadSignSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = uploadSignSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid signing payload." },
      { status: 400 },
    );
  }

  const orderFile = await prisma.orderFile.findFirst({
    where: {
      id: payload.data.orderFileId,
      orderId: payload.data.orderId,
      order: {
        userId: user.id,
      },
    },
    include: {
      order: true,
    },
  });

  if (!orderFile) {
    return NextResponse.json({ error: "Upload target not found." }, { status: 404 });
  }

  await prisma.orderFile.update({
    where: {
      id: orderFile.id,
    },
    data: {
      uploadStatus: "UPLOADING",
      errorMessage: null,
    },
  });

  return NextResponse.json(
    createSignedUploadPayload({
      userId: user.id,
      orderId: orderFile.orderId,
      orderFileId: orderFile.id,
      originalName: orderFile.originalName,
    }),
  );
}
