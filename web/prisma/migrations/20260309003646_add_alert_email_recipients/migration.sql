-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "alertEmailRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[];
