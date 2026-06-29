-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "articleType" TEXT NOT NULL DEFAULT 'game',
ADD COLUMN     "evergreenData" JSONB;
