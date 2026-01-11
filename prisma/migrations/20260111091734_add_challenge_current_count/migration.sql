-- AlterTable
ALTER TABLE `challenge_participants` ADD COLUMN `current_count` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user_cafe_notifications` MODIFY `updated_at` DATETIME(3) NULL;
