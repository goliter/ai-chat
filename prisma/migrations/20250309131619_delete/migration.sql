/*
  Warnings:

  - You are about to drop the `VectorData` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VectorData" DROP CONSTRAINT "VectorData_knowledgeBaseId_fkey";

-- DropTable
DROP TABLE "VectorData";
