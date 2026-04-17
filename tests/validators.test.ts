import test from "node:test";
import assert from "node:assert/strict";

import {
  createOrderSchema,
  uploadFinalizeSchema,
  signupSchema,
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

test("createOrderSchema rejects non-PDF uploads", () => {
  const result = createOrderSchema.safeParse({
    files: [
      {
        clientId: "abc123",
        name: "not-a-pdf.png",
        size: 1200,
        type: "image/png",
      },
    ],
  });

  assert.equal(result.success, false);
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
