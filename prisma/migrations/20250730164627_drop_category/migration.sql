/*
  Warnings:

  - You are about to drop the column `category` on the `cafe_menu` table. All the data in the column will be lost.
  - You are about to drop the column `valid_days` on the `coupon_templates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `cafe_menu` DROP COLUMN `category`;

-- AlterTable
ALTER TABLE `coupon_templates` DROP COLUMN `valid_days`;
