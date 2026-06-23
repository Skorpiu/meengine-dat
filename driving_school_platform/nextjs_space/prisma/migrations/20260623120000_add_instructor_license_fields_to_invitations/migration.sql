-- AlterTable
ALTER TABLE "user_invitations" ADD COLUMN     "instructorLicenseNumber" TEXT,
ADD COLUMN     "instructorLicenseExpiry" TIMESTAMP(3);
