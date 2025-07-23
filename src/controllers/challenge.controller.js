import pkg from '@prisma/client';
import { logger } from "../utils/logger.js";
import { ChallengeNotFoundError } from "../errors/customErrors.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// 1. 챌린지 목록 조회
export const getChallengeList = async (req, res, next) => {
  try {
    const today = new Date();
    const userId = req.user?.id || null;

    const challenges = await prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: {
        endDate: "asc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        startDate: true,
        endDate: true,
        participants: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    });

    const response = challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      thumbnailUrl: challenge.thumbnailUrl,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      isParticipated: userId ? challenge.participants.length > 0 : false,
    }));

    return res.success(response);
  } catch (err) {
    logger.error(`챌린지 목록 조회 실패: ${err.message}`);
    next(err);
  }
};

// 2. 챌린지 상세 조회
export const getChallengeDetail = async (req, res, next) => {
  const { challengeId } = req.params;
  const userId = req.user.id;

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: Number(challengeId) },
      include: {
        availableCafes: {
          include: {
            cafe: true,
          },
        },
        badges: {
          include: {
            badgeType: true,
          },
        },
        participants: {
          where: {
            userId: userId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!challenge) {
      return next(new ChallengeNotFoundError("해당 챌린지를 찾을 수 없습니다."));
    }

    const isParticipated = challenge.participants.length > 0;

    res.success({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      thumbnailUrl: challenge.thumbnailUrl,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      isParticipated,
      availableCafes: challenge.availableCafes.map((entry) => ({
        id: entry.cafe.id,
        name: entry.cafe.name,
        address: entry.cafe.address,
        region: entry.cafe.region,
      })),
      badges: challenge.badges.map((badge) => ({
        badgeType: badge.badgeType.title,
        earnedAt: badge.earnedAt,
      })),
    });
  } catch (err) {
    logger.error(`챌린지 상세 조회 실패: ${err.message}`);
    next(err);
  }
};

// 3. 챌린지 참여
export const participateInChallenge = async (req, res, next) => {
    const { challengeId } = req.params;
    const userId = req.user.id;
  
    try {
      const challenge = await prisma.challenge.findUnique({
        where: { id: Number(challengeId) },
      });
  
      if (!challenge || !challenge.isActive) {
        throw new ChallengeNotFoundError("유효한 챌린지를 찾을 수 없습니다.");
      }
  
      const now = new Date();
      if (challenge.startDate > now || challenge.endDate < now) {
        throw new BadRequestError("챌린지 기간이 아닙니다.");
      }
  
      const existing = await prisma.challengeParticipant.findUnique({
        where: {
          userId_challengeId: {
            userId,
            challengeId: Number(challengeId),
          },
        },
      });
  
      if (existing) {
        throw new BadRequestError("이미 참여 중인 챌린지입니다.");
      }
  
      await prisma.challengeParticipant.create({
        data: {
          userId,
          challengeId: Number(challengeId),
          joinedAt: now,
        },
      });
  
      return res.success({ message: "챌린지 참여가 완료되었습니다." });
    } catch (err) {
      next(err);
    }
  };

  // 4. 챌린지 참여 가능 매장 목록 조회
export const getAvailableStoresForChallenge = async (req, res, next) => {
    const { challengeId } = req.params;
  
    try {
      const challenge = await prisma.challenge.findUnique({
        where: { id: Number(challengeId) },
      });
  
      if (!challenge || !challenge.isActive) {
        return next(new ChallengeNotFoundError("유효한 챌린지를 찾을 수 없습니다."));
      }
  
      const availableCafes = await prisma.challengeAvailableCafe.findMany({
        where: {
          challengeId: Number(challengeId),
          cafe: {
            status: "active",
          },
        },
        include: {
          cafe: true,
        },
      });
  
      const response = availableCafes.map((entry) => ({
        cafeId: entry.cafe.id,
        name: entry.cafe.name,
        address: entry.cafe.address,
        region: entry.cafe.region,
        distance: 500, // TODO: 사용자 위치 기반 거리 계산은 추후 구현
      }));
  
      return res.success(response);
    } catch (err) {
      logger.error(`참여 가능 매장 목록 조회 실패: ${err.message}`);
      next(err);
    }
  };

  // 5. 나의 챌린지 목록 조회

  export const getMyChallengeList = async (req, res, next) => {
    const userId = req.user.id;
    const today = new Date();
  
    try {
      const myChallenges = await prisma.challengeParticipant.findMany({
        where: {
          userId,
          challenge: {
            isActive: true,
            startDate: { lte: today },
            endDate: { gte: today },
          },
        },
        include: {
          challenge: true,
        },
        orderBy: {
          challenge: {
            endDate: 'asc',
          },
        },
      });
  
      const response = myChallenges.map((item) => ({
        id: item.challenge.id,
        title: item.challenge.title,
        thumbnailUrl: item.challenge.thumbnailUrl,
        tag: item.challenge.tag ?? null, // optional
        startDate: item.challenge.startDate,
        endDate: item.challenge.endDate,
      }));
  
      return res.success(response);
    } catch (err) {
      logger.error(`나의 챌린지 목록 조회 실패: ${err.message}`);
      next(err);
    }
  };

  // 6. 챌린지 완료 처리
export const completeChallenge = async (req, res, next) => {
    const userId = req.user.id;
    const { challengeId } = req.params;
    const now = new Date();
  
    try {
      const participant = await prisma.challengeParticipant.findUnique({
        where: {
          userId_challengeId: {
            userId,
            challengeId: Number(challengeId),
          },
        },
      });
  
      if (!participant) {
        return res.fail(404, '챌린지 참여 정보가 없습니다.');
      }
  
      if (participant.completedAt) {
        return res.fail(400, '이미 완료된 챌린지입니다.');
      }
  
      const challenge = await prisma.challenge.findUnique({
        where: { id: Number(challengeId) },
      });
  
      if (!challenge || !challenge.isActive || challenge.endDate < now) {
        return res.fail(400, '챌린지를 완료할 수 없습니다.');
      }
  
      await prisma.challengeParticipant.update({
        where: {
          userId_challengeId: {
            userId,
            challengeId: Number(challengeId),
          },
        },
        data: {
          completedAt: now,
          status: 'completed',
        },
      });
  
      const template = await prisma.couponTemplate.findFirst({
        where: {
          isActive: true,
          expiredAt: { gte: now },
        },
        orderBy: {
          expiredAt: 'asc',
        },
      });
  
      let coupon = null;
      if (template) {
        coupon = await prisma.userCoupon.create({
          data: {
            userId,
            couponTemplateId: template.id,
            acquisitionType: 'promotion',
            expiredAt: new Date(now.getTime() + template.validDays * 24 * 60 * 60 * 1000),
          },
        });
      }
  
      return res.success({
        message: '챌린지를 성공적으로 완료했습니다.',
        couponId: coupon?.id || null,
      });
    } catch (err) {
      logger.error(`챌린지 완료 처리 실패: ${err.message}`);
      next(err);
    }
  };
  