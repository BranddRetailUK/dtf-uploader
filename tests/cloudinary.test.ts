import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCloudinaryPublicId,
  hasPdfSignature,
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

test("buildCloudinaryPublicId normalizes the filename and enforces a pdf suffix", () => {
  const publicId = buildCloudinaryPublicId({
    userId: "user_1",
    orderId: "order_1",
    orderFileId: "file_1",
    originalName: "My Print Ready File.PDF",
  });

  assert.equal(publicId, "DTF/user_1/order_1/file_1-my-print-ready-file.pdf");
});

test("hasPdfSignature detects a valid PDF header", () => {
  assert.equal(
    hasPdfSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])),
    true,
  );
  assert.equal(
    hasPdfSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
    false,
  );
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
