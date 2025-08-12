/*
  Warnings:

  - A unique constraint covering the columns `[user_id,cafe_id,round]` on the table `stamp_books` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `user_bookmarks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `stamp_books` DROP FOREIGN KEY `stamp_books_user_id_fkey`;

-- DropIndex
DROP INDEX `stamp_books_user_id_cafe_id_key` ON `stamp_books`;

-- AlterTable
ALTER TABLE `stamp_books` ADD COLUMN `selected_reward_meta` JSON NULL,
    ADD COLUMN `selected_reward_type` ENUM('DISCOUNT', 'SIZE_UP', 'FREE_DRINK') NULL;

-- AlterTable
ALTER TABLE `user_bookmarks` ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `stamp_books_user_id_cafe_id_round_key` ON `stamp_books`(`user_id`, `cafe_id`, `round`);

-- AddForeignKey
