import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { calculatePriceBreakdown } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/rate-limit";
import { getOrdersForUser } from "@/lib/orders";
import { createOrderSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const orders = await getOrdersForUser(user.id);

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = createOrderSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid order payload." },
      { status: 400 },
    );
  }

  try {
    await enforceRateLimit({
      scope: "orders:create:user",
      identifier: user.id,
      limit: 20,
      windowMs: 15 * 60 * 1000,
      message: "Too many upload orders created. Please wait and try again.",
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

  const pricing = calculatePriceBreakdown(payload.data.files.length);

  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: user.id,
        fileCount: payload.data.files.length,
        subtotalPence: pricing.subtotalPence,
        vatPence: pricing.vatPence,
        totalPence: pricing.totalPence,
      },
    });

    const files = await Promise.all(
      payload.data.files.map((file) =>
        tx.orderFile.create({
          data: {
            orderId: order.id,
            originalName: file.name,
            mimeType: file.type,
            bytes: file.size,
          },
        }),
      ),
    );

    return { order, files };
  });

  return NextResponse.json({
    orderId: created.order.id,
    pricing,
    files: created.files.map((file, index) => ({
      id: file.id,
      clientId: payload.data.files[index]?.clientId,
      originalName: file.originalName,
    })),
  });
}
