import { z } from "zod";

function isPdfFile(name: string, mimeType: string) {
  return (
    mimeType.toLowerCase().includes("pdf") || name.toLowerCase().endsWith(".pdf")
  );
}

export const signupSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  companyName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(100),
  adminOnly: z.boolean().optional(),
});

export const createOrderSchema = z.object({
  files: z
    .array(
      z
        .object({
          clientId: z.string().trim().min(1).max(120),
          name: z.string().trim().min(1).max(200),
          size: z.number().int().positive().max(250 * 1024 * 1024),
          type: z.string().trim().min(1).max(120),
        })
        .refine(
          ({ name, type }) => isPdfFile(name, type),
          "Only PDF files are supported.",
        ),
    )
    .min(1)
    .max(40),
});

export const uploadSignSchema = z.object({
  orderId: z.string().trim().min(1),
  orderFileId: z.string().trim().min(1),
});

export const uploadFinalizeSchema = z
  .object({
    orderId: z.string().trim().min(1),
    orderFileId: z.string().trim().min(1),
    success: z.boolean(),
    cloudinaryPublicId: z.string().trim().min(1).optional(),
    cloudinaryUrl: z.string().trim().url().optional(),
    bytes: z.number().int().nonnegative().optional(),
    errorMessage: z.string().trim().min(1).max(320).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.success) {
      if (!value.cloudinaryPublicId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cloudinaryPublicId"],
          message: "cloudinaryPublicId is required on successful uploads.",
        });
      }

      if (!value.cloudinaryUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cloudinaryUrl"],
          message: "cloudinaryUrl is required on successful uploads.",
        });
      }
    } else if (!value.errorMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["errorMessage"],
        message: "errorMessage is required on failed uploads.",
      });
    }
  });

export const adminStatusSchema = z.object({
  status: z.enum(["RECEIVED", "IN_PRODUCTION", "COMPLETED", "FAILED"]),
});
