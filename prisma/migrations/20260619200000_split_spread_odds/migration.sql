-- AlterTable
ALTER TABLE "Game"
ADD COLUMN "spreadHome" DOUBLE PRECISION,
ADD COLUMN "spreadAway" DOUBLE PRECISION,
ADD COLUMN "spreadHomePrice" INTEGER,
ADD COLUMN "spreadAwayPrice" INTEGER;

-- Backfill from legacy single spread column (away line derived until next odds scan)
UPDATE "Game"
SET
  "spreadHome" = "spread",
  "spreadAway" = -"spread"
WHERE "spread" IS NOT NULL;

ALTER TABLE "Game" DROP COLUMN "spread";
