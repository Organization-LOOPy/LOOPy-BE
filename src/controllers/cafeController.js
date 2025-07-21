import { logger } from "../utils/logger.js";
import { NotAuthenticatedError } from "../errors/customErrors.js";
import {
  cafeService,
  cafeReviewService,
  stampBookService,
  cafeCouponService,
} from "../services/cafeService.js";

export const getCafe = async (req, res, next) => {
  try {
    const cafe = req.cafe;

    const cafeDetails = await cafeService.getCafeDetails(cafe, cafe.id);

    logger.debug(`카페 정보 조회 성공: ${cafeDetails.name}`);
    res.success(cafeDetails);
  } catch (err) {
    logger.error(`카페 정보 조회 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const getCafeStamp = async (req, res, next) => {
  try {
    const cafeId = req.cafe.id;
    const userId = req.user.id;

    if (!userId) {
      throw new NotAuthenticatedError();
    }

    const stampBook = await stampBookService.getStampBook(userId, cafeId);

    console.log(stampBook);

    logger.debug(`스탬프북 조회 성공: ${stampBook.id}`);
    res.success(stampBook);

    // 스탬프북 있으면 객체, 없으면 빈 배열 반환
  } catch (err) {
    logger.error(`스탬프북 조회 중 오류 발생: ${error.message}`);
    next(err);
  }
};

export const getCafeCoupon = async (req, res) => {
  try {
    const cafeId = req.cafe.id;

    const coupons = await cafeCouponService.getCoupons(cafeId, req.user.id);
    res.success(coupons);
    // 쿠폰이 없으면 빈 배열 반환
  } catch (err) {
    logger.error(`쿠폰 조회 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const issueCafeCouponToUser = async (req, res) => {
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
