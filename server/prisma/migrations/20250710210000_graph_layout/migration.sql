-- CreateTable
CREATE TABLE "GraphLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GraphLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GraphLayout_userId_nodeKey_key" ON "GraphLayout"("userId", "nodeKey");
CREATE INDEX "GraphLayout_userId_idx" ON "GraphLayout"("userId");

-- AddForeignKey
ALTER TABLE "GraphLayout" ADD CONSTRAINT "GraphLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
