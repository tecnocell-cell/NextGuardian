-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('DEVICE', 'ENROLLMENT', 'COMMAND', 'SECURITY');

-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('INFO', 'NOTICE', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('REQUEST_CHECKIN', 'SYNC_NOW', 'SHOW_MESSAGE', 'RING_DEVICE', 'REFRESH_DEVICE_INFO');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('QUEUED', 'DELIVERED', 'EXECUTED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Event" (
    "eventId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deviceId" UUID,
    "category" "EventCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "Command" (
    "commandId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "type" "CommandType" NOT NULL,
    "payload" JSONB,
    "status" "CommandStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "result" TEXT,

    CONSTRAINT "Command_pkey" PRIMARY KEY ("commandId")
);

-- CreateIndex
CREATE INDEX "Event_workspaceId_deviceId_occurredAt_idx" ON "Event"("workspaceId", "deviceId", "occurredAt");

-- CreateIndex
CREATE INDEX "Command_deviceId_status_idx" ON "Command"("deviceId", "status");

-- CreateIndex
CREATE INDEX "Command_workspaceId_idx" ON "Command"("workspaceId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

