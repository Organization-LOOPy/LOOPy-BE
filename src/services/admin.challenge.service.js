import prisma from '../../prisma/client.js';
import { findAllActiveChallengesByCafe,
         getInProgressChallengesByCafe,
         getChallengeDetailByCafe } from '../repositories/admin.challenge.repository.js';
import { CafeNotFoundError,
         ChallengeAlreadyJoinedError,
         ChallengeNotFoundError,
         ChallengeUnavailableError } from '../errors/customErrors.js';

// 참여 가능한 챌린지 조회 서비스       
export const getAllActiveChallengesService = async (cafeId) => {
  const cafe = await prisma.cafe.findUnique({
    where: { id: Number(cafeId) }
  });

  if (!cafe) throw new CafeNotFoundError(cafeId);

  return await findAllActiveChallengesByCafe(cafeId);
};

// 챌린지 참여 서비스
export const joinChallengeService = async (cafeId, challengeId) => {
    const cafeIdNum = Number(cafeId);
    const challengeNum = Number(challengeId);
    const today = new Date();
    
    const cafe = await prisma.cafe.findUnique({ where: { id: Number(cafeId) } });
    if (!cafe) throw new CafeNotFoundError(cafeId);
  
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeNum }
    });
    if (!challenge) throw new ChallengeNotFoundError(challengeId);

    if (!challenge.isActive || challenge.startDate > today || challenge.endDate < today) {
        throw new ChallengeUnavailableError(challengeId);
    }

    const existing = await prisma.challengeAvailableCafe.findFirst({
      where: {
        cafeId: cafeIdNum,
        challengeId: challengeNum
      },
    });
    if (existing) throw new ChallengeAlreadyJoinedError();
  
    await prisma.challengeAvailableCafe.create({
      data: {
        cafeId: Number(cafeId),
        challengeId: Number(challengeId),
      },
    });

    return challenge.title;
  };

// 진행 중인 챌린지 조회 서비스
export const getInProgressChallengesService = async (cafeId) => {
  const cafe = await prisma.cafe.findUnique({
    where: { id: Number(cafeId) },
  });
  if (!cafe) throw new CafeNotFoundError(cafeId);

  return await getInProgressChallengesByCafe(cafeId);
};

// 기간 지난 챌린지 조회 서비스
export const getPastChallengesByCafe = async (cafeId) => {
    const today = new Date();
  
    const challenges = await prisma.challenge.findMany({
      where: {
        endDate: { lt: today }, 
        participants: {
          some: {
            joinedCafeId: Number(cafeId) 
          }
        }
      },
      include: {
        participants: {
          where: { joinedCafeId: Number(cafeId) }
        }
      }
    });
  
    return challenges.map((challenge) => {
      const participantCount = challenge.participants.length;
      const completedCount = challenge.participants.filter(
        (p) => p.status === 'completed'
      ).length;
  
      return {
        id: challenge.id,
        title: challenge.title,
        thumbnailUrl: challenge.thumbnailUrl,
        startDate: challenge.startDate?.toISOString().split('T')[0],
        endDate: challenge.endDate?.toISOString().split('T')[0],
        participantCount,
        completedCount
      };
    });
  };

// 챌린지 상세 조회 서비스
export const getChallengeDetailService = async (cafeId, challengeId) => {
  const challenge = await getChallengeDetailByCafe(cafeId, challengeId);

  if (!challenge) throw new ChallengeNotFoundError(challengeId);

  const participantCount = challenge.participants.length;
  const completedCount = challenge.participants.filter(p => p.status === 'completed').length;

  return {
    id: challenge.id,
    title: challenge.title,
    thumbnailUrl: challenge.thumbnailUrl,
    description: challenge.description,
    startDate: challenge.startDate.toISOString().split('T')[0],
    endDate: challenge.endDate.toISOString().split('T')[0],
    rewardDetail: challenge.goalDescription,
    rewardPoint: challenge.rewardPoint,
    participantCount,
    completedCount
  };
};

// 챌린지 통계 조회 서비스
export const getChallengeStatisticsService = async (cafeId) => {
  const cafeIdNum = Number(cafeId);

  // 1. 내 카페가 참여한 챌린지 ID 목록
  const participatedChallenges = await prisma.challengeParticipant.findMany({
    where: {  joinedCafeId: cafeIdNum },
    select: { challengeId: true },
  });

  const challengeIds = participatedChallenges.map(p => p.challengeId);
  if (challengeIds.length === 0) {
    return {
      participatedChallengeCount: 0,
      totalParticipantCount: 0,
      completedUserCount: 0,
      challengeRelatedSalesCount: 0,
    };
  }

  // 2. 병렬 처리
  const [participants, completed, progress] = await Promise.all([
    prisma.challengeParticipant.findMany({
      where: {
        challengeId: { in: challengeIds },
        joinedCafeId: cafeIdNum,
      },
      select: { userId: true },
      distinct: ['userId'],
    }),

    prisma.challengeParticipant.findMany({
      where: {
        challengeId: { in: challengeIds },
        joinedCafeId: cafeIdNum,
        status: 'completed',
      },
      select: { userId: true },
      distinct: ['userId'],
    }),

    prisma.challengeParticipant.findMany({
      where: {
        challengeId: { in: challengeIds },
        joinedCafeId: cafeIdNum,
      },
      select: { challenge: { select: { goalCount: true } } },
    }),
  ]);

  const totalSales = progress.reduce((sum, p) => sum + p.challenge.goalCount, 0);

  return {
    participatedChallengeCount: challengeIds.length,
    totalParticipantCount: participants.length,
    completedUserCount: completed.length,
    challengeRelatedSalesCount: totalSales,
  };
};
