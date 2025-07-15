import logger from "../utils/logger.js";
import { MissingUserObjectError } from "../errors/customErrors.js";
import { cafeService, stampBookService } from "../services/cafeService.js";

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
      throw new MissingUserObjectError();
    }

    const stampBook = await stampBookService.getStampBook(userId, cafeId);

    logger.debug(`스탬프북 조회 성공: ${stampBook.id}`);
    res.success(stampBook);
    // 스탬프북 있으면 객체, 없으면 null 반환
  } catch (error) {
    logger.error(`스탬프북 조회 중 오류 발생: ${error.message}`);
    next(error);
  }
};

export const getCafeCoupon = async (req, res) => {};

export const addCafeCoupon = async (req, res) => {};

export const getCafeReview = async (req, res) => {};

export const addCafeBookmark = async (req, res) => {};
