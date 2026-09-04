/*
  Warnings:

  - You are about to drop the `ContactUs` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `competitor` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "competitor" BOOLEAN NOT NULL,
ADD COLUMN     "reportPlan" TEXT[];

-- DropTable
DROP TABLE "ContactUs";
