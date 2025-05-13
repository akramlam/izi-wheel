/*
  Warnings:

  - You are about to drop the column `lead` on the `Play` table. All the data in the column will be lost.
  - You are about to drop the column `prizeId` on the `Play` table. All the data in the column will be lost.
  - You are about to drop the column `prizeCode` on the `Slot` table. All the data in the column will be lost.
  - You are about to drop the column `probability` on the `Slot` table. All the data in the column will be lost.
  - You are about to drop the `Prize` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyId` to the `Play` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slotId` to the `Play` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Slot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Wheel` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'REDEEMED');

-- DropForeignKey
ALTER TABLE "Prize" DROP CONSTRAINT "Prize_playId_fkey";

-- DropIndex
DROP INDEX "Play_prizeId_key";

-- AlterTable
ALTER TABLE "Play" DROP COLUMN "lead",
DROP COLUMN "prizeId",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "leadInfo" JSONB,
ADD COLUMN     "pin" TEXT,
ADD COLUMN     "qrLink" TEXT,
ADD COLUMN     "redeemedAt" TIMESTAMP(3),
ADD COLUMN     "redemptionStatus" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "slotId" TEXT NOT NULL,
ALTER COLUMN "ip" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Slot" DROP COLUMN "prizeCode",
DROP COLUMN "probability",
ADD COLUMN     "color" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isWinning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Wheel" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "mode" SET DEFAULT 'RANDOM_WIN',
ALTER COLUMN "formSchema" DROP NOT NULL,
ALTER COLUMN "isActive" SET DEFAULT true;

-- DropTable
DROP TABLE "Prize";

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
