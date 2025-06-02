-- CreateEnum
CREATE TYPE "SocialNetwork" AS ENUM ('GOOGLE', 'INSTAGRAM', 'TIKTOK', 'SNAPCHAT', 'UBER_EATS', 'TRIPADVISOR', 'TRUSTPILOT', 'DELIVEROO', 'PLANITY', 'FACEBOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "PlayLimit" AS ENUM ('UNLIMITED', 'ONCE_PER_DAY', 'ONCE_PER_MONTH');

-- AlterTable
ALTER TABLE "Wheel" ADD COLUMN "socialNetwork" "SocialNetwork",
                    ADD COLUMN "redirectUrl" TEXT,
                    ADD COLUMN "redirectText" TEXT,
                    ADD COLUMN "playLimit" "PlayLimit" NOT NULL DEFAULT 'ONCE_PER_DAY'; 