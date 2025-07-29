import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

import { StampbookNotFoundError } from "../errors/customErrors.js";

//  [기능 1] 전체 스탬프북 조회
// - 사용 화면: [마이페이지 > 스탬프북 리스트 화면]
// - 현재 로그인한 유저가 보유한 모든 스탬프북을 조회
// - 정렬 기준: 적립 많은 순(mostStamped) / 기한 짧은 순(shortestDeadline)
// - 기본값: 생성일 내림차순

export const getMyStampBooks = async (req, res, next) => {
  const userId = req.user.id;
  const { sortBy } = req.query;

  try {
    // 1. 정렬 조건 설정
    let orderByClause;
    if (sortBy === 'mostStamped') {
      orderByClause = { currentCount: 'desc' }; // 적립 많은 순
    } else if (sortBy === 'shortestDeadline') {
      orderByClause = { expiresAt: 'asc' }; // 만료일 빠른 순
    } else {
      orderByClause = { createdAt: 'desc' }; // 기본값: 생성일 내림차순
    }

    // 2. 스탬프북 조회
    const stampBooks = await prisma.stampBook.findMany({
      where: { userId }, // 본인 스탬프북만
      include: {
        cafe: true,
      },
      orderBy: orderByClause,
    });

    // 3. 응답 가공
    const response = stampBooks.map((sb) => ({
      id: sb.id,
      cafe: {
        id: sb.cafe.id,
        name: sb.cafe.name,
        address: sb.cafe.address,
      },
      currentCount: sb.currentCount,
      goalCount: sb.goalCount,
      status: sb.status,
      expiredAt: sb.expiresAt,
    }));

    return res.success(response);
  } catch (err) {
    logger.error(`스탬프북 리스트 조회 실패: ${err.message}`);
    next(err);
  }
};


//  [기능 2] 스탬프북 상세 조회
// - 사용 화면: [스탬프북 리스트 > 스탬프북 상세 화면]
// - 해당 스탬프북의 카페 정보, 도장 목록, 상태, 리워드 정보 등 조회
// - 본인 소유 확인 및 존재 여부 확인 포함

export const getStampBookDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId); // param에서 ID 추출

    const stampBook = await prisma.stampBook.findFirst({
      where: {
        id: stampBookId,
        userId, // 본인 소유 확인
      },
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        stamps: {
          orderBy: {
            stampedAt: 'asc', // 도장 순서 보장
          },
          select: {
            id: true,
            stampedAt: true,
            stampImageUrl: true,
            source: true,
            note: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!stampBook) {
      throw new NotFoundError('존재하지 않는 스탬프북입니다.');
    }

    const responseData = {
      id: stampBook.id,
      cafe: stampBook.cafe,
      goalCount: stampBook.goalCount,
      currentCount: stampBook.stamps.length,
      status: stampBook.status,
      isCompleted: stampBook.isCompleted,
      rewardDetail: stampBook.rewardDetail,
      startedAt: stampBook.startedAt,
      lastVisitedAt: stampBook.lastVisitedAt,
      expiresAt: stampBook.expiresAt,
      extendedAt: stampBook.extendedAt,
      expiredAt: stampBook.expiredAt,
      completedAt: stampBook.completedAt,
      convertedAt: stampBook.convertedAt,
      createdAt: stampBook.createdAt,
      updatedAt: stampBook.updatedAt,
      stamps: stampBook.stamps,
    };

    res.status(200).json({
      status: 'SUCCESS',
      code: 200,
      message: '스탬프북 상세 조회 성공',
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

//   [기능 3] 도장 1개 적립
// - 사용 화면: [QR 코드 인식 or 수동 적립 요청 시]
// - QR 또는 MANUAL 방식으로 도장 1개 적립
// - 목표 도장 수를 초과할 수 없으며, 유효한 방식인지 체크함

export const addStamp = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId, 10);
    const { cafeId, method } = req.body;

    // 적립 방식 유효성 검사
    if (!['QR', 'MANUAL'].includes(method)) {
      return res.error(400, '적립 방식이 올바르지 않습니다.');
    }

    // 스탬프북 존재 및 소유권 확인
    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
      include: { stamps: true },
    });

    if (!stampBook) {
      return res.error(404, '스탬프북을 찾을 수 없습니다.');
    }
    if (stampBook.userId !== userId) {
      return res.error(403, '해당 스탬프북에 접근 권한이 없습니다.');
    }

    // 목표 수량 달성 여부 확인
    const currentCount = stampBook.stamps.length;
    const goalCount = stampBook.goalStampCount;

    if (currentCount >= goalCount) {
      return res.error(400, '이미 모든 도장이 적립되었습니다.');
    }

    // 도장 적립 처리
    await prisma.stamp.create({
      data: {
        stampBookId,
        cafeId,
        method,
      },
    });

    const updatedCount = currentCount + 1;
    const isCompleted = updatedCount >= goalCount;

    return res.success({
      stampCount: updatedCount,
      isStampbookCompleted: isCompleted,
    });
  } catch (error) {
    next(error);
  }
};

//  [기능 4] 스탬프 → 포인트 환전
// - 사용 화면: [스탬프북 상세 > ‘환전하기’ 버튼 클릭 시]
// - 완료된 스탬프북만 환전 가능, 1스탬프당 100포인트 환산
// - 포인트 적립 후, 트랜잭션으로 유저 포인트 + 스탬프북 상태 변경 + 기록 저장

export const convertStampToPoint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId, 10);

    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
      include: { stamps: true },
    });

    // 유효성 검사
    if (!stampBook) throw new StampbookNotFoundError('존재하지 않는 스탬프북입니다.');
    if (stampBook.userId !== userId) throw new ForbiddenError('본인의 스탬프북만 환전할 수 있습니다.');
    if (stampBook.status !== 'completed') throw new BadRequestError('완료된 스탬프북만 환전할 수 있습니다.');
    if (stampBook.isConverted || stampBook.convertedAt) throw new BadRequestError('이미 환전된 스탬프북입니다.');

    const stampCount = stampBook.stamps.length;
    if (stampCount === 0) throw new BadRequestError('환전 가능한 스탬프가 없습니다.');

    const pointAmount = stampCount * 100;

    // 트랜잭션으로 상태 업데이트 및 포인트 적립, 기록
    await prisma.$transaction([
      prisma.stampBook.update({
        where: { id: stampBookId },
        data: {
          convertedAt: new Date(),
          isConverted: true,
          status: 'converted',
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          totalPoint: {
            increment: pointAmount,
          },
        },
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          stampBookId,
          point: pointAmount,
          type: 'earned',
          description: '스탬프 환전',
        },
      }),
    ]);

    return res.success({
      message: `${stampCount}개의 스탬프가 ${pointAmount} 포인트로 환전되었습니다.`,
      stampCount,
      pointAmount,
    });
  } catch (err) {
    next(err);
  }
};

//  [기능 5] 환전 취소 -> 보류
// - 사용 화면: [환전 후 3일 이내 환전 취소 요청 시]
// - 유저가 환전한 스탬프북을 3일 이내에 취소할 수 있음
// - 포인트 회수, 스탬프북 상태 복구, 환불 기록 남김

export const cancelStampConversion = async (req, res, next) => {
  const userId = req.user.id;
  const stampBookId = parseInt(req.params.stampBookId, 10);

  try {
    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
    });

    if (!stampBook) throw new NotFoundError("존재하지 않는 스탬프북입니다.");
    if (stampBook.userId !== userId)
      throw new ForbiddenError("본인의 스탬프북만 환전 취소할 수 있습니다.");
    if (!stampBook.isConverted || !stampBook.convertedAt)
      throw new BadRequestError("환전되지 않은 스탬프북입니다.");

    // 3일 이내 취소 가능 여부 확인
    const now = new Date();
    const convertedAt = new Date(stampBook.convertedAt);
    const diffInDays = (now - convertedAt) / (1000 * 60 * 60 * 24);
    if (diffInDays > 3)
      throw new BadRequestError("환전 취소는 3일 이내에만 가능합니다.");

    const stampCount = stampBook.currentStampCount;
    const refundPoint = stampCount * 100;

    // 트랜잭션으로 상태 복구 및 포인트 회수
    await prisma.$transaction([
      prisma.stampBook.update({
        where: { id: stampBookId },
        data: {
          isConverted: false,
          convertedAt: null,
          status: 'completed',
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          totalPoint: {
            decrement: refundPoint,
          },
        },
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          stampBookId,
          point: -refundPoint,
          type: 'refunded',
          description: '스탬프 환전 취소',
        },
      }),
    ]);

    return res.success({ message: "환전 취소 완료", refundPoint });
  } catch (err) {
    next(err);
  }
};

//  [기능 6] 스탬프북 기간 연장
// - 사용 화면: [스탬프북 상세 화면 > 연장 버튼 클릭 시]
// - 진행 중인(active) 스탬프북만 1회 14일 연장 가능
// - 이미 연장된 경우 재연장 불가

export const extendStampBook = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stampBookId = parseInt(req.params.stampBookId, 10);

    const stampBook = await prisma.stampBook.findUnique({
      where: { id: stampBookId },
    });

    if (!stampBook) throw new StampbookNotFoundError();
    if (stampBook.userId !== userId)
      throw new ForbiddenError("해당 스탬프북에 대한 권한이 없습니다.");
    if (stampBook.status !== "active")
      throw new BadRequestError("진행 중인 스탬프북만 연장할 수 있습니다.");
    if (stampBook.extendedAt)
      throw new BadRequestError("이미 연장된 스탬프북입니다.");

    // 만료일 기준 14일 연장
    const newExpiresAt = new Date(stampBook.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + 14);

    const updated = await prisma.stampBook.update({
      where: { id: stampBookId },
      data: {
        expiresAt: newExpiresAt,
        extendedAt: new Date(),
      },
    });

    return res.success({
      message: "스탬프북이 14일 연장되었습니다.",
      newExpiresAt: updated.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

//   [기능 7] 소멸 임박 스탬프북 조회
// - 사용 화면: [마이페이지 or 홈 > “곧 만료돼요” 배너 영역]
// - 만료까지 7일 이하 남은 active 상태의 스탬프북 조회
// - 만료일 오름차순 정렬

export const getExpiringStampBooks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7); // 현재 기준 7일 후 날짜 계산

    const expiringBooks = await prisma.stampBook.findMany({
      where: {
        userId,
        status: 'active',
        expiresAt: {
          gte: today, // 오늘부터
          lte: oneWeekLater, // 7일 이내까지
        },
      },
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        expiresAt: 'asc', // 곧 만료 순 정렬
      },
    });

    return res.success(expiringBooks);
  } catch (err) {
    next(err);
  }
};
