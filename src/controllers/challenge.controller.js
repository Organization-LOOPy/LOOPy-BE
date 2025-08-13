import pkg from '@prisma/client';
import { logger } from "../utils/logger.js";
import {
  ChallengeNotFoundError,
  ChallengeNotActiveError,
  AlreadyParticipatedError,
  InvalidCafeParticipationError,
} from "../errors/customErrors.js";
import { BadRequestError} from "../errors/customErrors.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// 챌린지 목록 조회
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

// 챌린지 상세 조회
export const getChallengeDetail = async (req, res, next) => {
  const { challengeId } = req.params;
  const userId = req.user.id;

  try {
    const id = Number(challengeId);

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        availableCafes: {
          include: {
            cafe: {
              select: {
                id: true,
                name: true,
                address: true,
                region1DepthName: true,
                region2DepthName: true,
                region3DepthName: true,
                photos: {
                  orderBy: { displayOrder: 'asc' },
                  take: 1,
                  select: { photoUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!challenge) {
      return next(new ChallengeNotFoundError("해당 챌린지를 찾을 수 없습니다."));
    }

    const participation = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId, challengeId: id } },
      include: {
        joinedCafe: { select: { id: true, name: true } },
      },
    });

    const isParticipated = !!participation;
    const joinedCafe = participation?.joinedCafe
      ? { id: participation.joinedCafe.id, name: participation.joinedCafe.name }
      : null;

    const availableCafeIds = challenge.availableCafes.map((ac) => ac.cafe.id);
    let joinedCount = 0;

    if (isParticipated && availableCafeIds.length > 0) {
      joinedCount = await prisma.stamp.count({
        where: {
          stampBook: {
            userId,
            cafeId: { in: availableCafeIds },
          },
          stampedAt: {
            gte: new Date(challenge.startDate),
            lte: new Date(
              new Date(challenge.endDate).setHours(23, 59, 59, 999)
            ),
          },
        },
      });
    }

    const challengeDetail = {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      thumbnailUrl: challenge.thumbnailUrl,
      startDate: challenge.startDate.toISOString().slice(0, 10),
      endDate: challenge.endDate.toISOString().slice(0, 10),
      goalDescription: challenge.goalDescription,
      goalCount: challenge.goalCount,
      rewardPoint: challenge.rewardPoint,
      isParticipated,
      joinedCafe,
      joinedCount, 
      availableCafes: challenge.availableCafes.map((entry) => ({
        id: entry.cafe.id,
        name: entry.cafe.name,
        address: entry.cafe.address,
        image: entry.cafe.photos?.[0]?.photoUrl ?? null, 
        region1DepthName: entry.cafe.region1DepthName,
        region2DepthName: entry.cafe.region2DepthName,
        region3DepthName: entry.cafe.region3DepthName,
      })),
    };

    return res.success(challengeDetail);
  } catch (err) {
    logger.error(`챌린지 상세 조회 실패: ${err.message}`);
    next(err);
  }
};


// 챌린지 참여
export const participateInChallenge = async (req, res, next) => {
  const { challengeId } = req.params;
  const { joinedCafeId } = req.body;
  const userId = req.user.id;

  try {
    const now = new Date();

    const challenge = await prisma.challenge.findUnique({
      where: { id: Number(challengeId) },
    });

    if (!challenge || !challenge.isActive) {
      throw new ChallengeNotFoundError();
    }

    if (challenge.startDate > now || challenge.endDate < now) {
      throw new ChallengeNotActiveError();
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
      throw new AlreadyParticipatedError();
    }

    const isValidCafe = await prisma.challengeAvailableCafe.findFirst({
      where: {
        challengeId: Number(challengeId),
        cafeId: joinedCafeId,
      },
    });

    if (!isValidCafe) {
      throw new InvalidCafeParticipationError();
    }

    await prisma.challengeParticipant.create({
      data: {
        userId,
        challengeId: Number(challengeId),
        joinedCafeId,
        joinedAt: now,
      },
    });

    return res.success({ message: "챌린지 참여가 완료되었습니다." });
  } catch (err) {
    next(err);
  }
};

// 챌린지 참여 가능 매장 목록 조회
import { getDistanceInMeters } from "../utils/geo.js";

export const getAvailableStoresForChallenge = async (req, res, next) => {
  const { challengeId } = req.params;
  const { lat: userLat, lon: userLon } = req.query;

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
        cafe: { status: "active" },
      },
      include: { cafe: true },
    });

    const response = availableCafes.map(({ cafe }) => {
      const distance =
        userLat && userLon && cafe.latitude && cafe.longitude
          ? getDistanceInMeters(userLat, userLon, cafe.latitude, cafe.longitude)
          : null;

      return {
        cafeId: cafe.id,
        name: cafe.name,
        address: cafe.address,
        image: cafe.image,
        region1DepthName: cafe.region1DepthName,
        region2DepthName: cafe.region2DepthName,
        region3DepthName: cafe.region3DepthName,
        distance,
      };
    });

    return res.success(response);
  } catch (err) {
    logger.error(`참여 가능 매장 목록 조회 실패: ${err.message}`);
    next(err);
  }
};

// 나의 챌린지 목록 조회
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
      tag: item.challenge.tag ?? null,
      startDate: item.challenge.startDate,
      endDate: item.challenge.endDate,
    }));

    return res.success(response);
  } catch (err) {
    logger.error(`나의 챌린지 목록 조회 실패: ${err.message}`);
    next(err);
  }
};

// 챌린지 완료 처리
export const completeChallenge = async (req, res, next) => {
  const userId = req.user.id;
  const { challengeId } = req.params;
  const now = new Date();

  try {
    // 참여 이력 확인
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

    // 챌린지 유효성 확인
    const challenge = await prisma.challenge.findUnique({
      where: { id: Number(challengeId) },
    });

    if (!challenge || !challenge.isActive || challenge.endDate < now) {
      return res.fail(400, '챌린지를 완료할 수 없습니다.');
    }

    // 완료 처리
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

    // 쿠폰 템플릿 조회 (가장 빠른 만료일 순)
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
