import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createEpsPreviewPng } from "@/lib/cloudinary";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/rate-limit";

const MAX_EPS_PREVIEW_BYTES = 25 * 1024 * 1024;

function isEpsFile(file: File) {
  return (
    file.type.toLowerCase() === "application/postscript" ||
    /\.eps$/i.test(file.name)
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await enforceRateLimit({
      scope: "layouts:eps-preview:user",
      identifier: user.id,
      limit: 30,
      windowMs: 15 * 60 * 1000,
      message: "Too many EPS preview requests. Please wait and try again.",
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }

    throw error;
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File) || !isEpsFile(file)) {
    return NextResponse.json({ error: "Please provide an EPS file." }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_EPS_PREVIEW_BYTES) {
    return NextResponse.json(
      { error: "EPS files must be between 1 byte and 25MB." },
      { status: 400 },
    );
  }

  try {
    const preview = await createEpsPreviewPng({
      bytes: Buffer.from(await file.arrayBuffer()),
      userId: user.id,
    });

    return new Response(preview, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "We couldn't create a preview for that EPS file." },
      { status: 422 },
    );
  }
}
