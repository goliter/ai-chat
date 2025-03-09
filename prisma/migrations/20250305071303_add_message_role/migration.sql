/*
  Warnings:

  - You are about to drop the column `author` on the `Message` table. All the data in the column will be lost.
  - Added the required column `role` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('system', 'user', 'assistant', 'data');

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "author",
ADD COLUMN     "role" "Role" NOT NULL;
