-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubscriptionState" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DevicePairingState" AS ENUM ('UNPAIRED', 'PAIRING_PENDING', 'PAIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ActivationCodeStatus" AS ENUM ('ISSUED', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Session" (
    "sessionId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "Plan" (
    "planId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "profile" "WorkspaceProfile" NOT NULL,
    "deviceLimit" INTEGER NOT NULL,
    "trialDurationHours" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("planId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "subscriptionId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "state" "SubscriptionState" NOT NULL DEFAULT 'TRIAL',
    "trialStartedAt" TIMESTAMP(3) NOT NULL,
    "trialExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("subscriptionId")
);

-- CreateTable
CREATE TABLE "ActivationCode" (
    "activationCodeId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "ActivationCodeStatus" NOT NULL DEFAULT 'ISSUED',
    "boundDeviceId" UUID,
    "ticketHash" TEXT,
    "ticketExpiresAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("activationCodeId")
);

-- CreateTable
CREATE TABLE "Device" (
    "deviceId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "androidVersion" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "pairingState" "DevicePairingState" NOT NULL DEFAULT 'UNPAIRED',
    "lastSyncAt" TIMESTAMP(3),
    "batteryLevel" INTEGER,
    "networkType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("deviceId")
);

-- CreateTable
CREATE TABLE "Pairing" (
    "pairingId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "status" "PairingStatus" NOT NULL DEFAULT 'PENDING',
    "ticketHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Pairing_pkey" PRIMARY KEY ("pairingId")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "sessionId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("sessionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_accessTokenHash_key" ON "Session"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_workspaceId_idx" ON "Session"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationCode_codeHash_key" ON "ActivationCode"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationCode_ticketHash_key" ON "ActivationCode"("ticketHash");

-- CreateIndex
CREATE INDEX "ActivationCode_workspaceId_idx" ON "ActivationCode"("workspaceId");

-- CreateIndex
CREATE INDEX "Device_workspaceId_idx" ON "Device"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Pairing_ticketHash_key" ON "Pairing"("ticketHash");

-- CreateIndex
CREATE INDEX "Pairing_deviceId_idx" ON "Pairing"("deviceId");

-- CreateIndex
CREATE INDEX "Pairing_workspaceId_idx" ON "Pairing"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_accessTokenHash_key" ON "DeviceSession"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_refreshTokenHash_key" ON "DeviceSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "DeviceSession_deviceId_idx" ON "DeviceSession"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceSession_workspaceId_idx" ON "DeviceSession"("workspaceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("planId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pairing" ADD CONSTRAINT "Pairing_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pairing" ADD CONSTRAINT "Pairing_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

