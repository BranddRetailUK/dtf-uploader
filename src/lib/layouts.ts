import { Prisma } from "@prisma/client";

import type { LayoutBackgroundMode, LayoutSummary } from "@/lib/domain";
import {
  DEFAULT_LAYOUT_BACKGROUND_MODE,
  LAYOUT_CANVAS_HEIGHT_MM,
  LAYOUT_CANVAS_WIDTH_MM,
} from "@/lib/layout-config";
import { prisma } from "@/lib/prisma";

const layoutDetailsArgs = Prisma.validator<Prisma.LayoutDefaultArgs>()({
  include: {
    items: {
      include: {
        artworkAsset: true,
      },
      orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }],
    },
  },
});

type LayoutWithRelations = Prisma.LayoutGetPayload<typeof layoutDetailsArgs>;

type CreateLayoutInput = {
  name?: string;
  backgroundMode?: LayoutBackgroundMode;
};

type UpdateLayoutInput = {
  name?: string;
  backgroundMode?: LayoutBackgroundMode;
  items?: {
    artworkAssetId: string;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    rotationDeg: number;
    quantity: number;
    zIndex: number;
  }[];
};

export class LayoutAssetOwnershipError extends Error {
  constructor() {
    super("One or more artwork assets are invalid for this layout.");
  }
}

function serializeLayout(layout: LayoutWithRelations): LayoutSummary {
  return {
    id: layout.id,
    name: layout.name,
    backgroundMode: layout.backgroundMode,
    canvasWidthMm: layout.canvasWidthMm,
    canvasHeightMm: layout.canvasHeightMm,
    createdAt: layout.createdAt.toISOString(),
    updatedAt: layout.updatedAt.toISOString(),
    items: layout.items.map((item) => ({
      id: item.id,
      xMm: item.xMm,
      yMm: item.yMm,
      widthMm: item.widthMm,
      heightMm: item.heightMm,
      rotationDeg: item.rotationDeg,
      quantity: item.quantity,
      zIndex: item.zIndex,
      artworkAsset: {
        id: item.artworkAsset.id,
        originalName: item.artworkAsset.originalName,
        mimeType: item.artworkAsset.mimeType,
        bytes: item.artworkAsset.bytes,
        widthPx: item.artworkAsset.widthPx,
        heightPx: item.artworkAsset.heightPx,
        dpiX: item.artworkAsset.dpiX,
        dpiY: item.artworkAsset.dpiY,
        aspectRatio: item.artworkAsset.aspectRatio,
        uploadStatus: item.artworkAsset.uploadStatus,
        cloudinaryPublicId: item.artworkAsset.cloudinaryPublicId,
        cloudinaryUrl: item.artworkAsset.cloudinaryUrl,
        errorMessage: item.artworkAsset.errorMessage,
        createdAt: item.artworkAsset.createdAt.toISOString(),
        updatedAt: item.artworkAsset.updatedAt.toISOString(),
      },
    })),
  };
}

async function getLayoutRecordForUser(userId: string, layoutId: string) {
  return prisma.layout.findFirst({
    where: {
      id: layoutId,
      userId,
    },
    ...layoutDetailsArgs,
  });
}

export async function getLayoutsForUser(userId: string) {
  const layouts = await prisma.layout.findMany({
    where: { userId },
    ...layoutDetailsArgs,
    orderBy: {
      updatedAt: "desc",
    },
  });

  return layouts.map(serializeLayout);
}

export async function getSerializedLayoutForUser(userId: string, layoutId: string) {
  const layout = await getLayoutRecordForUser(userId, layoutId);

  return layout ? serializeLayout(layout) : null;
}

export async function createLayoutForUser(userId: string, input: CreateLayoutInput) {
  return prisma.$transaction(async (tx) => {
    const layoutCount = await tx.layout.count({
      where: { userId },
    });

    const layout = await tx.layout.create({
      data: {
        userId,
        name: input.name ?? `Layout ${layoutCount + 1}`,
        backgroundMode: input.backgroundMode ?? DEFAULT_LAYOUT_BACKGROUND_MODE,
        canvasWidthMm: LAYOUT_CANVAS_WIDTH_MM,
        canvasHeightMm: LAYOUT_CANVAS_HEIGHT_MM,
      },
      ...layoutDetailsArgs,
    });

    return serializeLayout(layout);
  });
}

export async function updateLayoutForUser(
  userId: string,
  layoutId: string,
  input: UpdateLayoutInput,
) {
  const current = await prisma.layout.findFirst({
    where: {
      id: layoutId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!current) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      const assetIds = [...new Set(input.items.map((item) => item.artworkAssetId))];

      if (assetIds.length > 0) {
        const ownedAssetCount = await tx.artworkAsset.count({
          where: {
            userId,
            id: {
              in: assetIds,
            },
          },
        });

        if (ownedAssetCount !== assetIds.length) {
          throw new LayoutAssetOwnershipError();
        }
      }
    }

    const layout = await tx.layout.update({
      where: {
        id: layoutId,
      },
      data: {
        name: input.name,
        backgroundMode: input.backgroundMode,
        items: input.items
          ? {
              deleteMany: {},
              create: input.items.map((item) => ({
                xMm: item.xMm,
                yMm: item.yMm,
                widthMm: item.widthMm,
                heightMm: item.heightMm,
                rotationDeg: item.rotationDeg,
                quantity: item.quantity,
                zIndex: item.zIndex,
                artworkAsset: {
                  connect: {
                    id: item.artworkAssetId,
                  },
                },
              })),
            }
          : undefined,
      },
      ...layoutDetailsArgs,
    });

    return serializeLayout(layout);
  });
}
