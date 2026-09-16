-- AlterTable
ALTER TABLE "AttendanceRecord"
ADD COLUMN "checkedOutAt" TIMESTAMP(3),
ADD COLUMN "checkedOutBy" TEXT;
