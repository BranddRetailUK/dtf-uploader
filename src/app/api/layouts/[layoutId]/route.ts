import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { LayoutAssetOwnershipError, updateLayoutForUser } from "@/lib/layouts";
import { updateLayoutSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ layoutId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = updateLayoutSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid layout payload." },
      { status: 400 },
    );
  }

  if (
    payload.data.name === undefined &&
    payload.data.backgroundMode === undefined &&
    payload.data.items === undefined
  ) {
    return NextResponse.json(
      { error: "At least one layout field must be updated." },
      { status: 400 },
    );
  }

  const { layoutId } = await context.params;

  try {
    const layout = await updateLayoutForUser(user.id, layoutId, payload.data);

    if (!layout) {
      return NextResponse.json({ error: "Layout not found." }, { status: 404 });
    }

    return NextResponse.json({ layout });
  } catch (error) {
    if (error instanceof LayoutAssetOwnershipError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
