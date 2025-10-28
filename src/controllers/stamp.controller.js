import {
  stampService,
  getStampBookDetailService,
  convertStampToPointService,
  extendStampBookService,
  getExpiringStampBooksService,
  getConvertedStampbooksService,
  getTotalStampCountService,
  getLoopyLevelInfoService,
  getMyStampByCafeService,
  handleStampCompletionService,
} from "../services/stamp.service.js";

// 전체 스탬프북 조회
export const getMyStampBooks = async (req, res, next) => {
  const userId = req.user.id;
  const { sortBy } = req.query;

  try {
    const data = await stampService.getMyStampBooks(userId, sortBy);
    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "스탬프북 목록 조회 성공",
      data,
    });
  } catch (err) {
    console.error(`스탬프북 목록 조회 실패: ${err.message}`);
    next(err);
  }
};

// 스탬프북 상세 조회
export const getStampBookDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = Number(req.params.stampBookId);
    const data = await getStampBookDetailService(userId, stampBookId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "스탬프북 상세 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 스탬프북 환전
 */
export const convertStampToPoint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = Number(req.params.stampBookId);
    const data = await convertStampToPointService(userId, stampBookId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: `${data.cafeName}의 ${data.stampCount}개의 스탬프가 ${data.pointAmount}포인트로 환전되었습니다.`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 스탬프북 기간 연장
 */
export const extendStampBook = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = Number(req.params.stampBookId);
    const data = await extendStampBookService(userId, stampBookId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "스탬프북이 14일 연장되었습니다.",
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 소멸 임박 스탬프북 조회
 */
export const getExpiringStampBooks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await getExpiringStampBooksService(userId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "소멸 임박 스탬프북 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 환전 완료된 스탬프북 조회
 */
export const getConvertedStampbooks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await getConvertedStampbooksService(userId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "히스토리 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 총 스탬프 수 조회
 */
export const getTotalStampCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const total = await getTotalStampCountService(userId);

    return res.success({
      totalStampCount: total,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 루피 레벨 조회
 */
export const getLoopyLevelInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await getLoopyLevelInfoService(userId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "루피 레벨 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 특정 카페별 내 스탬프북 현황 조회
 */
export const getMyStampByCafe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cafeId = Number(req.params.cafeId);
    const data = await getMyStampByCafeService(userId, cafeId);

    if (!data) {
      return res.status(404).json({
        resultType: "FAIL",
        error: "해당 카페에 대한 스탬프북이 없습니다.",
        success: null,
      });
    }

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 리워드 쿠폰 발급 (스탬프 완료 시)
 */
export const issueRewardCoupon = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cafeId = Number(req.params.cafeId);
    const coupon = await handleStampCompletionService(userId, cafeId);

    return res.success({
      message: "리워드 쿠폰 발급 성공",
      coupon,
    });
  } catch (err) {
    next(err);
  }
};
