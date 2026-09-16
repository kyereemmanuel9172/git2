ALTER TABLE "Member" ADD COLUMN "memberId" TEXT;
ALTER TABLE "Member" ADD COLUMN "photoUrl" TEXT;

UPDATE "Member"
SET "memberId" = UPPER(LEFT(COALESCE((SELECT c."slug" FROM "Church" c WHERE c."id" = "Member"."churchId"), 'CH'), 4)) || '-' ||
                LPAD((1 + (SELECT COUNT(*)
                           FROM "Member" m2
                           WHERE m2."churchId" = "Member"."churchId"
                             AND (m2."createdAt" < "Member"."createdAt"
                                  OR (m2."createdAt" = "Member"."createdAt" AND m2."id" < "Member"."id"))))::text, 4, '0')
WHERE "memberId" IS NULL;

CREATE UNIQUE INDEX "Member_churchId_memberId_key" ON "Member"("churchId", "memberId");
