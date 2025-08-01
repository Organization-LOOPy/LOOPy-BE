/*
  Warnings:

  - You are about to drop the column `discount_type` on the `coupon_templates` table. All the data in the column will be lost.
  - Added the required column `type` to the `coupon_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `coupon_templates` DROP COLUMN `discount_type`,
    ADD COLUMN `type` ENUM('DISCOUNT', 'FREE_ITEM', 'SIZE_UP') NOT NULL,
    MODIFY `discount_value` INTEGER NULL;
