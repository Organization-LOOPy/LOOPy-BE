import pkg from "@prisma/client";
import { getDistanceInMeters } from "../utils/geo.js";
import {
  ChallengeNotFoundError,
  ChallengeNotActiveError,
  AlreadyParticipatedError,
  InvalidCafeParticipationError,
  BadRequestError,
} from "../errors/customErrors.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// 챌린지 목록 조회
export const getChallengeListService = async (userId) => {
  const today = new Date();

  const challenges = await prisma.challenge.findMany({
    where: {
      isActive: true,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    orderBy: { endDate: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      startDate: true,
      endDate: true,
      participants: userId
        ? { where: { userId }, select: { status: true } }
        : false,
    },
  });

  return challenges.map((challenge) => ({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    thumbnailUrl: challenge.thumbnailUrl,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    isParticipated: userId
      ? challenge.participants.some((p) => p.status === "in_progress")
      : false,
  }));
};

// 챌린지 상세 조회
export const getChallengeDetailService = async (userId, challengeId) => {
  const id = Number(challengeId);
  if (isNaN(id)) throw new BadRequestError("유효하지 않은 챌린지 ID입니다.");

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
                orderBy: { displayOrder: "asc" },
                take: 1,
                select: { photoUrl: true },
              },
            },
          },
        },
      },
    },
  });

  if (!challenge)
    throw new ChallengeNotFoundError("해당 챌린지를 찾을 수 없습니다.");

  const participation = await prisma.challengeParticipant.findUnique({
    where: { userId_challengeId: { userId, challengeId: id } },
    include: { joinedCafe: { select: { id: true, name: true } } },
  });

  const isParticipated = participation?.status === "in_progress";
  const joinedCafe = participation?.joinedCafe || null;

  const availableCafeIds = challenge.availableCafes.map((ac) => ac.cafe.id);
  let joinedCount = 0;

  if (isParticipated && availableCafeIds.length > 0) {
    joinedCount = await prisma.stamp.count({
      where: {
        stampBook: { userId, cafeId: { in: availableCafeIds } },
        stampedAt: {
          gte: new Date(challenge.startDate),
          lte: new Date(new Date(challenge.endDate).setHours(23, 59, 59, 999)),
        },
      },
    });
  }

  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    thumbnailUrl: challenge.thumbnailUrl,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
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
};

// 챌린지 참여
export const participateInChallengeService = async (userId, cafeId, challengeId) => {
  const now = new Date();

  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(challengeId) },
  });
  if (!challenge || !challenge.isActive) throw new ChallengeNotFoundError();
  if (challenge.startDate > now || challenge.endDate < now)
    throw new ChallengeNotActiveError();

  const existing = await prisma.challengeParticipant.findUnique({
    where: {
      userId_challengeId: { userId, challengeId: Number(challengeId) },
    },
  });
  if (existing) throw new AlreadyParticipatedError();

  const isValidCafe = await prisma.challengeAvailableCafe.findFirst({
    where: { challengeId: Number(challengeId), cafeId: Number(cafeId) },
  });
  if (!isValidCafe) throw new InvalidCafeParticipationError();

  await prisma.challengeParticipant.create({
    data: {
      userId,
      challengeId: Number(challengeId),
      joinedCafeId: Number(cafeId),
      joinedAt: now,
    },
  });

  return { challengeId, cafeId, joinedAt: now };
};

// 챌린지 참여 가능 매장 목록 조회
export const getAvailableStoresForChallengeService = async (
  challengeId,
  userLat,
  userLon
) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(challengeId) },
  });
  if (!challenge || !challenge.isActive)
    throw new ChallengeNotFoundError("유효한 챌린지를 찾을 수 없습니다.");

  const availableCafes = await prisma.challengeAvailableCafe.findMany({
    where: {
      challengeId: Number(challengeId),
      cafe: { status: "active" },
    },
    include: { cafe: true },
  });

  return availableCafes.map(({ cafe }) => {
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
};

// 나의 챌린지 목록 조회
export const getMyChallengeListService = async (userId) => {
  const today = new Date();

  const myChallenges = await prisma.challengeParticipant.findMany({
    where: {
      userId,
      challenge: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
    },
    include: { challenge: true },
    orderBy: { challenge: { endDate: "asc" } },
  });

  return myChallenges.map((item) => ({
    id: item.challenge.id,
    title: item.challenge.title,
    thumbnailUrl: item.challenge.thumbnailUrl,
    tag: item.challenge.tag ?? null,
    startDate: item.challenge.startDate,
    endDate: item.challenge.endDate,
  }));
};

// 챌린지 완료 처리
export const completeChallengeService = async (userId, challengeId) => {
  const now = new Date();

  const participant = await prisma.challengeParticipant.findUnique({
    where: { userId_challengeId: { userId, challengeId: Number(challengeId) } },
  });
  if (!participant) throw new BadRequestError("챌린지 참여 정보가 없습니다.");

  if (participant.completedAt)
    throw new BadRequestError("이미 완료된 챌린지입니다.");

  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(challengeId) },
  });
  if (!challenge || !challenge.isActive || challenge.endDate < now)
    throw new BadRequestError("챌린지를 완료할 수 없습니다.");

  await prisma.challengeParticipant.update({
    where: { userId_challengeId: { userId, challengeId: Number(challengeId) } },
    data: { completedAt: now, status: "completed" },
  });

  const template = await prisma.couponTemplate.findFirst({
    where: { isActive: true, expiredAt: { gte: now } },
    orderBy: { expiredAt: "asc" },
  });

  let coupon = null;
  if (template) {
    coupon = await prisma.userCoupon.create({
      data: {
        userId,
        couponTemplateId: template.id,
        acquisitionType: "promotion",
        expiredAt: new Date(
          now.getTime() + template.validDays * 24 * 60 * 60 * 1000
        ),
      },
    });
  }

  return {
    message: "챌린지 완료 처리 성공",
    couponId: coupon?.id || null,
  };
};
