/*
  Warnings:

  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Play` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Slot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wheel` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER');

-- CreateEnum
CREATE TYPE "PlayLimitMode" AS ENUM ('UNLIMITED', 'ONCE_PER_IP', 'ONCE_PER_USER', 'ONCE_PER_DAY_IP', 'ONCE_PER_DAY_USER', 'ONCE_PER_MONTH_IP', 'ONCE_PER_MONTH_USER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'NEW_WHEEL_CREATED', 'WHEEL_STATUS_CHANGED', 'PRIZE_WON_USER', 'PRIZE_WON_ADMIN', 'LOW_PLAY_CREDITS', 'NEW_USER_REGISTERED', 'PLAN_CHANGED', 'SECURITY_ALERT', 'NEW_FEATURE', 'SLOT_MODIFIED', 'ACCOUNT_UPDATED', 'FORM_SUBMITTED');

-- DropForeignKey
ALTER TABLE "Play" DROP CONSTRAINT "Play_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Play" DROP CONSTRAINT "Play_slotId_fkey";

-- DropForeignKey
ALTER TABLE "Play" DROP CONSTRAINT "Play_wheelId_fkey";

-- DropForeignKey
ALTER TABLE "Slot" DROP CONSTRAINT "Slot_wheelId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Wheel" DROP CONSTRAINT "Wheel_companyId_fkey";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "Play";

-- DropTable
DROP TABLE "Slot";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Wheel";

-- DropEnum
DROP TYPE "Plan";

-- DropEnum
DROP TYPE "PlayLimit";

-- DropEnum
DROP TYPE "PlayResult";

-- DropEnum
DROP TYPE "RedemptionStatus";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "maxWheels" INTEGER NOT NULL DEFAULT 1,
    "maxPlays" INTEGER,
    "currentPlays" INTEGER NOT NULL DEFAULT 0,
    "planId" TEXT,
    "planName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "companyId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isPasswordSet" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wheels" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "WheelMode" NOT NULL DEFAULT 'RANDOM_WIN',
    "formSchema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "qrCodeLink" TEXT,
    "socialNetwork" "SocialNetwork",
    "redirectUrl" TEXT,
    "redirectText" TEXT,
    "playLimit" "PlayLimitMode" NOT NULL DEFAULT 'UNLIMITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wheels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "wheelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isWinning" BOOLEAN NOT NULL DEFAULT false,
    "prizeCode" TEXT,
    "color" TEXT,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plays" (
    "id" TEXT NOT NULL,
    "wheelId" TEXT NOT NULL,
    "slotId" TEXT,
    "userId" TEXT,
    "participantData" JSONB,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "prizeRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedAt" TIMESTAMP(3),
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receiveNewWheel" BOOLEAN NOT NULL DEFAULT true,
    "receiveWheelStatus" BOOLEAN NOT NULL DEFAULT true,
    "receivePrizeWonUser" BOOLEAN NOT NULL DEFAULT true,
    "receivePrizeWonAdmin" BOOLEAN NOT NULL DEFAULT true,
    "receiveNewUser" BOOLEAN NOT NULL DEFAULT true,
    "receivePlanChanged" BOOLEAN NOT NULL DEFAULT true,
    "receiveSecurityAlert" BOOLEAN NOT NULL DEFAULT true,
    "receiveNewFeature" BOOLEAN NOT NULL DEFAULT true,
    "emailSubscriptions" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "wheels_companyId_idx" ON "wheels"("companyId");

-- CreateIndex
CREATE INDEX "plays_wheelId_idx" ON "plays"("wheelId");

-- CreateIndex
CREATE INDEX "plays_userId_idx" ON "plays"("userId");

-- CreateIndex
CREATE INDEX "plays_slotId_idx" ON "plays"("slotId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");
