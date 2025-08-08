/*
  Warnings:

  - You are about to drop the column `reward_expires_at` on the `stamp_policies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `cafe_menu` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `cafes` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `stamp_books` MODIFY `reward_detail` VARCHAR(255) NULL,
    MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `stamp_policies` DROP COLUMN `reward_expires_at`;

-- AlterTable
ALTER TABLE `user_coupons` MODIFY `updated_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `user_cafe_notification` (
    `user_id` INTEGER NOT NULL,
    `cafe_id` INTEGER NOT NULL,

    UNIQUE INDEX `user_cafe_notification_user_id_cafe_id_key`(`user_id`, `cafe_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_cafe_notification` ADD CONSTRAINT `user_cafe_notification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_cafe_notification` ADD CONSTRAINT `user_cafe_notification_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
