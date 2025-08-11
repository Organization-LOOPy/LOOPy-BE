// coupon.service.js
import prisma from '../../prisma/client.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;
const { CouponStatus } = Prisma;

import {
  CouponMissingDiscountValueError,
  CouponMissingMenuIdError,
  CouponNotFoundError,
} from '../errors/customErrors.js';

// 쿠폰 템플릿 생성 서비스
export const createCouponTemplateService = async (cafeId, data) => {
    const {
      discountType,
      discountValue,
      applicableMenuId,
      usageCondition,
      startDate,
      endDate,
    } = data;
  
    // 필수 조건 검사
    if (!applicableMenuId) {
      throw new CouponMissingMenuIdError();
    }

    // 할인 금액은 discount 타입일 때만 필수
    if (discountType === 'DISCOUNT' && !discountValue) {
      throw new CouponMissingDiscountValueError();
    }

    const menu = await prisma.cafeMenu.findUnique({
      where: { id: applicableMenuId },
    });
  
    if (!menu) {
      throw new CustomError('해당 메뉴를 찾을 수 없습니다.', 'MENU_NOT_FOUND', 404);
    }

    let name = '';
    if (discountType === 'DISCOUNT') {
      name = `${menu.name} ${discountValue}원 할인`;
    } else if (discountType === 'SIZE_UP') {
      name = `${menu.name} 사이즈업`;
    } else if (discountType === 'FREE_DRINK') {
      name = `${menu.name} 무료`;
    }

    const newCoupon = await prisma.couponTemplate.create({
      data: {
        cafeId: Number(cafeId),
        name,
        discountType,
        discountValue: discountType === 'DISCOUNT' ? discountValue : null,
        applicableMenuId,
        usageCondition,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }
    });
    return newCoupon;
  };

// 사장님 쿠폰 목록 조회 서비스
export const getOwnerCouponListService = async (cafeId, type) => {
  const where = {
    cafeId,
    ...(type && { discountType: type }),
  };

  const coupons = await prisma.couponTemplate.findMany({
    where,
    include: {
      applicableMenu: true,
      userCoupons: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const result = await Promise.all(
    coupons.map(async (coupon) => {
      const menuName = coupon.applicableMenu?.name || "";
      let baseName = "";

    if (coupon.discountType === 'DISCOUNT') {
      baseName = `${menuName} ${coupon.discountValue}원 할인`;
    } else if (coupon.discountType === 'SIZE_UP') {
      baseName = `${menuName} 사이즈업`;
    } else if (coupon.discountType === 'FREE_DRINK') {
      baseName = `${menuName} 무료`;
    }

    const nameWithCondition = coupon.usageCondition
      ? `${baseName}','${coupon.usageCondition}`
      : baseName;

    const usedCount = await prisma.userCoupon.count({
      where: {
        couponTemplateId: coupon.id,
        status: CouponStatus.USED,
      },
    });

    return {
      id: coupon.id,
      name: nameWithCondition,
      status: coupon.isActive ? '발행 중' : '종료됨',
      usedCount,
      startDate: coupon.startDate ? coupon.startDate.toISOString().split('T')[0] : null,
      endDate: coupon.endDate ? coupon.endDate.toISOString().split('T')[0] : null,
      discountType: coupon.discountType,
    };
  })
  );
  return result;
};

// 쿠폰 종료 서비스
export const terminateCouponService = async (cafeId, couponId) => {
  const coupon = await prisma.couponTemplate.findFirst({
    where: {
      id: couponId,
      cafeId,
      isActive: true,
    },
  });

  if (!coupon) {
    throw new CouponNotFoundError(couponId); 
  }

  const updatedCoupon = await prisma.couponTemplate.update({
    where: { id: couponId },
    data: { isActive: false },
  });

  return updatedCoupon;
};