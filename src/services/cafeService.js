import { logger } from "../utils/logger.js";
import {
  cafeRepository,
  stampBookRepository,
  cafeCouponRepository,
  cafeReviewRepository,
} from "../repositories/cafeReposiroty.js";
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
    delete cafe.latitude;
    delete cafe.longitude;

    const cafeDetails = {
      ...cafe,

      id: cafe.id.toString(),
      photos: photos.map((photo) => ({
        id: photo.id.toString(),
        url: photo.photoUrl,
        displayOrder: photo.displayOrder,
      })),
      menu: menu.map((item) => ({
        id: item.id.toString(),
        name: item.name,
        price: item.price,
        description: item.description,
        imgUrl: item.photoUrl,
        isSoldOut: item.isSoldOut,
      })),
    };
    return cafeDetails;
  },
};

export const stampBookService = {
  async getStampBook(userId, cafeId) {
    const stampBook = await stampBookRepository.findStampBook(userId, cafeId);
    const stampBookDetails = {
      ...stampBook,
      id: stampBook.id.toString(),
    };
    logger.debug(`스탬프북 조회 성공:`, stampBook);
    return stampBookDetails;
  },
};

export const cafeCouponService = {
  async getCoupons(cafeId) {
    const coupons = await cafeCouponRepository.findCafeCoupons(cafeId);

    const couponDetails = coupons.map((coupon) => ({
      ...coupon,
      id: coupon.id.toString(),
    }));

    logger.debug(`카페 ID: ${cafeId}의 쿠폰 조회 성공: ${coupons.length}개`);
    return couponDetails;
  },
  async issueCouponToUser(couponInfo, userId) {
    const coupon = await cafeCouponRepository.issueCoupon(couponInfo, userId);

    const couponDetail = {
      ...coupon,
      id: coupon.id.toString(),
      couponTemplateId: coupon.couponTemplate.id.toString(),

      // 추가로 필요한 것들:
      couponTemplate: {
        ...coupon.couponTemplate,
        id: coupon.couponTemplate.id.toString(),
      },
    };
    logger.debug(`쿠폰 발급 성공: 쿠폰id: ${coupon.id}`);
    return couponDetail;
  },
};

export const cafeReviewService = {
  async getCafeReviews(cafeId, cursor, take = 5) {
    const reviews = await cafeReviewRepository.getCafeReviews(
      cafeId,
      cursor,
      take
    );

    if (!reviews || reviews.length === 0) {
      logger.debug(`카페 ID: ${cafeId}에 대한 리뷰가 없습니다.`);
      return {
        reviews: [],
        nextCursor: null,
        hasNextPage: false,
      };
    }

    // Repository에서 take + 1개를 가져왔으므로 데이터 재가공
    const hasNextPage = reviews.length > take; //다음 페이지가 있을 경우에만 상수 생성
    const actualReviews = hasNextPage ? reviews.slice(0, take) : reviews;

    const reviewDetails = actualReviews.map((review) => ({
      id: review.id.toString(),
      title: review.title,
      content: review.content,
      nickname: review.user.nickname,
      userProfileImage: review.user.profileImageUrl,
      createdAt: review.createdAt,
      images: review.images || "", // string 그대로 전달
    }));

    const nextCursor = hasNextPage
      ? actualReviews[actualReviews.length - 1].id.toString()
      : null;

    logger.debug(
      `카페 ID: ${cafeId}의 리뷰 조회 성공: ${reviewDetails.length}개`
    );

    return {
      reviews: reviewDetails,
      nextCursor,
      hasNextPage,
    };
  },
};
