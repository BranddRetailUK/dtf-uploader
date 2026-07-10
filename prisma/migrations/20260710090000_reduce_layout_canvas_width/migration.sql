ALTER TABLE "layouts" ALTER COLUMN "canvasWidthMm" SET DEFAULT 550;

UPDATE "layouts"
SET "canvasWidthMm" = 550
WHERE "canvasWidthMm" = 560;
