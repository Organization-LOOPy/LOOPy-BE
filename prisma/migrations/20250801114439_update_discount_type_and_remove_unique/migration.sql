/*
  Warnings:

  - The values [FREE_ITEM] on the enum `coupon_templates_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- DropForeignKey
ALTER TABLE `stamp_books` DROP FOREIGN KEY `stamp_books_user_id_fkey`;

-- DropIndex
DROP INDEX `stamp_books_user_id_cafe_id_key` ON `stamp_books`;

-- AlterTable
ALTER TABLE `coupon_templates` MODIFY `type` ENUM('DISCOUNT', 'FREE_DRINK', 'SIZE_UP') NOT NULL;

-- AddForeignKey
-- ALTER TABLE `point_transactions` ADD CONSTRAINT `point_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
