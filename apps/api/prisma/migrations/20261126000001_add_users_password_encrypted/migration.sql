-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_encrypted" TEXT;
