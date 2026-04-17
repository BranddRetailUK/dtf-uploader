import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";

export class RateLimitExceededError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function hashIdentifier(identifier: string) {
  return crypto
    .createHash("sha256")
    .update(identifier.trim().toLowerCase())
    .digest("hex");
}

function getWindowStart(windowMs: number) {
  return new Date(Math.floor(Date.now() / windowMs) * windowMs);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  const fallbacks = [
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("fly-client-ip"),
  ];

  return fallbacks.find((value) => value?.trim())?.trim() ?? "unknown";
}

export async function enforceRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  message: string;
}) {
  const windowStart = getWindowStart(input.windowMs);
  const bucketKey = `${input.scope}:${hashIdentifier(input.identifier)}`;

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      bucketKey_windowStart: {
        bucketKey,
        windowStart,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      bucketKey,
      windowStart,
      count: 1,
    },
    select: {
      count: true,
    },
  });

  if (bucket.count <= input.limit) {
    return;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart.getTime() + input.windowMs - Date.now()) / 1000),
  );

  throw new RateLimitExceededError(input.message, retryAfterSeconds);
}
