import pkg from '@prisma/client';
import { logger } from "../utils/logger.js";
import { ChallengeNotFoundError } from "../errors/customErrors.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// [기능 1] 챌린지 목록 조회
// - 사용 화면: [탐색 탭 > 챌린지 리스트 화면]
// - 현재 날짜 기준으로 유효한 챌린지들을 조회
// - 로그인 유저라면 각 챌린지에 참여 중인지 여부도 함께 반환
// - 리스트는 종료일 기준으로 오름차순 정렬

export const getChallengeList = async (req, res, next) => {
  try {
    const today = new Date(); // 현재 날짜
    const userId = req.user?.id || null; // 로그인 유저 ID (비로그인 시 null)

    const challenges = await prisma.challenge.findMany({
      where: {
        isActive: true, // 활성화 상태인 챌린지만 조회
        startDate: { lte: today }, // 시작일이 오늘 이전
        endDate: { gte: today },   // 종료일이 오늘 이후
      },
      orderBy: {
        endDate: "asc", // 종료일 기준 정렬 (빠른 순)
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
              where: { userId }, // 로그인 유저가 참여 중인지 여부만 확인
              select: { id: true },
            }
          : false, // 비로그인 시 participants 조회 생략
      },
    });

    const response = challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      thumbnailUrl: challenge.thumbnailUrl,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      isParticipated: userId ? challenge.participants.length > 0 : false, // 유저 참여 여부 플래그
    }));

    return res.success(response);
  } catch (err) {
    logger.error(`챌린지 목록 조회 실패: ${err.message}`);
    next(err);
  }
};

// [기능 2] 챌린지 상세 조회
// - 사용 화면: [탐색 탭 > 챌린지 상세 화면]
//   - 참여 X: 참여 가능 매장 찾기 버튼 표시
//   - 참여 O: 적립 도장 수 표시 + 참여 중 태그 표시
// - 챌린지 제목, 설명, 썸네일, 기간, 혜택 포인트, 목표 설명 등 상세 정보 제공
// - 로그인 유저의 챌린지 참여 여부 확인
// - 참여 가능한 카페 정보 포함 (홈/탐색탭용)
// - 존재하지 않는 챌린지 ID 조회 시 404 에러 반환

export const getChallengeDetail = async (req, res, next) => {
  const { challengeId } = req.params;
  const userId = req.user.id;

  try {
    // 1. 챌린지 기본 정보 + 참여 가능 카페 + 참여 여부 정보 포함 조회
    const challenge = await prisma.challenge.findUnique({
      where: { id: Number(challengeId) }, // 챌린지 ID로 단건 조회
      include: {
        availableCafes: {
          include: {
            cafe: true, // 참여 가능한 카페 정보 포함 (id, name, address 등)
          },
        },
        participants: {
          where: {
            userId: userId, // 현재 로그인 유저가 해당 챌린지에 참여 중인지 확인
          },
          select: {
            id: true, // 참여 여부만 확인하므로 ID만 select
          },
        },
      },
    });

    // 2. 유효하지 않은 챌린지 ID일 경우
    if (!challenge) {
      return next(new ChallengeNotFoundError("해당 챌린지를 찾을 수 없습니다."));
    }

    // 3. 참여 여부 확인
    const isParticipated = challenge.participants.length > 0;

    // 4. 응답 포맷 구성
    res.success({
      id: challenge.id,
      title: challenge.title, // 챌린지 제목
      description: challenge.description, // 챌린지 본문 설명
      thumbnailUrl: challenge.thumbnailUrl, // 썸네일 이미지
      startDate: challenge.startDate, // 시작일
      endDate: challenge.endDate, // 종료일
      goalDescription: challenge.goalDescription, // 목표 설명 (ex. “3회 공부 인증하기”)
      goalCount: challenge.goalCount, // 목표 도장 수 (ex. 3)
      rewardPoint: challenge.rewardPoint, // 보상 포인트 (ex. 300p)
      isParticipated, // 로그인 유저의 참여 여부 (true/false)
      availableCafes: challenge.availableCafes.map((entry) => ({
        id: entry.cafe.id,
        name: entry.cafe.name,
        address: entry.cafe.address,
        region1DepthName: entry.cafe.region1DepthName, // 시/도
        region2DepthName: entry.cafe.region2DepthName, // 구/군
        region3DepthName: entry.cafe.region3DepthName, // 동/읍/면
      })),
    });
  } catch (err) {
    logger.error(`챌린지 상세 조회 실패: ${err.message}`);
    next(err);
  }
};


// [기능 3] 챌린지 참여
// - 사용 화면: [챌린지 상세 화면 > 참여 버튼 클릭 시]
// - 로그인 유저가 챌린지에 참여 요청 시 동작
// - 챌린지 기간 및 중복 참여 여부 확인 후 참여 등록
// - 참여 내역은 ChallengeParticipant 테이블에 저장됨

export const participateInChallenge = async (req, res, next) => {
  const { challengeId } = req.params;
  const userId = req.user.id;

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: Number(challengeId) }, // 해당 챌린지 조회
    });

    if (!challenge || !challenge.isActive) {
      throw new ChallengeNotFoundError("유효한 챌린지를 찾을 수 없습니다.");
    }

    const now = new Date();
    if (challenge.startDate > now || challenge.endDate < now) {
      throw new BadRequestError("챌린지 기간이 아닙니다.");
    }

    // 유저가 이미 참여 중인지 확인
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

    // 참여 등록
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

// [기능 4] 챌린지 참여 가능 매장 목록 조회
// - 사용 화면: [챌린지 상세 화면 > 참여 가능 매장 확인 영역]
// - 해당 챌린지에서 참여 가능한 카페 리스트 반환
// - 카페 상태가 'active'인 것만 필터링
// - 거리 계산: util에서 가져올 예정

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
          status: "active", // 운영 중인 카페만
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
      distance: 500, // 추후 위치 기반 계산 적용 예정
    }));

    return res.success(response);
  } catch (err) {
    logger.error(`참여 가능 매장 목록 조회 실패: ${err.message}`);
    next(err);
  }
};

// [기능 5] 나의 챌린지 목록 조회
// - 사용 화면: [마이페이지 > 나의 챌린지 탭]
// - 로그인 유저가 현재 참여 중인 챌린지 목록 조회
// - 챌린지 기간 내(active 상태)만 필터링하여 제공
// - 종료일 기준 오름차순 정렬

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

// [기능 6] 챌린지 완료 처리
// - 사용 화면: [마이 챌린지 상세 화면 > '완료' 조건 만족 시 자동 호출]
// - 유저가 챌린지를 완료하면 상태를 업데이트하고, 쿠폰 발급
// - 완료 이력이 없고, 챌린지가 아직 유효한 경우에만 처리됨
// - 쿠폰은 가장 빠른 만료일을 가진 쿠폰 템플릿 기준으로 발급됨

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
