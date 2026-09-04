/*
  Warnings:

  - You are about to drop the `BusinessInformation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BusinessInformation" DROP CONSTRAINT "BusinessInformation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_businessInformationId_fkey";

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "profileImage" TEXT;

-- AlterTable
ALTER TABLE "NotificationSettings" ALTER COLUMN "emailMonthlyReports" SET DEFAULT false,
ALTER COLUMN "emailImportantAlerts" SET DEFAULT false,
ALTER COLUMN "emailWeeklySummary" SET DEFAULT false,
ALTER COLUMN "inAppNegativeReview" SET DEFAULT false,
ALTER COLUMN "inAppRatingDrop" SET DEFAULT false,
ALTER COLUMN "inAppMonthlyReport" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "competitor" SET DEFAULT false;

-- AlterTable
ALTER TABLE "System" ADD COLUMN     "allowSignups" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isMaintenanceMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "BusinessInformation";

-- DropTable
DROP TABLE "Location";
