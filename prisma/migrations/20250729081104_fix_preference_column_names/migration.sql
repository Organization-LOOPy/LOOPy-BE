/*
  Warnings:

  - You are about to drop the column `preferred_area` on the `user_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferred_keywords` on the `user_preferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_preferences` DROP COLUMN `preferred_area`,
    DROP COLUMN `preferred_keywords`,
    ADD COLUMN `preferred_menu` JSON NULL,
    ADD COLUMN `preferred_store` JSON NULL,
    ADD COLUMN `preferred_tkeout` JSON NULL;
