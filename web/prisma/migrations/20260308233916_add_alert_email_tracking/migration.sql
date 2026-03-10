-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailSentLevel" TEXT;
