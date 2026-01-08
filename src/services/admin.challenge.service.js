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
      where: { cafeId: cafeIdNum, challengeId: challengeNum},
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
      include: { participants: {where: { joinedCafeId: Number(cafeId) }}}
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

  if (!challenge) {
    throw new ChallengeNotFoundError(challengeId);
  }

  const uniqueUserIds = new Set(
    challenge.participants.map(p => p.userId)
  );

  const completedUserIds = new Set(
    challenge.participants
      .filter(p => p.status === 'completed')
      .map(p => p.userId)
  );

  return {
    id: challenge.id,
    title: challenge.title,
    thumbnailUrl: challenge.thumbnailUrl,
    description: challenge.description,
    startDate: challenge.startDate.toISOString().split('T')[0],
    endDate: challenge.endDate.toISOString().split('T')[0],
    rewardDetail: challenge.goalDescription,
    rewardPoint: challenge.rewardPoint,
    participantCount: uniqueUserIds.size, 
    completedCount: completedUserIds.size, 
  };
};

// 챌린지 통계 조회 서비스
export const getChallengeStatisticsService = async (cafeId) => {
  const cafeIdNum = Number(cafeId);

  const participants = await prisma.challengeParticipant.findMany({
    where: {
      joinedCafeId: cafeIdNum,
    },
    select: {
      challengeId: true,
      userId: true,
      status: true,
      challenge: {
        select: { goalCount: true },
      },
    },
  });

  if (participants.length === 0) {
    return {
      participatedChallengeCount: 0,
      totalParticipantCount: 0,
      completedUserCount: 0,
      challengeRelatedSalesCount: 0,
    };
  }

  const uniqueChallengeIds = new Set(
    participants.map(p => p.challengeId)
  );

  const uniqueUserIds = new Set(
    participants.map(p => p.userId)
  );

  const completedUserIds = new Set(
    participants
      .filter(p => p.status === 'completed')
      .map(p => p.userId)
  );

  const challengeGoalMap = new Map();
  for (const p of participants) {
    if (!challengeGoalMap.has(p.challengeId)) {
      challengeGoalMap.set(p.challengeId, p.challenge.goalCount);
    }
  }

  const challengeRelatedSalesCount = Array
    .from(challengeGoalMap.values())
    .reduce((sum, v) => sum + v, 0);

  return {
    participatedChallengeCount: uniqueChallengeIds.size,
    totalParticipantCount: uniqueUserIds.size,
    completedUserCount: completedUserIds.size,
    challengeRelatedSalesCount,
  };
};