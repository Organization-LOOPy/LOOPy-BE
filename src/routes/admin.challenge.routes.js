import express from 'express';
import { authenticateJWT } from '../middlewares/authMiddleware.js';
import { getLiveChallengesController,
         joinChallengeController,
         getInProgressChallengesController,
         getPastChallengesController,
         getChallengeDetailController,
         getChallengeStatistics } from '../controllers/admin.challenge.controller.js';

const router = express.Router();

router.use(authenticateJWT);

// 챌린지 목록 조회
router.get('/:cafeId/challenges/available', getLiveChallengesController);
// 챌린지 참여
router.post('/:cafeId/challenges/:challengeId/join',joinChallengeController);

// 진행 중인 챌린지 조회
router.get('/:cafeId/challenges/in-progress',getInProgressChallengesController);

// 과거 챌린지 조회
router.get('/:cafeId/challenges/past', getPastChallengesController);

// 챌린지 통계 조회
router.get('/:cafeId/challenges/statistics', getChallengeStatistics);

// 챌린지 상세 조회
router.get('/:cafeId/challenges/:challengeId', getChallengeDetailController);

export default router;
