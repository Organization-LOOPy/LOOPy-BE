/*
  Warnings:

  - The values [system,challenge,coupon] on the enum `notifications_type` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `category` to the `cafe_menu` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valid_days` to the `coupon_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cafe_menu` ADD COLUMN `category` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `challenge_participants` ADD COLUMN `joined_cafe_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `coupon_templates` ADD COLUMN `valid_days` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('cafe', 'stamp', 'review') NOT NULL;

-- AlterTable
ALTER TABLE `stamp_books` ADD COLUMN `round` INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE `challenge_participants` ADD CONSTRAINT `challenge_participants_joined_cafe_id_fkey` FOREIGN KEY (`joined_cafe_id`) REFERENCES `cafes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
