-- Multi-tenant foundation: Church table + churchId tenant scoping

CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "website" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "brandColor" TEXT NOT NULL DEFAULT '#4f46e5',
    "logoUrl" TEXT,
    "serviceTimes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'Starter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Church_slug_key" ON "Church"("slug");

INSERT INTO "Church" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('ck_default_church', 'Fire Setter International', 'fsi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD COLUMN "churchId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Member" ADD COLUMN "churchId" TEXT;
UPDATE "Member" SET "churchId" = 'ck_default_church';
ALTER TABLE "Member" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "Member" ADD CONSTRAINT "Member_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Member_churchId_idx" ON "Member"("churchId");

ALTER TABLE "Family" ADD COLUMN "churchId" TEXT;
UPDATE "Family" SET "churchId" = 'ck_default_church';
ALTER TABLE "Family" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "Family" ADD CONSTRAINT "Family_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Family_churchId_idx" ON "Family"("churchId");

ALTER TABLE "AttendanceRecord" ADD COLUMN "churchId" TEXT;
UPDATE "AttendanceRecord" SET "churchId" = 'ck_default_church';
ALTER TABLE "AttendanceRecord" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "AttendanceRecord_churchId_date_idx" ON "AttendanceRecord"("churchId", "date");

ALTER TABLE "Transaction" ADD COLUMN "churchId" TEXT;
UPDATE "Transaction" SET "churchId" = 'ck_default_church';
ALTER TABLE "Transaction" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Transaction_churchId_idx" ON "Transaction"("churchId");

ALTER TABLE "Contribution" ADD COLUMN "churchId" TEXT;
UPDATE "Contribution" SET "churchId" = 'ck_default_church';
ALTER TABLE "Contribution" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Contribution_churchId_idx" ON "Contribution"("churchId");

ALTER TABLE "Payment" ADD COLUMN "churchId" TEXT;
UPDATE "Payment" SET "churchId" = 'ck_default_church';
ALTER TABLE "Payment" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Payment_churchId_idx" ON "Payment"("churchId");

ALTER TABLE "Department" ADD COLUMN "churchId" TEXT;
UPDATE "Department" SET "churchId" = 'ck_default_church';
ALTER TABLE "Department" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "Department" ADD CONSTRAINT "Department_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "Department_name_key";
CREATE UNIQUE INDEX "Department_churchId_name_key" ON "Department"("churchId", "name");
CREATE INDEX "Department_churchId_idx" ON "Department"("churchId");

ALTER TABLE "ChurchEvent" ADD COLUMN "churchId" TEXT;
UPDATE "ChurchEvent" SET "churchId" = 'ck_default_church';
ALTER TABLE "ChurchEvent" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "ChurchEvent" ADD CONSTRAINT "ChurchEvent_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ChurchEvent_churchId_idx" ON "ChurchEvent"("churchId");

ALTER TABLE "EventRegistration" ADD COLUMN "churchId" TEXT;
UPDATE "EventRegistration" SET "churchId" = 'ck_default_church';
ALTER TABLE "EventRegistration" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "EventRegistration_churchId_idx" ON "EventRegistration"("churchId");

ALTER TABLE "PrayerRequest" ADD COLUMN "churchId" TEXT;
UPDATE "PrayerRequest" SET "churchId" = 'ck_default_church';
ALTER TABLE "PrayerRequest" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "PrayerRequest_churchId_idx" ON "PrayerRequest"("churchId");

ALTER TABLE "CounselingSession" ADD COLUMN "churchId" TEXT;
UPDATE "CounselingSession" SET "churchId" = 'ck_default_church';
ALTER TABLE "CounselingSession" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CounselingSession_churchId_idx" ON "CounselingSession"("churchId");

ALTER TABLE "Asset" ADD COLUMN "churchId" TEXT;
UPDATE "Asset" SET "churchId" = 'ck_default_church';
ALTER TABLE "Asset" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Asset_churchId_idx" ON "Asset"("churchId");

ALTER TABLE "CommunicationCampaign" ADD COLUMN "churchId" TEXT;
UPDATE "CommunicationCampaign" SET "churchId" = 'ck_default_church';
ALTER TABLE "CommunicationCampaign" ALTER COLUMN "churchId" SET NOT NULL;
ALTER TABLE "CommunicationCampaign" ADD CONSTRAINT "CommunicationCampaign_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CommunicationCampaign_churchId_idx" ON "CommunicationCampaign"("churchId");
