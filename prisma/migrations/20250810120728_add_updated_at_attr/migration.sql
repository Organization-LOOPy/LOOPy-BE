/*
  Warnings:

  - You are about to alter the column `break_time` on the `cafes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(20)`.
  - You are about to alter the column `business_hour_type` on the `cafes` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(12))` to `Enum(EnumId(8))`.
  - The values [FREE_DRINK] on the enum `coupon_templates_type` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `title` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the `user_cafe_notification` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `updated_at` on table `cafe_menu` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `cafes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reward_detail` on table `stamp_books` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `stamp_books` required. This step will fail if there are existing NULL values in that column.
*/

/* ===== 1. NULL 데이터 백필 ===== */
UPDATE `cafes`
SET `updated_at` = COALESCE(`updated_at`, `created_at`, NOW())
WHERE `updated_at` IS NULL;

UPDATE `cafe_menu`
SET `updated_at` = NOW()
WHERE `updated_at` IS NULL;

UPDATE `stamp_books`
SET `updated_at` = NOW()
WHERE `updated_at` IS NULL;

UPDATE `stamp_books`
SET `reward_detail` = ''
WHERE `reward_detail` IS NULL;

/* ===== 2. business_hour_type 값 정규화 ===== */
ALTER TABLE `cafes` MODIFY `business_hour_type` VARCHAR(50) NULL;
UPDATE `cafes`
SET `business_hour_type` = CASE
  WHEN `business_hour_type` IN ('WEEKDAY_ONLY','WEEKEND_ONLY','ALL_DAYS') THEN `business_hour_type`
  WHEN `business_hour_type` IN ('WEEKDAY','WEEKDAYS') THEN 'WEEKDAY_ONLY'
  WHEN `business_hour_type` IN ('WEEKEND','WEEKENDS') THEN 'WEEKEND_ONLY'
  WHEN `business_hour_type` IN ('ALLDAY','EVERYDAY','ALL') THEN 'ALL_DAYS'
  ELSE 'ALL_DAYS'
END;

/* ===== 3. 기존 외래키 제거 ===== */
ALTER TABLE `user_cafe_notification` DROP FOREIGN KEY `user_cafe_notification_cafe_id_fkey`;
ALTER TABLE `user_cafe_notification` DROP FOREIGN KEY `user_cafe_notification_user_id_fkey`;
ALTER TABLE `user_role` DROP FOREIGN KEY `user_role_userId_fkey`;

/* ===== 4. 스키마 변경 ===== */
ALTER TABLE `cafe_menu` MODIFY `updated_at` DATETIME(3) NOT NULL;

ALTER TABLE `cafes`
  MODIFY `updated_at` DATETIME(3) NOT NULL,
  MODIFY `break_time` VARCHAR(20) NULL,
  MODIFY `business_hour_type` ENUM('WEEKDAY_ONLY', 'WEEKEND_ONLY', 'ALL_DAYS') NULL DEFAULT 'ALL_DAYS';

ALTER TABLE `coupon_templates`
  ADD COLUMN `end_date` DATETIME(3) NULL,
  ADD COLUMN `start_date` DATETIME(3) NULL,
  ADD COLUMN `usage_condition` VARCHAR(191) NULL,
  MODIFY `expired_at` DATETIME(3) NULL,
  MODIFY `type` ENUM('DISCOUNT', 'FREE_ITEM', 'SIZE_UP') NOT NULL,
  MODIFY `valid_days` INTEGER NULL;

ALTER TABLE `reviews` DROP COLUMN `title`;

ALTER TABLE `stamp_books`
  ALTER COLUMN `goal_count` DROP DEFAULT,
  MODIFY `reward_detail` VARCHAR(255) NOT NULL,
  MODIFY `updated_at` DATETIME(3) NOT NULL;

ALTER TABLE `user_coupons` MODIFY `expired_at` DATETIME(3) NULL;

/* ===== 5. 테이블 삭제 및 외래키 재등록 ===== */
DROP TABLE `user_cafe_notification`;

ALTER TABLE `user_role`
  ADD CONSTRAINT `user_role_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cafes` MODIFY `business_hour_type` VARCHAR(50) NULL;

UPDATE `cafes`
SET `business_hour_type` = CASE
  WHEN business_hour_type = 'ALL_DAYS' THEN 'SAME_ALL_DAYS'
  WHEN business_hour_type IN ('WEEKDAY_ONLY','WEEKEND_ONLY') THEN 'WEEKDAY_WEEKEND'
  ELSE 'SAME_ALL_DAYS' -- 기존 데이터에 없는 값은 기본으로 지정
END;

ALTER TABLE `cafes`
MODIFY `business_hour_type`
  ENUM('SAME_ALL_DAYS', 'WEEKDAY_WEEKEND', 'EACH_DAY_DIFFERENT')
  NULL DEFAULT 'SAME_ALL_DAYS';