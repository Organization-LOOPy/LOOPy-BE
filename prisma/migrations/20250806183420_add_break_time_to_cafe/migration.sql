/*
  Warnings:

  - A unique constraint covering the columns `[user_id,cafe_id]` on the table `stamp_books` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `cafes` ADD COLUMN `break_time` VARCHAR(100) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `stamp_books_user_id_cafe_id_key` ON `stamp_books`(`user_id`, `cafe_id`);
