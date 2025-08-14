-- AlterTable
ALTER TABLE `cafe_menu` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `cafes` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_bookmarks` MODIFY `updated_at` DATETIME(3) NULL;

-- CreateTable
-- AddForeignKey
ALTER TABLE `challenge_participants` ADD CONSTRAINT `challenge_participants_joined_cafe_id_fkey` FOREIGN KEY (`joined_cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_transactions` ADD CONSTRAINT `point_transactions_stamp_book_id_fkey` FOREIGN KEY (`stamp_book_id`) REFERENCES `stamp_books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_cafe_notifications` ADD CONSTRAINT `user_cafe_notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_cafe_notifications` ADD CONSTRAINT `user_cafe_notifications_cafe_id_fkey` FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
