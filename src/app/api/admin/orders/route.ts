import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrdersForAdmin } from "@/lib/orders";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const orders = await getOrdersForAdmin();

  return NextResponse.json({ orders });
}
