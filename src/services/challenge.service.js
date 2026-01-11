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

// 1. 챌린지 목록 조회
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
      ? challenge.participants?.some((p) => p.status === "in_progress")
      : false,
  }));
};

// 2. 챌린지 상세 조회
export const getChallengeDetailService = async (userId, challengeId) => {
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

  if (!challenge) {
    throw new ChallengeNotFoundError("해당 챌린지를 찾을 수 없습니다.");
  }

  const participation = await prisma.challengeParticipant.findUnique({
    where: { userId_challengeId: { userId, challengeId: id } },
    include: {
      joinedCafe: { select: { id: true, name: true } },
    },
  });

  // in_progress일 때만 true
  const isParticipated = participation?.status === "in_progress";

  const joinedCafe = participation?.joinedCafe
    ? { id: participation.joinedCafe.id, name: participation.joinedCafe.name }
    : null;

  // 현재 인증 횟수 (ChallengeParticipant.currentCount 사용)
  const joinedCount = participation?.currentCount ?? 0;

  return {
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
};

// 3. 챌린지 참여
export const participateInChallengeService = async (userId, cafeId, challengeId) => {
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
  if (existing) throw new AlreadyParticipatedError();

  // cafeId가 해당 챌린지의 참여 가능 매장인지 검증
  const isValidCafe = await prisma.challengeAvailableCafe.findFirst({
    where: {
      challengeId: Number(challengeId),
      cafeId: Number(cafeId),
    },
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

  return { message: "챌린지 참여가 완료되었습니다." };
};

// 4. 챌린지 참여 가능 매장 목록 조회
export const getAvailableStoresForChallengeService = async (
  challengeId,
  userLat,
  userLon
) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(challengeId) },
  });

  if (!challenge || !challenge.isActive) {
    throw new ChallengeNotFoundError("유효한 챌린지를 찾을 수 없습니다.");
  }

  const availableCafes = await prisma.challengeAvailableCafe.findMany({
    where: {
      challengeId: Number(challengeId),
      cafe: { status: "active" },
    },
    include: {
      cafe: {
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
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
      image: cafe.photos?.[0]?.photoUrl ?? null,
      region1DepthName: cafe.region1DepthName,
      region2DepthName: cafe.region2DepthName,
      region3DepthName: cafe.region3DepthName,
      distance,
    };
  });
};

// 5. 나의 챌린지 목록 조회
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
    include: {
      challenge: true,
    },
    orderBy: {
      challenge: { endDate: "asc" },
    },
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

// 6. 챌린지 완료 처리 (현재 상태 확인용 - 실제 완료는 사장님 인증으로만 가능)
export const completeChallengeService = async (userId, challengeId) => {
  const now = new Date();


  // 1️⃣ 참여 정보 + 챌린지 정보 조회
  const participant = await prisma.challengeParticipant.findUnique({
    where: { userId_challengeId: { userId, challengeId: Number(challengeId) } },
    include: {
      challenge: {
        select: { goalCount: true, title: true, rewardPoint: true, isActive: true, endDate: true }
      },
      joinedCafe: {
        select: { id: true, name: true }
  return await prisma.$transaction(async (tx) => {
    // 참여 정보
    const participant = await tx.challengeParticipant.findUnique({
      where: {
        userId_challengeId: {
          userId,
          challengeId: Number(challengeId),
        },
      },
    });

    if (!participant) {
      throw new BadRequestError("챌린지 참여 정보가 없습니다.");
    }
    if (participant.completedAt) {
      throw new BadRequestError("이미 완료된 챌린지입니다.");
    }

    // 챌린지 유효성
    const challenge = await tx.challenge.findUnique({
      where: { id: Number(challengeId) },
    });

    if (!challenge || !challenge.isActive || challenge.endDate < now) {
      throw new BadRequestError("챌린지를 완료할 수 없습니다.");
    }

    // 완료 처리
    await tx.challengeParticipant.update({
      where: {
        userId_challengeId: {
          userId,
          challengeId: Number(challengeId),
        },
      },
      data: {
        completedAt: now,
        status: "completed",
      },
    });

    // 완료한 챌린지 개수
    const completedCount = await tx.challengeParticipant.count({
      where: { userId, completedAt: { not: null } },
    });

    // 마일스톤 보상
    let milestoneRewarded = 0;
    let couponId = null;

    if (completedCount === 3) {
      milestoneRewarded = 500;

      // (5-1) 포인트 지급
      await tx.pointTransaction.create({
        data: {
          userId,
          point: milestoneRewarded,
          type: "earned",
          description: "챌린지 3회 완료 보상",
        },
      });

      // (5-2) 쿠폰 템플릿 조회 (NULL 만료 포함)
      const template = await tx.couponTemplate.findFirst({
        where: {
          isActive: true,
          OR: [
            { expiredAt: null },
            { expiredAt: { gte: now } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

     if (template) {
        const couponExpiredAt =
          typeof template.validDays === "number"
            ? new Date(
                now.getTime() +
                  template.validDays * 24 * 60 * 60 * 1000
              )
            : null;

        const coupon = await tx.userCoupon.create({
          data: {
            userId,
            couponTemplateId: template.id,
            acquisitionType: "promotion",
            expiredAt: couponExpiredAt,
          },
        });

        couponId = coupon.id;
      }
    }
  });

  if (!participant) {
    throw new BadRequestError("챌린지 참여 정보가 없습니다.");
  }

  const { currentCount, challenge, completedAt } = participant;
  const goalCount = challenge.goalCount;

  // 이미 완료된 경우
  if (completedAt) {
    return {
      message: "이미 완료된 챌린지입니다.",
      couponId: null
    };
  }

  // 챌린지 유효성 확인
  if (!challenge.isActive || challenge.endDate < now) {
    throw new BadRequestError("챌린지를 완료할 수 없습니다.");
  }

  // 아직 완료되지 않은 경우 - 진행 상황 안내
  const remainingCount = goalCount - currentCount;

  return {
    message: `챌린지 완료까지 ${remainingCount}회 남았습니다. 매장에서 인증을 받아주세요.`,
    couponId: null
  };
};
