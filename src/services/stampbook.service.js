import prisma from "../../prisma/client.js";
import { StampNotEligibleError } from "../errors/customErrors.js";

// 스탬프북 쿠폰 발급 서비스
export const stampBookService = {
  async handleStampCompletion(userId, cafeId) {
    const stampBook = await prisma.stampBook.findFirst({
      where: {
        userId,
        cafeId,
        isCompleted: false, // 아직 완료되지 않은 스탬프북
      },
    });

    if (
      !stampBook ||
      stampBook.isCompleted ||
      typeof stampBook.currentCount !== "number" || // null 방지
      stampBook.currentCount < 10
    ) {
      throw new StampNotEligibleError(
        userId,
        cafeId,
        10,
        stampBook?.currentCount ?? null
      );
    }
    const stampPolicy = await prisma.stampPolicy.findUnique({
      where: { cafeId },
    });    
    const now = new Date();
    const expiredAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 예: 기본 14일 후
    const rewardToDiscountTypeMap = {
      DISCOUNT: "DISCOUNT",
      FREE_DRINK: "FREE_DRINK",
      SIZE_UP: "SIZE_UP",
    };

    const couponTemplate = await prisma.couponTemplate.create({
      data: {
        cafeId,
        name: stampPolicy.rewardDescription || "스탬프 리워드 쿠폰",
        discountType: rewardToDiscountTypeMap[stampPolicy.rewardType],
        discountValue: stampPolicy.discountAmount ?? 0,
        applicableMenuId: stampPolicy.menuId ?? null,
        isActive: true,
        validDays: stampPolicy.hasExpiry ? null : 14, // ❗선택적 처리
        expiredAt: stampPolicy.hasExpiry
          ? stampPolicy.rewardExpiresAt
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 기본 14일
      },
    });

    const userCoupon = await prisma.userCoupon.create({
      data: {
        userId,
        couponTemplateId: couponTemplate.id,
        acquisitionType: "stamp",
        status: "active",
        issuedAt: now,
        expiredAt,
      },
      include: {
        couponTemplate: true,
      },
    });

    await prisma.stampBook.update({
      where: { id: stampBook.id },
      data: {
        isCompleted: true,
        completedAt: now,
        status: "completed",
      },
    });

    // ✅ 새로운 스탬프북 자동 생성
    const newStampBook = await prisma.stampBook.create({
      data: {
        userId,
        cafeId,
        currentCount: 0,
        goalCount: 10,
        status: "active",
        startedAt: now,
        rewardDetail: stampPolicy.rewardDescription || "스탬프 리워드 쿠폰",
        expiredAt: stampPolicy.hasExpiry
          ? stampPolicy.rewardExpiresAt
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    
    return userCoupon;
  },
};

