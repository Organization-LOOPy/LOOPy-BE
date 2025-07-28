/*
  Warnings:

  - You are about to drop the column `region` on the `cafes` table. All the data in the column will be lost.
  - You are about to alter the column `business_hours` on the `cafes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.
  - You are about to drop the column `profile_url` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cafe_id,name]` on the table `cafe_menu` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[owner_id]` on the table `cafes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `owner_id` to the `cafes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region_1depth_name` to the `cafes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region_2depth_name` to the `cafes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region_3depth_name` to the `cafes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `goalCount` to the `challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `goalDescription` to the `challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rewardPoint` to the `challenges` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cafes` DROP COLUMN `region`,
    ADD COLUMN `owner_id` INTEGER NOT NULL,
    ADD COLUMN `region_1depth_name` VARCHAR(50) NOT NULL,
    ADD COLUMN `region_2depth_name` VARCHAR(50) NOT NULL,
    ADD COLUMN `region_3depth_name` VARCHAR(50) NOT NULL,
    MODIFY `business_hours` JSON NULL;

-- AlterTable
ALTER TABLE `challenges` ADD COLUMN `goalCount` INTEGER NOT NULL,
    ADD COLUMN `goalDescription` VARCHAR(255) NOT NULL,
    ADD COLUMN `rewardPoint` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `profile_url`,
    DROP COLUMN `role`,
    ADD COLUMN `qr_code` TEXT NULL;

-- CreateTable
CREATE TABLE `user_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `role` ENUM('CUSTOMER', 'OWNER') NOT NULL,

    UNIQUE INDEX `user_role_userId_role_key`(`userId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `cafe_menu_cafe_id_name_key` ON `cafe_menu`(`cafe_id`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `cafes_owner_id_key` ON `cafes`(`owner_id`);

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cafes` ADD CONSTRAINT `cafes_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
