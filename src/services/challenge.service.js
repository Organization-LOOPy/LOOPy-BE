import pkg from "@prisma/client";
import { getDistanceInMeters } from "../utils/geo.js";
import { parseIntOrThrow, validateActiveChallenge } from "../utils/validation.js";
import {
  ChallengeNotFoundError,
  AlreadyParticipatedError,
  InvalidCafeParticipationError,
  BadRequestError,
  ChallengeNotActiveError,
} from "../errors/customErrors.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// 1. 챌린지 목록 조회
export const getChallengeListService = async (userId) => {
  const today = new Date();

  // 활성화 상태이면서 진행 중인 챌린지 조회
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
      // 유저가 로그인한 경우에만 해당 유저의 참여 상태를 조회
      participants: userId
        ? { where: { userId }, select: { status: true } }
        : undefined,
    },
  });

  // 응답 데이터 가공
  return challenges.map((challenge) => {
    const isParticipated =
      userId && challenge.participants?.some((p) => p.status === "in_progress");

    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      thumbnailUrl: challenge.thumbnailUrl,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      isParticipated: Boolean(isParticipated),
    };
  });
};

// 2. 챌린지 상세 조회
export const getChallengeDetailService = async (userId, challengeId) => {
  // 챌린지 ID 검증
  const id = Number(challengeId);
  if (isNaN(id)) throw new BadRequestError("유효하지 않은 챌린지 ID입니다.");

  // 챌린지 기본 정보 + 참여 가능 매장 조회
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

  if (!challenge) throw new ChallengeNotFoundError("해당 챌린지를 찾을 수 없습니다.");

  // 유저의 챌린지 참여 상태 조회
  const participation = await prisma.challengeParticipant.findUnique({
    where: { userId_challengeId: { userId, challengeId: id } },
    include: { joinedCafe: { select: { id: true, name: true } } },
  });

  const isParticipated = participation?.status === "in_progress";
  const joinedCafe = participation?.joinedCafe ?? null;

  // 참여 중인 경우, 현재 인증 횟수 조회 (ChallengeParticipant.currentCount 사용)
  const joinedCount = participation?.currentCount ?? 0;

  // 응답 데이터
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
    availableCafes: challenge.availableCafes.map(({ cafe }) => ({
      id: cafe.id,
      name: cafe.name,
      address: cafe.address,
      image: cafe.photos?.[0]?.photoUrl ?? null,
      region1DepthName: cafe.region1DepthName,
      region2DepthName: cafe.region2DepthName,
      region3DepthName: cafe.region3DepthName,
    })),
  };
};


// 3. 챌린지 참여
export const participateInChallengeService = async (userId, cafeId, challengeId) => {
  const now = new Date();

  const parsedChallengeId = parseIntOrThrow(challengeId, "유효하지 않은 챌린지 ID입니다.");
  const parsedCafeId = parseIntOrThrow(cafeId, "유효하지 않은 카페 ID입니다.");
  const challenge = await prisma.challenge.findUnique({
    where: { id: parsedChallengeId },
  });
  validateActiveChallenge(challenge, now);

  // 중복 참여 여부 확인
  const existingParticipation = await prisma.challengeParticipant.findUnique({
    where: { userId_challengeId: { userId, challengeId: parsedChallengeId } },
  });
  if (existingParticipation) throw new AlreadyParticipatedError();

  // 카페 참여 가능 여부 검증
  const isValidCafe = await prisma.challengeAvailableCafe.findFirst({
    where: {
      challengeId: parsedChallengeId,
      cafeId: parsedCafeId,
    },
  });
  if (!isValidCafe) throw new InvalidCafeParticipationError();

  // 참여 기록 생성
  const participation = await prisma.challengeParticipant.create({
    data: {
      userId,
      challengeId: parsedChallengeId,
      joinedCafeId: parsedCafeId,
      joinedAt: now,
    },
  });

  return {
    challengeId: participation.challengeId,
    cafeId: participation.joinedCafeId,
    joinedAt: participation.joinedAt,
  };
};

// 4. 챌린지 참여 가능 매장 목록 조회
export const getAvailableStoresForChallengeService = async (
  challengeId,
  userLat,
  userLon
) => {
  // 챌린지 유효성 검사
  const parsedChallengeId = Number(challengeId);
  if (isNaN(parsedChallengeId)) throw new BadRequestError("유효하지 않은 챌린지 ID입니다.");

  const challenge = await prisma.challenge.findUnique({
    where: { id: parsedChallengeId },
    select: { id: true, isActive: true },
  });

  if (!challenge || !challenge.isActive) {
    throw new ChallengeNotFoundError("유효한 챌린지를 찾을 수 없습니다.");
  }

  // 참여 가능 매장 조회 (활성화된 매장만)
  const availableCafes = await prisma.challengeAvailableCafe.findMany({
    where: {
      challengeId: parsedChallengeId,
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

  // 거리 계산 및 응답 데이터 변환
  return availableCafes.map(({ cafe }) => {
    const distance =
      userLat != null &&
      userLon != null &&
      cafe.latitude != null &&
      cafe.longitude != null
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


// 나의 챌린지 목록 조회
export const getMyChallengeListService = async (userId) => {
  const today = new Date();

  // 1. 사용자가 참여 중인 활성 챌린지 조회
  const myChallenges = await prisma.challengeParticipant.findMany({
    where: {
      userId,
      challenge: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
    },
    select: {
      challenge: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          startDate: true,
          endDate: true,
          tag: true, // optional
        },
      },
    },
    orderBy: {
      challenge: { endDate: "asc" },
    },
  });

  // 2. 응답 데이터 가공
  return myChallenges
    .filter((item) => item.challenge)
    .map(({ challenge }) => ({
      id: challenge.id,
      title: challenge.title,
      thumbnailUrl: challenge.thumbnailUrl,
      tag: challenge.tag ?? null,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    }));
};

export const completeChallengeService = async (userId, challengeId) => {
  const now = new Date();


  // 1️⃣ 참여 정보 + 챌린지 정보 조회
  const participant = await prisma.challengeParticipant.findUnique({
    where: { userId_challengeId: { userId, challengeId: Number(challengeId) } },
    include: {
      challenge: {
        select: { goalCount: true, title: true, rewardPoint: true }
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

  if (!participant) throw new BadRequestError("챌린지 참여 정보가 없습니다.");

  const { currentCount, challenge, joinedCafe, completedAt } = participant;
  const goalCount = challenge.goalCount;

  // 2️⃣ 이미 완료된 경우 - 완료 정보 반환
  if (completedAt) {
    return {
      status: "COMPLETED",
      message: "이미 완료된 챌린지입니다.",
      data: {
        currentCount,
        goalCount,
        completedAt: completedAt.toISOString(),
        challengeTitle: challenge.title,
        rewardPoint: challenge.rewardPoint,
      },
    };
  }

  // 3️⃣ 아직 완료되지 않은 경우 - 진행 상황 및 안내 반환
  const remainingCount = goalCount - currentCount;

  return {
    status: "IN_PROGRESS",
    message: `챌린지 완료까지 ${remainingCount}회 남았습니다. 매장에서 인증을 받아주세요.`,
    data: {
      currentCount,
      goalCount,
      remainingCount,
      challengeTitle: challenge.title,
      joinedCafe: joinedCafe ? { id: joinedCafe.id, name: joinedCafe.name } : null,
      rewardPoint: challenge.rewardPoint,
    },
  };
};