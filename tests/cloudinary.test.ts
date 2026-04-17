import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCloudinaryPublicId,
  buildLayoutAssetCloudinaryFolder,
  buildLayoutOutputCloudinaryFolder,
  createSignedAssetDownloadUrl,
  createSignedAssetDeliveryUrl,
  getCloudinaryAssetVersion,
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

test("layout Cloudinary folders stay separate from v1 upload assets", () => {
  assert.equal(
    buildLayoutAssetCloudinaryFolder("user_1", "layout_1"),
    "DTF_LAYOUT/user_1/layout_1/assets",
  );
  assert.equal(
    buildLayoutOutputCloudinaryFolder("user_1", "layout_1"),
    "DTF_LAYOUT_OUTPUT/user_1/layout_1",
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

test("getCloudinaryAssetVersion parses a raw upload version from the stored URL", () => {
  assert.equal(
    getCloudinaryAssetVersion(
      "https://res.cloudinary.com/demo-cloud/raw/upload/v1776417996/DTF/u/o/file.pdf",
    ),
    1776417996,
  );
  assert.equal(getCloudinaryAssetVersion("https://example.com/file.pdf"), null);
});

test("createSignedAssetDeliveryUrl creates a signed raw upload URL", () => {
  setCloudinaryTestEnv();

  const signedUrl = createSignedAssetDeliveryUrl({
    cloudinaryPublicId: "DTF/user_1/order_1/file_1-my-print-ready-file.pdf",
    version: 1776417996,
  });

  assert.match(
    signedUrl,
    /^https:\/\/res\.cloudinary\.com\/demo-cloud\/raw\/upload\/s--[A-Za-z0-9_-]+--\/v1776417996\/DTF\/user_1\/order_1\/file_1-my-print-ready-file\.pdf(?:\?.*)?$/,
  );
});

test("createSignedAssetDownloadUrl creates a signed raw download API URL", () => {
  setCloudinaryTestEnv();

  const signedUrl = createSignedAssetDownloadUrl({
    cloudinaryPublicId: "DTF/user_1/order_1/file_1-my-print-ready-file.pdf",
    format: "pdf",
    expiresAt: 1776417996,
  });

  assert.match(
    signedUrl,
    /^https:\/\/api\.cloudinary\.com\/v1_1\/demo-cloud\/raw\/download\?timestamp=\d+&public_id=DTF%2Fuser_1%2Forder_1%2Ffile_1-my-print-ready-file\.pdf&format=pdf&type=upload&expires_at=1776417996&signature=[a-f0-9]+&api_key=key$/,
  );
});
