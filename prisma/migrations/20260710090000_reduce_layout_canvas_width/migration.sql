ALTER TABLE "Layout" ALTER COLUMN "canvasWidthMm" SET DEFAULT 550;

UPDATE "Layout"
SET "canvasWidthMm" = 550
WHERE "canvasWidthMm" = 560;
