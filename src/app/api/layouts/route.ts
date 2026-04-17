import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createLayoutForUser, getLayoutsForUser } from "@/lib/layouts";
import { createLayoutSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const layouts = await getLayoutsForUser(user.id);

  return NextResponse.json({ layouts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = createLayoutSchema.safeParse(
    await request.json().catch(() => ({})),
  );

  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid layout payload." },
      { status: 400 },
    );
  }

  const layout = await createLayoutForUser(user.id, payload.data);

  return NextResponse.json({ layout }, { status: 201 });
}
