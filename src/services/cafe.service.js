import { logger } from "../utils/logger.js";
import {
  cafeRepository,
  cafeNotificationRepository,
  cafeCouponRepository,
  cafeReviewRepository,
  cafeBookmarkRepository,
} from "../repositories/cafe.repository.js";
import { BookmarkAlreadyExistsError } from "../errors/customErrors.js";

export const cafeService = {
  async getCafeDetails(cafeObject, cafeId, userId) {
    const cafe = await cafeRepository.findCafeDetails(cafeId, userId);

    const cafeobject = cafeObject;

    let stampBook = null;
    let stampPolicyMessage = null;

    if ((cafe.stampBooks ?? []).length > 0) {
      const stampBookData = cafe.stampBooks[0];
      stampBook = {
        id: stampBookData.id,
        currentCount: stampBookData.currentCount,
        goalCount: stampBookData.goalCount,
        expiresAt: stampBookData.expiresAt,
        stampBookId: stampBookData.id,
        stampImages: (cafe.stampImages ?? []).map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
        })),
      };
    } else {
      const policy = cafe.stampPolicies;

      if (policy) {
        const rewardType = policy.rewardType;
        const menuName = policy.menu?.name ?? "";

        if (rewardType === "FREE_DRINK") {
          stampPolicyMessage = `${menuName} 무료 쿠폰을 받을 수 있어요`;
        } else if (rewardType === "DISCOUNT") {
          stampPolicyMessage = `${menuName} ${
            policy.discountAmount ?? 0
          }원 할인 쿠폰을 받을 수 있어요`;
        } else if (rewardType === "SIZE_UP") {
          stampPolicyMessage = `${menuName} 사이즈업 쿠폰을 받을 수 있어요`;
        }
      } else {
        //null가드 추가...
        stampPolicyMessage = null;
      }
    }

    const cafeDetails = {
      cafe: {
        id: cafeobject.id,
        name: cafeobject.name,
        address: cafeobject.address,
        businessHours: cafeobject.businessHours,
        businessHourType: cafeobject.businessHourType,
        breakTime: cafeobject.breakTime,
        phone: cafeobject.phone,
        websiteUrl: cafeobject.websiteUrl,
        description: cafeobject.description,
        storeFilters: cafeobject.storeFilters,
        takeOutFilters: cafeobject.takeOutFilters,
        menuFilters: cafeobject.menuFilters,
        keywords: cafeobject.keywords,
      },
      photos: (cafe.photos ?? []).map((p) => ({
        id: p.id,
        url: p.photoUrl,
        displayOrder: p.displayOrder,
      })),
      menu: (cafe.menu ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        imgUrl: item.photoUrl,
        isSoldOut: item.isSoldOut,
        isRepresentative: item.isRepresentative,
      })),
      coupons: (cafe.CouponTemplate ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        discountType: c.discountType,
        discountValue: c.discountValue,
        applicableMenu: c.applicableMenu,
        usageCondition: c.usageCondition,

        expiredAt: c.endDate,

        startDate: c.startDate,
        endDate: c.endDate,
        validDays: c.validDays,
        userCoupons: c.userCoupons,
        isIssued: c.userCoupons.length > 0,
      })),
      challenge: (cafe.challengeAvailable ?? []).map((a) => ({
        id: a.challengeId,
        challengeId: a.challengeId,
        title: a.challenge.title,
        thumbnailUrl: a.challenge.thumbnailUrl,
        startDate: a.challenge.startDate,
        endDate: a.challenge.endDate,
      })),
      stampBook,
      stampPolicyMessage,
      bookmark: {
        isBookmarked: (cafe.bookmarkedBy?.length ?? 0) > 0,
      },
      alram: {
        isAlramSet: (cafe.userNotifications?.length ?? 0) > 0,
      },
    };

    return cafeDetails;
  },
};

export const cafeNotificationService = {
  async addNotification(cafeId, userId) {
    const isExistNotification =
      await cafeNotificationRepository.findNotification(cafeId, userId);
    if (isExistNotification) {
      await cafeNotificationRepository.removeNotification(cafeId, userId);
      return null;
    }
    const notification = await cafeNotificationRepository.addNotification(
      cafeId,
      userId
    );
    return notification;
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
      title: review.cafe?.name || null,
      content: review.content,
      nickname: review.user.nickname,
      userProfileImage: review.user.profileImageUrl,
      createdAt: review.createdAt,
      images: review.images || [],
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
      logger.debug("이미 북마크한 카페입니다");
      const bookmark = await cafeBookmarkRepository.deleteBookmark(
        cafeId,
        userId
      );
      logger.debug(`카페 ID: ${cafeId}의 북마크 ${bookmark.id}삭제 완료`);
      return {
        bookmark,
        message: `카페 id: ${cafeId} 의 북마크를 제거했습니다`,
      };
    } else {
      logger.debug(`북마크 여부 검증 완료: 북마크 하지 않은 카페 ${cafeId}`);
      const bookmark = await cafeBookmarkRepository.addBookmark(cafeId, userId);

      logger.debug(`카페 ID: ${cafeId}의 북마크 ${bookmark.id}추가 완료`);
      return {
        bookmark,
        message: `카페 id: ${cafeId} 의 북마크를 추가했습니다`,
      };
    }
  },
};
