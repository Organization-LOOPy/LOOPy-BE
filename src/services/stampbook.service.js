import prisma from '../../prisma/client.js';
import { StampNotEligibleError } from "../errors/customErrors.js";
  
export const stampBookService = {
  async handleStampCompletion(userId, cafeId) {
    const stampBook = await prisma.stampBook.findUnique({
        where: {
          userId_cafeId: { userId, cafeId },
        },
      });
  
      if (!stampBook || stampBook.isCompleted || stampBook.currentCount < stampBook.goalCount) {
        throw new StampNotEligibleError(userId, cafeId);
      }
  
    const now = new Date();
    const expiredAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14일
  
    const couponTemplate = await prisma.couponTemplate.create({
      data: {
        cafeId,
        name: stampBook.rewardDetail || "스탬프 리워드 쿠폰",
        validDays,
        discountType: "AMOUNT", 
        discountValue: 0,           
        isActive: true,
        expiredAt,
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
  
      return userCoupon;
    },
  };
  