-- CreateTable
CREATE TABLE "payout_statuses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "payoutDate" TIMESTAMP(3) NOT NULL,
    "payoutAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "isSetAside" BOOLEAN NOT NULL DEFAULT false,
    "setAsideAt" TIMESTAMP(3),
    "setAsideBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_statuses_organizationId_payoutDate_idx" ON "payout_statuses"("organizationId", "payoutDate");

-- CreateIndex
CREATE UNIQUE INDEX "payout_statuses_organizationId_payoutId_key" ON "payout_statuses"("organizationId", "payoutId");

-- AddForeignKey
ALTER TABLE "payout_statuses" ADD CONSTRAINT "payout_statuses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;