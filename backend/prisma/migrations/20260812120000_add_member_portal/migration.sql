-- AlterTable
ALTER TABLE "Member" ADD COLUMN "portalPasswordHash" TEXT;
ALTER TABLE "Member" ADD COLUMN "lastPortalLoginAt" TIMESTAMP(3);
