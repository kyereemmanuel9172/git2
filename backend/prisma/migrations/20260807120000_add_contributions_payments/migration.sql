-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('TITHE', 'OFFERING', 'SPECIAL', 'PLEDGE');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('RECORDED', 'VERIFIED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK', 'CARD', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'PENDING', 'FAILED', 'REFUNDED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('MANUAL', 'PROVIDER', 'IMPORT');

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "type" "ContributionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "ContributionStatus" NOT NULL DEFAULT 'RECORDED',
    "memberId" TEXT,
    "giverName" TEXT,
    "service" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payerName" TEXT,
    "category" TEXT,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "source" "PaymentSource" NOT NULL DEFAULT 'MANUAL',
    "memberId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contribution_type_date_idx" ON "Contribution"("type", "date");

-- CreateIndex
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

-- CreateIndex
CREATE INDEX "Contribution_memberId_idx" ON "Contribution"("memberId");

-- CreateIndex
CREATE INDEX "Payment_status_date_idx" ON "Payment"("status", "date");

-- CreateIndex
CREATE INDEX "Payment_memberId_idx" ON "Payment"("memberId");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
