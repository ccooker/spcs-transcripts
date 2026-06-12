-- CreateEnum
CREATE TYPE "FormLevel" AS ENUM ('FORM_1', 'FORM_2', 'FORM_3', 'FORM_4', 'FORM_5', 'FORM_6');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('DRAFT', 'FINALISED', 'NONE');

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "formLevel" "FormLevel" NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "schoolStudentId" TEXT NOT NULL,
    "studentEmail" TEXT,
    "studentPhone" TEXT,
    "parentEmail" TEXT,
    "parentPhone" TEXT,
    "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'NONE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolStudentId_key" ON "Student"("schoolStudentId");

-- CreateIndex
CREATE INDEX "Student_fullName_idx" ON "Student"("fullName");

-- CreateIndex
CREATE INDEX "Student_formLevel_archivedAt_idx" ON "Student"("formLevel", "archivedAt");

-- CreateIndex
CREATE INDEX "Student_transcriptStatus_idx" ON "Student"("transcriptStatus");

-- CreateIndex
CREATE INDEX "Student_archivedAt_idx" ON "Student"("archivedAt");
