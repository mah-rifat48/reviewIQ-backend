-- User accounts now have only ACTIVE or SUSPEND status.
-- Trial access remains represented by Subscription.plan = 'NONE' and System.freeTrialDuration.
ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;

UPDATE "User"
SET "status" = 'ACTIVE'
WHERE "status" = 'TRIAL';

CREATE TYPE "Status_new" AS ENUM ('ACTIVE', 'SUSPEND');

ALTER TABLE "User"
ALTER COLUMN "status" TYPE "Status_new"
USING ("status"::text::"Status_new");

ALTER TYPE "Status" RENAME TO "Status_old";
ALTER TYPE "Status_new" RENAME TO "Status";
DROP TYPE "Status_old";

ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
