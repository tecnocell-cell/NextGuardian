-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('GPS', 'FUSED', 'NETWORK');

-- CreateEnum
CREATE TYPE "GeofenceTransition" AS ENUM ('ENTER', 'EXIT', 'DWELL');

-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE 'LOCATION';

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "locationRetentionDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "locationStaleMinutes" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "LocationSample" (
    "locationSampleId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION NOT NULL,
    "source" "LocationSource" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "serverReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentVersion" TEXT NOT NULL,

    CONSTRAINT "LocationSample_pkey" PRIMARY KEY ("locationSampleId")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "geofenceId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "transitions" "GeofenceTransition"[],
    "dwellMinutes" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("geofenceId")
);

-- CreateTable
CREATE TABLE "GeofenceState" (
    "geofenceId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "inside" BOOLEAN NOT NULL,
    "since" TIMESTAMP(3) NOT NULL,
    "dwellNotifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeofenceState_pkey" PRIMARY KEY ("geofenceId","deviceId")
);

-- CreateIndex
CREATE INDEX "LocationSample_workspaceId_deviceId_serverReceivedAt_idx" ON "LocationSample"("workspaceId", "deviceId", "serverReceivedAt");

-- CreateIndex
CREATE INDEX "Geofence_workspaceId_idx" ON "Geofence"("workspaceId");

-- CreateIndex
CREATE INDEX "GeofenceState_workspaceId_deviceId_idx" ON "GeofenceState"("workspaceId", "deviceId");

-- AddForeignKey
ALTER TABLE "LocationSample" ADD CONSTRAINT "LocationSample_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSample" ADD CONSTRAINT "LocationSample_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceState" ADD CONSTRAINT "GeofenceState_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("geofenceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceState" ADD CONSTRAINT "GeofenceState_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceState" ADD CONSTRAINT "GeofenceState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

