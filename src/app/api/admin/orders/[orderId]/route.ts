import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSerializedOrderById } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { adminStatusSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const payload = adminStatusSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid status payload." },
      { status: 400 },
    );
  }

  const { orderId } = await context.params;

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: payload.data.status,
    },
  });

  const order = await getSerializedOrderById(orderId);

  return NextResponse.json({ order });
}
