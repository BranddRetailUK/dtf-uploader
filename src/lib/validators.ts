import { z } from "zod";

import { MAX_LAYOUT_ITEMS } from "@/lib/layout-config";
import { MAX_ORDER_FILE_QUANTITY, MAX_ORDER_FILES } from "@/lib/order-config";

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
      z.object({
        clientId: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(200),
        size: z.number().int().positive().max(250 * 1024 * 1024),
        type: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(MAX_ORDER_FILE_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_ORDER_FILES),
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

export const layoutBackgroundModeSchema = z.enum(["LIGHT", "GREY", "DARK"]);

export const createLayoutSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  backgroundMode: layoutBackgroundModeSchema.optional(),
});

export const updateLayoutSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  backgroundMode: layoutBackgroundModeSchema.optional(),
  items: z
    .array(
      z.object({
        artworkAssetId: z.string().trim().min(1),
        xMm: z.number().finite(),
        yMm: z.number().finite(),
        widthMm: z.number().positive(),
        heightMm: z.number().positive(),
        rotationDeg: z.number().finite(),
        quantity: z.number().int().min(1).max(MAX_ORDER_FILE_QUANTITY),
        zIndex: z.number().int().min(0),
      }),
    )
    .max(MAX_LAYOUT_ITEMS)
    .optional(),
});
