-- AlterTable
ALTER TABLE `cafe_menu` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `cafes` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_bookmarks` MODIFY `updated_at` DATETIME(3) NULL;

-- CreateTable
-- AddForeignKey
-- AddForeignKey
ALTER TABLE `user_cafe_notifications` ADD CONSTRAINT `user_cafe_notifications_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
