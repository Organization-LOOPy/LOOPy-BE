import { logger } from "../utils/logger.js";
import { NotAuthenticatedError } from "../errors/customErrors.js";
import {
  cafeService,
  cafeNotificationService,
  cafeReviewService,
  cafeCouponService,
  cafeBookmarkService,
} from "../services/cafe.service.js";

//북마크 여부도 체크해야함
export const getCafe = async (req, res, next) => {
  try {
    const cafe = req.cafe;
    const userId = req.user.id;

    const cafeDetails = await cafeService.getCafeDetails(cafe, cafe.id, userId);

    logger.debug(`카페 정보 조회 성공: ${cafeDetails.id}`);
    res.success(cafeDetails);
  } catch (err) {
    logger.error(`카페 정보 조회 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const getNotification = async (req, res, next) => {
  try {
    const cafe = req.cafe;
    const userId = req.user.id;

    const notification = await cafeNotificationService.addNotification(
      cafe.id,
      userId
    );
    if (notification == null) {
      logger.debug(`카페 알람 설정을 해제하였습니다.`);
      res.success({ message: "카페 알람 설정을 해제하였습니다." });
    }

    logger.debug(`카페 알람 설정 성공: ${notification.id}`);
    res.success({
      data: notification,
      message: "카페 알람 설정을 성공하였습니다.",
    });
  } catch (err) {
    logger.error(`카페 알람 설정 중 오류 발생: ${err.message}`);
    next(err);
  }
};
export const issueCafeCouponToUser = async (req, res, next) => {
  try {
    const couponInfo = req.couponInfo;
    const userId = req.user.id;

    if (!userId) {
      throw new NotAuthenticatedError();
    }

    const coupon = await cafeCouponService.issueCouponToUser(
      couponInfo,
      userId
    );
    res.success(coupon);
  } catch (err) {
    logger.error(`쿠폰 추가 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const getCafeReviews = async (req, res, next) => {
  try {
    const { cafeId } = req.params;
    const { cursor } = req.query;
    const take = 5; // 리뷰 5개씩 기본 조회 (필요시 수정)

    /* 클라이언트에서 페이지 크기 조절이 필요한 경우
    const { cursor, take = 5 } = req.query;
    const limit = Math.min(parseInt(take) || 5, 20); */

    const result = await cafeReviewService.getCafeReviews(cafeId, cursor, take);
    res.success(result);
  } catch (err) {
    logger.error(`카페 리뷰 조회 중 오류 발생: ${err.message}`, {
      cafeId: req.cafe?.id,
    });
    next(err);
  }
};

export const addBookmark = async (req, res, next) => {
  try {
    const cafeId = req.cafe.id;
    const userId = req.user.id;

    const isBookmarkAdded = await cafeBookmarkService.addBookmark(
      cafeId,
      userId
    );

    res.success(isBookmarkAdded);
  } catch (err) {
    logger.error(`카페 북마크 추가 중 오류 발생: ${err.message}`, {
      cafeId: req.cafe?.id,
    });
    next(err);
  }
};
