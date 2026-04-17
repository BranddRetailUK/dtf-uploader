-- CreateEnum
CREATE TYPE "LayoutBackgroundMode" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "OrderFile" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Layout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "backgroundMode" "LayoutBackgroundMode" NOT NULL DEFAULT 'LIGHT',
    "canvasWidthMm" INTEGER NOT NULL DEFAULT 560,
    "canvasHeightMm" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Layout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtworkAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "dpiX" INTEGER,
    "dpiY" INTEGER,
    "aspectRatio" DOUBLE PRECISION,
    "uploadStatus" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "cloudinaryPublicId" TEXT,
    "cloudinaryUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayoutItem" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "artworkAssetId" TEXT NOT NULL,
    "xMm" DOUBLE PRECISION NOT NULL,
    "yMm" DOUBLE PRECISION NOT NULL,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "heightMm" DOUBLE PRECISION NOT NULL,
    "rotationDeg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LayoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Layout_userId_createdAt_idx" ON "Layout"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtworkAsset_userId_createdAt_idx" ON "ArtworkAsset"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ArtworkAsset_uploadStatus_idx" ON "ArtworkAsset"("uploadStatus");

-- CreateIndex
CREATE INDEX "LayoutItem_layoutId_zIndex_idx" ON "LayoutItem"("layoutId", "zIndex");

-- CreateIndex
CREATE INDEX "LayoutItem_artworkAssetId_idx" ON "LayoutItem"("artworkAssetId");

-- AddForeignKey
ALTER TABLE "Layout" ADD CONSTRAINT "Layout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkAsset" ADD CONSTRAINT "ArtworkAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutItem" ADD CONSTRAINT "LayoutItem_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutItem" ADD CONSTRAINT "LayoutItem_artworkAssetId_fkey" FOREIGN KEY ("artworkAssetId") REFERENCES "ArtworkAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
