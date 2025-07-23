import { logger } from "../utils/logger.js";
import {
  cafeRepository,
  stampBookRepository,
  cafeCouponRepository,
  cafeReviewRepository,
  cafeBookmarkRepository,
} from "../repositories/cafe.repository.js";
import { BookmarkAlreadyExistsError } from "../errors/customErrors.js";

export const cafeService = {
  async getCafeDetails(cafe, cafeId, userId) {
    const [photos, menu, stampBook, coupons, bookmark] = await Promise.all([
      cafeRepository.findPhotos(cafeId),
      cafeRepository.findMenu(cafeId),
      stampBookRepository.findStampBook(userId, cafeId),
      cafeCouponRepository.findCafeCoupons(cafeId),
      cafeBookmarkRepository.isBookmarked(cafeId, userId),
    ]);
    delete cafe.latitude;
    delete cafe.longitude;

    const cafeDetails = {
      cafe: {
        ...cafe,
      },
      photos: photos.map((photo) => ({
        id: photo.id,
        url: photo.photoUrl,
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
      coupons: coupons.map((coupon) => ({
        ...coupon,
        id: coupon.id,
      })),
      stampBook: stampBook
        ? {
            id: stampBook.id,
            currentCount: stampBook.currentCount,
            goalCount: stampBook.goalCount,
            expiresAt: stampBook.expiresAt,
            stampBookId: stampBook.id,
          }
        : null,
      bookmark: {
        isBookmarked: !!bookmark,
      },
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
      id: coupon.id,
      couponTemplateId: coupon.couponTemplate.id,
      couponTemplate: {
        ...coupon.couponTemplate,
        id: coupon.couponTemplate.id,
      },
    };
    logger.debug(`쿠폰 발급 성공: 쿠폰id: ${coupon.id}`);
    return couponDetail;
  },
};

export const cafeReviewService = {
  async getCafeReviews(cafeId, cursor, take = 5) {
    const numericCafeId = parseInt(cafeId, 10);
    const numericCursor = parseInt(cursor, 10);
    const reviews = await cafeReviewRepository.getCafeReviews(
      numericCafeId,
      numericCursor,
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

    const hasNextPage = reviews.length > take;
    const actualReviews = hasNextPage ? reviews.slice(0, take) : reviews;

    const reviewDetails = actualReviews.map((review) => ({
      id: review.id,
      title: review.title,
      content: review.content,
      nickname: review.user.nickname,
      userProfileImage: review.user.profileImageUrl,
      createdAt: review.createdAt,
      images: review.images || "",
    }));

    const nextCursor = hasNextPage
      ? actualReviews[actualReviews.length - 1].id
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

export const cafeBookmarkService = {
  async addBookmark(cafeId, userId) {
    //동기처리되면 내생각과 다르게 코드 실행되는거 주의!
    const isBookmared = await cafeBookmarkRepository.isBookmarked(
      cafeId,
      userId
    );
    if (isBookmared) {
      throw new BookmarkAlreadyExistsError();
    }
    logger.debug(`북마크 여부 검증 완료: 북마크 하지 않은 카페 ${cafeId}`);
    const bookmark = await cafeBookmarkRepository.addBookmark(cafeId, userId);

    logger.debug(`카페 ID: ${cafeId}의 북마크 ${bookmark.id}추가 완료`);
    return bookmark;
  },
};
