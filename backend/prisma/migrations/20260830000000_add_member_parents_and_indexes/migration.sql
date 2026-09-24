-- AlterTable
ALTER TABLE "Church" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "churchBranch" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "motherName" TEXT;

-- AlterTable
ALTER TABLE "PodcastEpisode" ALTER COLUMN "tags" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChurchEvent_churchId_startDate_idx" ON "ChurchEvent"("churchId", "startDate");

-- CreateIndex
CREATE INDEX "ChurchEvent_status_startDate_idx" ON "ChurchEvent"("status", "startDate");

-- CreateIndex
CREATE INDEX "Member_dateOfBirth_idx" ON "Member"("dateOfBirth");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");