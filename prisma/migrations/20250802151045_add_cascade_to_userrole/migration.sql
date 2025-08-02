/*
  Warnings:

  - Added the required column `method` to the `stamps` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `user_role` DROP FOREIGN KEY `user_role_userId_fkey`;

-- AlterTable
ALTER TABLE `stamps` ADD COLUMN `method` VARCHAR(20) NOT NULL;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_books` ADD CONSTRAINT `stamp_books_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
