import { Prisma, type OrderStatus, type UploadStatus } from "@prisma/client";

import { authUserSelect } from "@/lib/auth";
import type { OrderSummary } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const orderDetailsArgs = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    user: {
      select: authUserSelect,
    },
    files: {
      orderBy: {
        createdAt: "asc",
      },
    },
  },
});

type OrderWithRelations = Prisma.OrderGetPayload<typeof orderDetailsArgs>;

function serializeOrder(order: OrderWithRelations): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    fileCount: order.fileCount,
    subtotalPence: order.subtotalPence,
    vatPence: order.vatPence,
    totalPence: order.totalPence,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customer: {
      id: order.user.id,
      firstName: order.user.firstName,
      lastName: order.user.lastName,
      companyName: order.user.companyName,
      email: order.user.email,
      role: order.user.role,
    },
    files: order.files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      bytes: file.bytes,
      uploadStatus: file.uploadStatus,
      cloudinaryPublicId: file.cloudinaryPublicId,
      cloudinaryUrl: file.cloudinaryUrl,
      errorMessage: file.errorMessage,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    })),
  };
}

export function deriveOrderStatus(
  uploadStatuses: Pick<{ uploadStatus: UploadStatus }, "uploadStatus">[],
): OrderStatus {
  if (uploadStatuses.some((file) => file.uploadStatus === "FAILED")) {
    return "FAILED";
  }

  if (
    uploadStatuses.length > 0 &&
    uploadStatuses.every((file) => file.uploadStatus === "UPLOADED")
  ) {
    return "RECEIVED";
  }

  return "UPLOADING";
}

export async function getOrdersForUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    ...orderDetailsArgs,
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map(serializeOrder);
}

export async function getOrdersForAdmin() {
  const orders = await prisma.order.findMany({
    ...orderDetailsArgs,
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map(serializeOrder);
}

export async function getSerializedOrderById(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    ...orderDetailsArgs,
  });

  return order ? serializeOrder(order) : null;
}
