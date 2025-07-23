/*
  Warnings:

  - You are about to alter the column `user_id` on the `badges` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `cafe_menu` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `cafe_menu` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `cafe_id` on the `cafe_menu` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `cafe_photo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `cafe_photo` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `cafe_id` on the `cafe_photo` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `cafes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `cafes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `cafe_id` on the `challenge_available_cafes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `challenge_participants` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to drop the column `description` on the `coupon_templates` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `coupon_templates` table. All the data in the column will be lost.
  - You are about to alter the column `cafe_id` on the `coupon_templates` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `kakao_accounts` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `cafe_id` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `point_transactions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `reviews` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `cafe_id` on the `reviews` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `stamp_books` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `cafe_id` on the `stamp_books` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `user_agreements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_agreements` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `user_agreements` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `user_bookmarks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `cafe_id` on the `user_bookmarks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to drop the column `cafeId` on the `user_coupons` table. All the data in the column will be lost.
  - You are about to alter the column `user_id` on the `user_coupons` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `user_preferences` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_preferences` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `user_preferences` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `verification_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `verification_codes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `user_id` on the `verification_codes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - A unique constraint covering the columns `[user_id,cafe_id]` on the table `stamp_books` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `discount_type` to the `coupon_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_value` to the `coupon_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expired_at` to the `coupon_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `user_coupons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `badges` DROP FOREIGN KEY `badges_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `cafe_menu` DROP FOREIGN KEY `cafe_menu_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `cafe_photo` DROP FOREIGN KEY `cafe_photo_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `challenge_available_cafes` DROP FOREIGN KEY `challenge_available_cafes_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `challenge_participants` DROP FOREIGN KEY `challenge_participants_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `coupon_templates` DROP FOREIGN KEY `coupon_templates_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `kakao_accounts` DROP FOREIGN KEY `kakao_accounts_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `point_transactions` DROP FOREIGN KEY `point_transactions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `stamp_books` DROP FOREIGN KEY `stamp_books_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `stamp_books` DROP FOREIGN KEY `stamp_books_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_agreements` DROP FOREIGN KEY `user_agreements_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_bookmarks` DROP FOREIGN KEY `user_bookmarks_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_bookmarks` DROP FOREIGN KEY `user_bookmarks_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_coupons` DROP FOREIGN KEY `user_coupons_cafeId_fkey`;

-- DropForeignKey
ALTER TABLE `user_coupons` DROP FOREIGN KEY `user_coupons_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_preferences` DROP FOREIGN KEY `user_preferences_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `verification_codes` DROP FOREIGN KEY `verification_codes_user_id_fkey`;

-- DropIndex
DROP INDEX `badges_user_id_fkey` ON `badges`;

-- DropIndex
DROP INDEX `cafe_menu_cafe_id_fkey` ON `cafe_menu`;

-- DropIndex
DROP INDEX `cafe_photo_cafe_id_fkey` ON `cafe_photo`;

-- DropIndex
DROP INDEX `challenge_available_cafes_cafe_id_fkey` ON `challenge_available_cafes`;

-- DropIndex
DROP INDEX `coupon_templates_cafe_id_fkey` ON `coupon_templates`;

-- DropIndex
DROP INDEX `notifications_cafe_id_fkey` ON `notifications`;

-- DropIndex
DROP INDEX `notifications_user_id_fkey` ON `notifications`;

-- DropIndex
DROP INDEX `point_transactions_user_id_fkey` ON `point_transactions`;

-- DropIndex
DROP INDEX `reviews_cafe_id_fkey` ON `reviews`;

-- DropIndex
DROP INDEX `reviews_user_id_fkey` ON `reviews`;

-- DropIndex
DROP INDEX `stamp_books_cafe_id_fkey` ON `stamp_books`;

-- DropIndex
DROP INDEX `stamp_books_user_id_fkey` ON `stamp_books`;

-- DropIndex
DROP INDEX `user_bookmarks_cafe_id_fkey` ON `user_bookmarks`;

-- DropIndex
DROP INDEX `user_coupons_cafeId_fkey` ON `user_coupons`;

-- DropIndex
DROP INDEX `user_coupons_user_id_fkey` ON `user_coupons`;

-- DropIndex
DROP INDEX `verification_codes_user_id_fkey` ON `verification_codes`;

-- AlterTable
ALTER TABLE `badges` MODIFY `user_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `cafe_menu` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `cafe_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `cafe_photo` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `cafe_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `cafes` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `challenge_available_cafes` MODIFY `cafe_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `challenge_participants` MODIFY `user_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `coupon_templates` DROP COLUMN `description`,
    DROP COLUMN `type`,
    ADD COLUMN `applicable_menu_id` INTEGER NULL,
    ADD COLUMN `discount_type` VARCHAR(20) NOT NULL,
    ADD COLUMN `discount_value` INTEGER NOT NULL,
    ADD COLUMN `expired_at` DATETIME(3) NOT NULL,
    MODIFY `cafe_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `kakao_accounts` MODIFY `user_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `user_id` INTEGER NOT NULL,
    MODIFY `cafe_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `point_transactions` MODIFY `user_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `reviews` MODIFY `user_id` INTEGER NOT NULL,
    MODIFY `cafe_id` INTEGER NOT NULL,
    MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `stamp_books` MODIFY `user_id` INTEGER NOT NULL,
    MODIFY `cafe_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user_agreements` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `user_bookmarks` MODIFY `user_id` INTEGER NOT NULL,
    MODIFY `cafe_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user_coupons` DROP COLUMN `cafeId`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    MODIFY `user_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user_preferences` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    ADD COLUMN `profile_url` TEXT NULL,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `verification_codes` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE UNIQUE INDEX `stamp_books_user_id_cafe_id_key` ON `stamp_books`(`user_id`, `cafe_id`);

-- AddForeignKey
ALTER TABLE `kakao_accounts` ADD CONSTRAINT `kakao_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_codes` ADD CONSTRAINT `verification_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_agreements` ADD CONSTRAINT `user_agreements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_bookmarks` ADD CONSTRAINT `user_bookmarks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_bookmarks` ADD CONSTRAINT `user_bookmarks_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenge_participants` ADD CONSTRAINT `challenge_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenge_available_cafes` ADD CONSTRAINT `challenge_available_cafes_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `badges` ADD CONSTRAINT `badges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_books` ADD CONSTRAINT `stamp_books_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_books` ADD CONSTRAINT `stamp_books_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_transactions` ADD CONSTRAINT `point_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cafe_menu` ADD CONSTRAINT `cafe_menu_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cafe_photo` ADD CONSTRAINT `cafe_photo_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_templates` ADD CONSTRAINT `coupon_templates_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_templates` ADD CONSTRAINT `coupon_templates_applicable_menu_id_fkey` FOREIGN KEY (`applicable_menu_id`) REFERENCES `cafe_menu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
