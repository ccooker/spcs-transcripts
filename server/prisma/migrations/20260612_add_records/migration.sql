-- Migration: Add 6 student record tables + 2 new enums
-- Generated via: npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- Note: Full-schema diff used (no shadow DB available). Tables that already exist
--       (User, AuditLog, Student) are excluded here — db push handles idempotency.
-- Apply: npx prisma db push (authoritative apply step)

-- CreateEnum
CREATE TYPE "AwardLevel" AS ENUM ('SCHOOL', 'REGIONAL', 'STATE', 'NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "CareerInterest" AS ENUM ('MEDICINE_HEALTH', 'LAW', 'ENGINEERING', 'BUSINESS_FINANCE', 'EDUCATION', 'ARTS_DESIGN', 'SCIENCE_RESEARCH', 'IT_TECHNOLOGY', 'HOSPITALITY', 'SOCIAL_SERVICES', 'SPORTS', 'UNDECIDED');

-- CreateTable
CREATE TABLE "AcademicResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subjectOther" TEXT,
    "grade" VARCHAR(20) NOT NULL,
    "calendarYear" INTEGER NOT NULL,
    "formLevel" "FormLevel" NOT NULL,
    "notes" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" VARCHAR(500),
    "startMonth" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endMonth" INTEGER,
    "endYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "awardMonth" INTEGER NOT NULL,
    "awardYear" INTEGER NOT NULL,
    "level" "AwardLevel" NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" VARCHAR(500),
    "startMonth" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endMonth" INTEGER,
    "endYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerGoal" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "interests" "CareerInterest"[],
    "description" VARCHAR(500),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicResult_studentId_idx" ON "AcademicResult"("studentId");

-- CreateIndex
CREATE INDEX "AcademicResult_studentId_calendarYear_idx" ON "AcademicResult"("studentId", "calendarYear" DESC);

-- CreateIndex
CREATE INDEX "Activity_studentId_idx" ON "Activity"("studentId");

-- CreateIndex
CREATE INDEX "Award_studentId_idx" ON "Award"("studentId");

-- CreateIndex
CREATE INDEX "Award_studentId_awardYear_awardMonth_idx" ON "Award"("studentId", "awardYear" DESC, "awardMonth" DESC);

-- CreateIndex
CREATE INDEX "WorkExperience_studentId_idx" ON "WorkExperience"("studentId");

-- CreateIndex
CREATE INDEX "CareerGoal_studentId_createdAt_idx" ON "CareerGoal"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StaffNote_studentId_createdAt_idx" ON "StaffNote"("studentId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AcademicResult" ADD CONSTRAINT "AcademicResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerGoal" ADD CONSTRAINT "CareerGoal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerGoal" ADD CONSTRAINT "CareerGoal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNote" ADD CONSTRAINT "StaffNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNote" ADD CONSTRAINT "StaffNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
