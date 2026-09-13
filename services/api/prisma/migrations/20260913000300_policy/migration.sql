-- CreateTable
CREATE TABLE "Policy" (
    "policyId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "minAppVersion" TEXT NOT NULL DEFAULT '0.0.0',
    "maxOfflineHours" INTEGER NOT NULL DEFAULT 24,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("policyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Policy_workspaceId_key" ON "Policy"("workspaceId");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

