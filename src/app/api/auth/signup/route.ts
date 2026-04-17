import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { createUserSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = signupSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      {
        error: payload.error.issues[0]?.message ?? "Invalid signup payload.",
      },
      { status: 400 },
    );
  }

  const email = payload.data.email.toLowerCase();

  try {
    const user = await prisma.user.create({
      data: {
        firstName: payload.data.firstName,
        lastName: payload.data.lastName,
        companyName: payload.data.companyName,
        email,
        passwordHash: await hashPassword(payload.data.password),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        role: true,
      },
    });

    await createUserSession(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account already exists for that email address." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Could not create the account." },
      { status: 500 },
    );
  }
}
