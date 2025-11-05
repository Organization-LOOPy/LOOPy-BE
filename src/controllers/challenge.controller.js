import {
  getChallengeListService,
  getChallengeDetailService,
  participateInChallengeService,
  getAvailableStoresForChallengeService,
  getMyChallengeListService,
  completeChallengeService,
} from "../services/challenge.service.js";

/* -------------------------------------
 * 1️⃣ 챌린지 목록 조회
 * ----------------------------------- */
export const getChallengeList = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? null;
    const data = await getChallengeListService(userId);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      resultType: "FAILURE",
      error: err.message || "챌린지 목록 조회 실패",
      success: null,
    });
  }
};

/* -------------------------------------
 * 2️⃣ 챌린지 상세 조회
 * ----------------------------------- */
export const getChallengeDetail = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? null;
    const { challengeId } = req.params;
    const data = await getChallengeDetailService(userId, challengeId);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      resultType: "FAILURE",
      error: err.message || "챌린지 상세 조회 실패",
      success: null,
    });
  }
};

/* -------------------------------------
 * 3️⃣ 챌린지 참여
 * (Swagger 명세에는 없지만 SUCCESS 포맷 통일)
 * ----------------------------------- */
export const participateInChallenge = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { cafeId, challengeId } = req.params;
    const data = await participateInChallengeService(userId, cafeId, challengeId);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      resultType: "FAILURE",
      error: err.message || "챌린지 참여 실패",
      success: null,
    });
  }
};

/* -------------------------------------
 * 4️⃣ 챌린지 참여 가능 매장 목록 조회
 * (Swagger 예시는 없지만 SUCCESS 포맷 통일)
 * ----------------------------------- */
export const getAvailableStoresForChallenge = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { lat, lon } = req.query;
    const data = await getAvailableStoresForChallengeService(challengeId, lat, lon);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      resultType: "FAILURE",
      error: err.message || "참여 가능 매장 목록 조회 실패",
      success: null,
    });
  }
};

/* -------------------------------------
 * 5️⃣ 나의 챌린지 목록 조회
 * ----------------------------------- */
export const getMyChallengeList = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const data = await getMyChallengeListService(userId);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      resultType: "FAILURE",
      error: err.message || "나의 챌린지 목록 조회 실패",
      success: null,
    });
  }
};

/* -------------------------------------
 * 6️⃣ 챌린지 완료 처리
 * ----------------------------------- */
export const completeChallenge = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { challengeId } = req.params;
    const data = await completeChallengeService(userId, challengeId);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: data, // { message, couponId }
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      resultType: "FAILURE",
      error: err.message || "챌린지 완료 처리 실패",
      success: null,
    });
  }
};