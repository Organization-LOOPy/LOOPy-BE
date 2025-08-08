import prisma from '../../prisma/client.js';
import { getAvailableChallengesByCafe,
         getInProgressChallengesByCafe,
         getChallengeDetailByCafe } from '../repositories/admin.challenge.repository.js';
import { CafeNotFoundError,
         ChallengeAlreadyJoinedError,
         ChallengeNotFoundError,
         ChallengeUnavailableError } from '../errors/customErrors.js';

// 참여 가능한 챌린지 조회 서비스       
export const getAvailableChallengesService = async (cafeId) => {
  const cafe = await prisma.cafe.findUnique({
    where: { id: Number(cafeId) }
  });

  if (!cafe) throw new CafeNotFoundError(cafeId);

  return await getAvailableChallengesByCafe(cafeId);
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
    participantCount,
    completedCount
  };
};