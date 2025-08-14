import { getAllActiveChallengesService,
         joinChallengeService,
         getInProgressChallengesService,
         getChallengeDetailService,
         getPastChallengesByCafe,
         getChallengeStatisticsService} from '../services/admin.challenge.service.js';

export const getLiveChallengesController = async (req, res, next) => {
  try {
    const { cafeId } = req.params; // path param
    const challenges = await getAllActiveChallengesService(cafeId);
    return res.status(200).json({
      resultType: 'SUCCESS',
      data: challenges,
    });
  } catch (err) {
    next(err);
  }
};

export const joinChallengeController = async (req, res, next) => {
    try {
      const { cafeId, challengeId } = req.params;
      const challengeTitle = await joinChallengeService(cafeId, challengeId);
      res.status(201).json({
        resultType: 'SUCCESS',
        message: `${challengeTitle} 참여 완료!`,
      });
    } catch (err) {
      next(err);
    }
  };

export const getInProgressChallengesController = async (req, res, next) => {
  try {
    const { cafeId } = req.params;
    const result = await getInProgressChallengesService(cafeId);

    res.status(200).json({
      resultType: 'SUCCESS',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getPastChallengesController = async (req, res, next) => {
    try {
      const cafeId = Number(req.params.cafeId);
      const result = await getPastChallengesByCafe(cafeId);
      return res.status(200).json({
        resultType: "SUCCESS",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

export const getChallengeDetailController = async (req, res, next) => {
  try {
    const { cafeId, challengeId } = req.params;
    const result = await getChallengeDetailService(cafeId, challengeId);

    res.status(200).json({
      resultType: 'SUCCESS',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getChallengeStatistics = async (req, res, next) => {
    try {
      const cafeId = Number(req.params.cafeId);
      const data = await getChallengeStatisticsService(cafeId); 
      return res.success(data);
    } catch (err) {
      next(err);
    }
  };
  