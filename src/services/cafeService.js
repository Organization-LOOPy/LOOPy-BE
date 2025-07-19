import { logger } from "../utils/logger.js";
import {
  cafeRepository,
  stampBookRepository,
  cafeCouponRepository,
  cafeReviewRepository,
} from "../repositories/cafeRepository.js";
import {
  InvalidParameterError,
  DuplicateCouponError,
} from "../errors/customErrors.js";

export const cafeService = {
  async getCafeDetails(cafe, cafeId) {
    const [photos, menu] = await Promise.all([
      cafeRepository.findPhotos(cafeId),
      cafeRepository.findMenu(cafeId),
    ]);

    const cafeDetails = {
      ...cafe,
      photos: photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        displayOrder: photo.displayOrder,
      })),
      menu: menu.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        imgUrl: item.photoUrl,
        isSoldOut: item.isSoldOut,
      })),
    };
    logger.debug(`카페 정보 조회 성공: ${cafeDetails.name}`);
    return cafeDetails;
  },
};

export const stampBookService = {
  async getStampBook(userId, cafeId) {
    const stampBook = await stampBookRepository.findStampBook(userId, cafeId);

    logger.debug(`스탬프북 조회 성공: ${stampBook}`);
    return stampBook;
  },
};

export const cafeCouponService = {
  async getCoupons(cafeId) {
    const coupons = await cafeCouponRepository.findCafeCoupons(cafeId);

    logger.debug(`카페 ID: ${cafeId}의 쿠폰 조회 성공: ${coupons.length}개`);
    return coupons;
  },
  async issueCouponToUser(couponInfo, userId) {
    if (!couponInfo || !userId) {
      throw new InvalidParameterError(
        "쿠폰 정보 또는 사용자 ID가 누락되었습니다."
      );
    }
    const existingCoupon = await cafeCouponRepository.findUserCoupon(
      couponInfo.couponTemplateId,
      userId
    );

    if (existingCoupon) {
      throw new DuplicateCouponError("이미 발급받은 쿠폰입니다.");
    }

    const coupon = await cafeCouponRepository.issueCoupon(couponInfo, userId);

    logger.debug(`카페 ID: ${cafeId}의 쿠폰 발급 성공: ${coupon.id}`);
    return coupon;
  },
};

export const cafeReviewService = {
  async getCafeReview(cafeId) {
    const reviews = await cafeReviewRepository.getCafeReview(cafeId);

    if (!reviews || reviews.length === 0) {
      logger.debug(`카페 ID: ${cafeId}에 대한 리뷰가 없습니다.`);
      return [];
    }

    const reviewDetails = reviews.map((review) => ({
      id: review.id,
      title: review.title,
      content: review.content,
      nickname: review.user.nickname,
      userProfileImage: review.user.profileImageUrl,
      createdAt: review.createdAt,
      images: review.images ? JSON.parse(review.images) : [],
    }));

    logger.debug(
      `카페 ID: ${cafeId}의 리뷰 조회 성공: ${reviewDetails.length}개`
    );
    return reviewDetails;
  },
};
