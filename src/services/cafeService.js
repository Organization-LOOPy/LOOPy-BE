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
  async getCafeDetails(cafe, cafeId, userId) {
    const [photos, menu, stampBook, coupons] = await Promise.all([
      cafeRepository.findPhotos(cafeId),
      cafeRepository.findMenu(cafeId),
      stampBookRepository.findStampBook(userId, cafeId),
      cafeCouponRepository.findCafeCoupons(cafeId),
      //cafeRepository.isBookmarked(cafeId, userId), 여기도 수정 필요
    ]);
    delete cafe.latitude;
    delete cafe.longitude;

    const plainCafe = JSON.parse(
      JSON.stringify(cafe, (key, value) =>
        typeof value === "bigint" ? String(value) : value
      )
    );

    const photoData = photos.map((photo) => ({
      id: String(photo.id),
      url: photo.photoUrl,
      displayOrder: photo.displayOrder,
    }));

    const menuData = menu.map((item) => ({
      id: String(item.id),
      name: item.name,
      price: item.price,
      description: item.description,
      imgUrl: item.photoUrl,
      isSoldOut: item.isSoldOut,
    }));

    const couponData = coupons.map((coupon) => ({
      ...coupon,
      id: String(coupon.id),
    }));

    const stampBookData = stampBook
      ? {
          currentCount: stampBook.currentCount,
          goalCount: stampBook.goalCount,
          expiresAt: stampBook.expiresAt,
          stampBookId: String(stampBook.id),
        }
      : {};

    const cafeDetails = {
      cafe: plainCafe, // 여기서 왜 말썽인지 모르겠습니다;
      photos: photoData,
      menu: menuData,
      coupon: couponData,
      ...stampBookData,
    };

    console.log(cafeDetails);
    return cafeDetails;
  },
};

export const cafeCouponService = {
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
