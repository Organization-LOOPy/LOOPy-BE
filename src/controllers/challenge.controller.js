import {
  getChallengeListService,
  getChallengeDetailService,
  participateInChallengeService,
  getAvailableStoresForChallengeService,
  getMyChallengeListService,
  completeChallengeService,
} from "../services/challenge.service.js";

// 챌린지 목록 조회
export const getChallengeList = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const data = await getChallengeListService(userId);
    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "챌린지 목록 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// 챌린지 상세 조회
export const getChallengeDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { challengeId } = req.params;
    const data = await getChallengeDetailService(userId, challengeId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "챌린지 상세 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// 챌린지 참여
export const participateInChallenge = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cafeId, challengeId } = req.params;
    const data = await participateInChallengeService(userId, cafeId, challengeId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "챌린지 참여 완료",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// 챌린지 참여 가능 매장 목록 조회
export const getAvailableStoresForChallenge = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { lat, lon } = req.query;
    const data = await getAvailableStoresForChallengeService(challengeId, lat, lon);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "참여 가능 매장 목록 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// 나의 챌린지 목록 조회
export const getMyChallengeList = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await getMyChallengeListService(userId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "나의 챌린지 목록 조회 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// 챌린지 완료 처리
export const completeChallenge = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { challengeId } = req.params;
    const data = await completeChallengeService(userId, challengeId);

    return res.status(200).json({
      status: "SUCCESS",
      code: 200,
      message: "챌린지 완료 처리 성공",
      data,
    });
  } catch (err) {
    next(err);
  }
};
