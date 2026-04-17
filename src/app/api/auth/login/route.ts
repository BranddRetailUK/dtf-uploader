import { NextResponse } from "next/server";

import { createUserSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RateLimitExceededError,
  enforceRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = loginSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid login payload." },
      { status: 400 },
    );
  }

  const email = payload.data.email.toLowerCase();

  try {
    await enforceRateLimit({
      scope: "auth:login:ip",
      identifier: getClientIp(request),
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many login attempts. Please wait and try again.",
    });

    await enforceRateLimit({
      scope: "auth:login:email",
      identifier: email,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many login attempts. Please wait and try again.",
    });

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account matches that email and password." },
        { status: 401 },
      );
    }

    const passwordMatches = await verifyPassword(
      payload.data.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "No account matches that email and password." },
        { status: 401 },
      );
    }

    if (payload.data.adminOnly && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "This login is restricted to admin accounts." },
        { status: 403 },
      );
    }

    await createUserSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        email: user.email,
        role: user.role,
      },
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
}
