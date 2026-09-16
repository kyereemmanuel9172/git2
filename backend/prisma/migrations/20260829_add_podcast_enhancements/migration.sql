-- CreateEnum
CREATE TYPE "PodcastStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable: Add new columns to PodcastEpisode
ALTER TABLE "PodcastEpisode" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PodcastEpisode" ADD COLUMN "episodeNumber" INTEGER;
ALTER TABLE "PodcastEpisode" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PodcastEpisode" ADD COLUMN "createdBy" TEXT;

-- CreateIndex: Create unique index on slug
CREATE UNIQUE INDEX "PodcastEpisode_slug_key" ON "PodcastEpisode"("slug");

-- CreateIndex: Add indexes for better query performance
CREATE INDEX "PodcastEpisode_status_idx" ON "PodcastEpisode"("status");
CREATE INDEX "PodcastEpisode_series_idx" ON "PodcastEpisode"("series");

-- Update existing records to have unique slugs
UPDATE "PodcastEpisode" SET "slug" = LOWER(REPLACE(REPLACE(REPLACE("title", ' ', '-'), '.', ''), ',', '')) || '-' || SUBSTRING("id" FROM 1 FOR 8) WHERE "slug" = '';

-- AlterTable: Change status column type (requires data migration)
-- First update all existing status values to ensure they match the enum
UPDATE "PodcastEpisode" SET "status" = 'DRAFT' WHERE "status" NOT IN ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterColumn: Change status from String to enum
ALTER TABLE "PodcastEpisode" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PodcastEpisode" ALTER COLUMN "status" TYPE "PodcastStatus" USING "status"::"PodcastStatus";
ALTER TABLE "PodcastEpisode" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
