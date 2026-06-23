-- Add sportData and moneylineDraw; migrate pitcher columns into sportData; drop legacy pitcher columns

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "sportData" JSONB;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "moneylineDraw" INTEGER;

-- Migrate existing MLB pitcher data into sportData
UPDATE "Game"
SET "sportData" = jsonb_strip_nulls(
  jsonb_build_object(
    'homePitcher', "homePitcher",
    'awayPitcher', "awayPitcher",
    'homePitcherStats', "homePitcherStats",
    'awayPitcherStats', "awayPitcherStats"
  )
)
WHERE "sportData" IS NULL
  AND (
    "homePitcher" IS NOT NULL
    OR "awayPitcher" IS NOT NULL
    OR "homePitcherStats" IS NOT NULL
    OR "awayPitcherStats" IS NOT NULL
  );

ALTER TABLE "Game" DROP COLUMN IF EXISTS "homePitcher";
ALTER TABLE "Game" DROP COLUMN IF EXISTS "awayPitcher";
ALTER TABLE "Game" DROP COLUMN IF EXISTS "homePitcherStats";
ALTER TABLE "Game" DROP COLUMN IF EXISTS "awayPitcherStats";
