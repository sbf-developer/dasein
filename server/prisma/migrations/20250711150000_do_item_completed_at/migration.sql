-- AlterTable
ALTER TABLE "DoItem" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill existing completed items
UPDATE "DoItem" SET "completedAt" = "updatedAt" WHERE "done" = true;

-- CreateIndex
CREATE INDEX "DoItem_completedAt_idx" ON "DoItem"("completedAt");
