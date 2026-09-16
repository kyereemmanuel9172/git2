-- AlterTable
ALTER TABLE "Member" ADD COLUMN "portalPasswordResetToken" TEXT;
ALTER TABLE "Member" ADD COLUMN "portalPasswordResetExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Member_portalPasswordResetToken_key" ON "Member"("portalPasswordResetToken");
