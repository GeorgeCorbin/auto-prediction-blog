-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'READY', 'PUBLISHED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "espnEventId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeTeamAbbr" TEXT NOT NULL,
    "awayTeamAbbr" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sport" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "spread" DOUBLE PRECISION,
    "moneylineHome" INTEGER,
    "moneylineAway" INTEGER,
    "total" DOUBLE PRECISION,
    "homePitcher" TEXT,
    "awayPitcher" TEXT,
    "homePitcherStats" JSONB,
    "awayPitcherStats" JSONB,
    "homeStats" JSONB,
    "awayStats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pick" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_espnEventId_key" ON "Game"("espnEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_gameId_key" ON "Article"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
