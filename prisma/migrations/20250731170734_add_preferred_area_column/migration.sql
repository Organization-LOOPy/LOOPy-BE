/*
  Warnings:

  - You are about to drop the column `category` on the `cafe_menu` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `cafe_menu` DROP COLUMN `category`;

-- AlterTable
ALTER TABLE `cafes` MODIFY `status` ENUM('active', 'inactive', 'deleted') NOT NULL DEFAULT 'inactive';

-- AlterTable
ALTER TABLE `user_preferences` ADD COLUMN `preferredArea` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `stamp_policies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cafe_id` INTEGER NOT NULL,
    `selected_image_url` TEXT NOT NULL,
    `condition_type` ENUM('AMOUNT', 'COUNT') NOT NULL,
    `min_amount` INTEGER NULL,
    `stamp_per_amount` INTEGER NULL,
    `drink_count` INTEGER NULL,
    `stamp_per_count` INTEGER NULL,
    `reward_type` ENUM('DISCOUNT', 'SIZE_UP', 'FREE_DRINK') NOT NULL,
    `discount_amount` INTEGER NULL,
    `menu_id` INTEGER NULL,
    `reward_description` VARCHAR(255) NOT NULL,
    `has_expiry` BOOLEAN NOT NULL DEFAULT false,
    `reward_expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stamp_policies_cafe_id_key`(`cafe_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stamp_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cafe_id` INTEGER NOT NULL,
    `image_url` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stamp_policies` ADD CONSTRAINT `stamp_policies_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_policies` ADD CONSTRAINT `stamp_policies_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `cafe_menu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamp_images` ADD CONSTRAINT `stamp_images_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
