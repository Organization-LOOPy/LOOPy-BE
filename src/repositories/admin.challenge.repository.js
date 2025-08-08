import prisma from '../../prisma/client.js';

export const getAvailableChallengesByCafe = async (cafeId) => {
  const today = new Date();

  const challenges = await prisma.challenge.findMany({
    where: {
      isActive: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    include: {
      availableCafes: {
        where: { cafeId: Number(cafeId) },
        select: { id: true }
      }
    }
  });

  return challenges.map(challenge => ({
    id: challenge.id,
    title: challenge.title,
    thumbnailUrl: challenge.thumbnailUrl,
    startDate: challenge.startDate ? challenge.startDate.toISOString().split('T')[0] : null,
    endDate: challenge.endDate ? challenge.endDate.toISOString().split('T')[0] : null,
    isJoined: challenge.availableCafes.length > 0,
  }));
};

export const getInProgressChallengesByCafe = async (cafeId) => {
    const today = new Date();
  
    const challenges = await prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
        availableCafes: {
          some: { cafeId: Number(cafeId) },
        },
      },
      include: {
        participants: {
          where: {
            joinedCafeId: Number(cafeId),
          },
        },
      },
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
        startDate: challenge.startDate ? challenge.startDate.toISOString().split('T')[0] : null,
        endDate: challenge.endDate ? challenge.endDate.toISOString().split('T')[0] : null,
        participantCount,
        completedCount,
      };
    });
  };

export const getChallengeDetailByCafe = async (cafeId, challengeId) => {
  return await prisma.challenge.findFirst({
    where: {
      id: Number(challengeId),
      availableCafes: {
        some: { cafeId: Number(cafeId) }
      }
    },
    include: {
      participants: {
        where: { joinedCafeId: Number(cafeId) }
      }
    }
  });
};
