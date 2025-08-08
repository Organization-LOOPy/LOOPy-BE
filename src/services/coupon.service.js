// coupon.service.js
import prisma from '../../prisma/client.js';
import {
  CouponMissingDiscountValueError,
  CouponMissingMenuIdError,
} from '../errors/customErrors.js';

export const createCouponTemplateService = async (cafeId, data) => {
    const {
      name,
      discountType,
      discountValue,
      applicableMenuId,
      validDays,
      expiredAt
    } = data;
  
    // 필수 조건 검사
    if (discountType === 'DISCOUNT' && !discountValue) {
      throw new CouponMissingDiscountValueError();
    }
    if ((discountType === 'FREE_DRINK' || discountType === 'SIZE_UP') && !applicableMenuId) {
      throw new CouponMissingMenuIdError();
    }
  
    const newCoupon = await prisma.couponTemplate.create({
      data: {
        cafeId: Number(cafeId),
        name,
        discountType,
        discountValue: discountType === 'DISCOUNT' ? discountValue : null,
        applicableMenuId: discountType !== 'DISCOUNT' ? applicableMenuId : null,
        validDays,
        expiredAt,
      }
    });
    return newCoupon;
  };
  