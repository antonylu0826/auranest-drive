-- AlterTable
ALTER TABLE "drive_files" ADD COLUMN     "lock_token" TEXT,
ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "locked_by" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
