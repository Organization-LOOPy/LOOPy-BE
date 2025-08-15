-- AlterTable: stamp_images에 created_by 컬럼 추가 (nullable)
ALTER TABLE `stamp_images`
ADD COLUMN `created_by` INTEGER NULL;

-- ForeignKey: created_by → users.id
ALTER TABLE `stamp_images`
ADD CONSTRAINT `stamp_images_created_by_fkey`
FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: user_cafe_notifications
CREATE TABLE `user_cafe_notifications` (
    `user_id` INTEGER NOT NULL,
    `cafe_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`user_id`, `cafe_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ForeignKeys for user_cafe_notifications
ALTER TABLE `user_cafe_notifications`
ADD CONSTRAINT `user_cafe_notifications_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_cafe_notifications`
ADD CONSTRAINT `user_cafe_notifications_cafe_id_fkey`
FOREIGN KEY (`cafe_id`) REFERENCES `cafes`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
