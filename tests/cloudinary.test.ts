import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCloudinaryPublicId,
  isTrustedCloudinaryAssetUrl,
} from "@/lib/cloudinary";

function setCloudinaryTestEnv() {
  process.env.DATABASE_URL ??=
    "postgresql://user:password@localhost:5432/dtf_uploader?schema=public";
  process.env.SESSION_SECRET ??= "a".repeat(32);
  process.env.CLOUDINARY_CLOUD_NAME ??= "demo-cloud";
  process.env.CLOUDINARY_API_KEY ??= "key";
  process.env.CLOUDINARY_API_SECRET ??= "secret";
}

test("buildCloudinaryPublicId normalizes the filename and preserves the original extension", () => {
  const publicId = buildCloudinaryPublicId({
    userId: "user_1",
    orderId: "order_1",
    orderFileId: "file_1",
    originalName: "My Print Ready File.AI",
  });

  assert.equal(publicId, "DTF/user_1/order_1/file_1-my-print-ready-file.ai");
});

test("isTrustedCloudinaryAssetUrl only accepts the configured Cloudinary raw upload path", () => {
  setCloudinaryTestEnv();

  assert.equal(
    isTrustedCloudinaryAssetUrl(
      "https://res.cloudinary.com/demo-cloud/raw/upload/v1/DTF/u/o/file.pdf",
    ),
    true,
  );
  assert.equal(
    isTrustedCloudinaryAssetUrl("https://res.cloudinary.com/other/raw/upload/file"),
    false,
  );
  assert.equal(isTrustedCloudinaryAssetUrl("javascript:alert(1)"), false);
});
