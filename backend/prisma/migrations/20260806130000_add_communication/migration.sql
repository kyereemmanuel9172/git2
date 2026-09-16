-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('SMS', 'EMAIL', 'CALL');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('PENDING', 'SENT', 'PARTIAL', 'CANCELLED');

-- CreateTable
CREATE TABLE "CommunicationCampaign" (
    "id" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "memberStatus" TEXT,
    "departmentId" TEXT,
    "gender" TEXT,
    "city" TEXT,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "channel" "CommunicationType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationCampaign_status_scheduledAt_idx" ON "CommunicationCampaign"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "CommunicationCampaign_type_idx" ON "CommunicationCampaign"("type");

-- CreateIndex
CREATE INDEX "CommunicationMessage_campaignId_idx" ON "CommunicationMessage"("campaignId");

-- AddForeignKey
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
