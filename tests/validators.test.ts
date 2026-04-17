import test from "node:test";
import assert from "node:assert/strict";

import {
  createLayoutSchema,
  createOrderSchema,
  signupSchema,
  updateLayoutSchema,
  uploadFinalizeSchema,
} from "@/lib/validators";

test("signupSchema accepts the required customer profile fields", () => {
  const result = signupSchema.safeParse({
    firstName: "Ada",
    lastName: "Lovelace",
    companyName: "Analytical Press",
    email: "ada@example.com",
    password: "supersecurepassword",
  });

  assert.equal(result.success, true);
});

test("createOrderSchema accepts non-PDF uploads", () => {
  const result = createOrderSchema.safeParse({
    files: [
      {
        clientId: "abc123",
        name: "not-a-pdf.png",
        size: 1200,
        type: "image/png",
        quantity: 3,
      },
    ],
  });

  assert.equal(result.success, true);
});

test("createOrderSchema rejects invalid upload quantities", () => {
  const result = createOrderSchema.safeParse({
    files: [
      {
        clientId: "abc123",
        name: "not-a-pdf.png",
        size: 1200,
        type: "image/png",
        quantity: 0,
      },
    ],
  });

  assert.equal(result.success, false);
});

test("createLayoutSchema accepts optional V2 layout fields", () => {
  const result = createLayoutSchema.safeParse({
    name: "Layout 1",
    backgroundMode: "DARK",
  });

  assert.equal(result.success, true);
});

test("updateLayoutSchema accepts layout items", () => {
  const result = updateLayoutSchema.safeParse({
    backgroundMode: "LIGHT",
    items: [
      {
        artworkAssetId: "asset_1",
        xMm: 10,
        yMm: 20,
        widthMm: 100,
        heightMm: 80,
        rotationDeg: 0,
        quantity: 2,
        zIndex: 1,
      },
    ],
  });

  assert.equal(result.success, true);
});

test("uploadFinalizeSchema requires Cloudinary fields on success", () => {
  const result = uploadFinalizeSchema.safeParse({
    orderId: "order_1",
    orderFileId: "file_1",
    success: true,
  });

  assert.equal(result.success, false);
});

test("uploadFinalizeSchema accepts failed uploads with an error message", () => {
  const result = uploadFinalizeSchema.safeParse({
    orderId: "order_1",
    orderFileId: "file_1",
    success: false,
    errorMessage: "Network timeout",
  });

  assert.equal(result.success, true);
});
