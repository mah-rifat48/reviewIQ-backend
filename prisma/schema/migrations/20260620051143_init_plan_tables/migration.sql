-- CreateTable
CREATE TABLE "StarterPlan" (
    "id" TEXT NOT NULL,
    "review" INTEGER NOT NULL DEFAULT 100,
    "location" INTEGER NOT NULL DEFAULT 10,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "business" INTEGER NOT NULL DEFAULT 1,
    "reportPlan" TEXT[],
    "competitor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarterPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalPlan" (
    "id" TEXT NOT NULL,
    "review" INTEGER NOT NULL DEFAULT 1000,
    "location" INTEGER NOT NULL DEFAULT 100,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "business" INTEGER NOT NULL DEFAULT 1,
    "reportPlan" TEXT[],
    "competitor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalPlan_pkey" PRIMARY KEY ("id")
);
