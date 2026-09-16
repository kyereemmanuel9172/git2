-- AlterTable
ALTER TABLE "Church"
ADD COLUMN "premisesName" TEXT,
ADD COLUMN "premisesAddress" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "allowedRadiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 150,
ADD COLUMN "maxGpsUncertainty" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN "requireGpsForMembers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requireGpsForVisitors" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowQrFallback" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "openBeforeServiceMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "closeAfterStartMinutes" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "ServiceDay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "churchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSchedule" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "serviceDayId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "memberType" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hostName" TEXT,
    "notes" TEXT,
    "followedUp" BOOLEAN NOT NULL DEFAULT false,
    "convertedMemberId" TEXT,
    "churchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "ministry" TEXT,
    "photoUrl" TEXT,
    "notes" TEXT,
    "churchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodcastEpisode" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "speaker" TEXT,
    "series" TEXT,
    "publishDate" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "audioUrl" TEXT,
    "artworkUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "churchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodcastEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceDay_churchId_idx" ON "ServiceDay"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDay_churchId_name_key" ON "ServiceDay"("churchId", "name");

-- CreateIndex
CREATE INDEX "ServiceSchedule_churchId_date_idx" ON "ServiceSchedule"("churchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSchedule_churchId_date_key" ON "ServiceSchedule"("churchId", "date");

-- CreateIndex
CREATE INDEX "Visitor_churchId_idx" ON "Visitor"("churchId");

-- CreateIndex
CREATE INDEX "Visitor_visitedAt_idx" ON "Visitor"("visitedAt");

-- CreateIndex
CREATE INDEX "Child_churchId_idx" ON "Child"("churchId");

-- CreateIndex
CREATE INDEX "PodcastEpisode_churchId_idx" ON "PodcastEpisode"("churchId");

-- AddForeignKey
ALTER TABLE "ServiceDay" ADD CONSTRAINT "ServiceDay_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSchedule" ADD CONSTRAINT "ServiceSchedule_serviceDayId_fkey" FOREIGN KEY ("serviceDayId") REFERENCES "ServiceDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSchedule" ADD CONSTRAINT "ServiceSchedule_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
