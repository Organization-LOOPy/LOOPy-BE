/*
  Warnings:

  - You are about to drop the `coupons` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[social_id]` on the table `kakao_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `coupons` DROP FOREIGN KEY `coupons_cafe_id_fkey`;

-- DropForeignKey
ALTER TABLE `coupons` DROP FOREIGN KEY `coupons_user_id_fkey`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `inactived_at` DATETIME(3) NULL;

-- DropTable
DROP TABLE `coupons`;

-- CreateTable
CREATE TABLE `coupon_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cafe_id` BIGINT NOT NULL,
    `type` ENUM('discount', 'free_drink', 'free_dessert', 'special_offer') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `valid_days` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_coupons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `coupon_template_id` INTEGER NOT NULL,
    `acquisition_type` ENUM('promotion', 'stamp') NOT NULL,
    `status` ENUM('active', 'used', 'expired') NOT NULL DEFAULT 'active',
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expired_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `cafeId` BIGINT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `kakao_accounts_social_id_key` ON `kakao_accounts`(`social_id`);

-- AddForeignKey
ALTER TABLE `coupon_templates` ADD CONSTRAINT `coupon_templates_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_coupon_template_id_fkey` FOREIGN KEY (`coupon_template_id`) REFERENCES `coupon_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_cafeId_fkey` FOREIGN KEY (`cafeId`) REFERENCES `cafes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
