-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'OWNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CafeStatus" AS ENUM ('active', 'inactive', 'deleted');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT,
    "kakao_id" BIGINT,
    "password_hash" TEXT,
    "phone_number" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "allow_kakao_alert" BOOLEAN NOT NULL,
    "status" "UserStatus" NOT NULL,
    "fcm_token" TEXT,
    "profile_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KakaoAccount" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "social_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KakaoAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "preferred_area" TEXT NOT NULL,
    "preferred_keywords" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "phone_number" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAgreement" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "terms_agreed" BOOLEAN NOT NULL,
    "privacy_policy_agreed" BOOLEAN NOT NULL,
    "marketing_agreed" BOOLEAN NOT NULL,
    "location_permission" BOOLEAN NOT NULL,
    "agreed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAvailableCafe" (
    "id" SERIAL NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "cafe_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeAvailableCafe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeType" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "badge_type_id" INTEGER NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StampBook" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "cafe_id" BIGINT NOT NULL,
    "current_count" INTEGER NOT NULL,
    "goal_count" INTEGER NOT NULL,
    "reward_detail" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "last_visited_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "extended_at" TIMESTAMP(3) NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "converted_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL,
    "is_converted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StampBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stamp" (
    "id" SERIAL NOT NULL,
    "stamp_book_id" INTEGER NOT NULL,
    "stamp_image_url" TEXT NOT NULL,
    "stamped_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Stamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "stamp_book_id" INTEGER NOT NULL,
    "point" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cafe" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "owner_name" TEXT NOT NULL,
    "business_hours" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "store_filters" JSONB NOT NULL,
    "take_out_filters" JSONB NOT NULL,
    "menu_filters" JSONB NOT NULL,
    "keywords" JSONB NOT NULL,
    "status" "CafeStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cafe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafeMenu" (
    "id" BIGSERIAL NOT NULL,
    "cafe_id" BIGINT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "is_sold_out" BOOLEAN NOT NULL,
    "photo_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CafeMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CafePhoto" (
    "id" BIGSERIAL NOT NULL,
    "cafe_id" BIGINT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CafePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "cafe_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "cafe_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "cafe_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_number_key" ON "User"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "KakaoAccount_user_id_key" ON "KakaoAccount"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserAgreement_user_id_key" ON "UserAgreement"("user_id");

-- AddForeignKey
ALTER TABLE "KakaoAccount" ADD CONSTRAINT "KakaoAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAgreement" ADD CONSTRAINT "UserAgreement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAvailableCafe" ADD CONSTRAINT "ChallengeAvailableCafe_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAvailableCafe" ADD CONSTRAINT "ChallengeAvailableCafe_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_badge_type_id_fkey" FOREIGN KEY ("badge_type_id") REFERENCES "BadgeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampBook" ADD CONSTRAINT "StampBook_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StampBook" ADD CONSTRAINT "StampBook_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_stamp_book_id_fkey" FOREIGN KEY ("stamp_book_id") REFERENCES "StampBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_stamp_book_id_fkey" FOREIGN KEY ("stamp_book_id") REFERENCES "StampBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeMenu" ADD CONSTRAINT "CafeMenu_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafePhoto" ADD CONSTRAINT "CafePhoto_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "Cafe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
