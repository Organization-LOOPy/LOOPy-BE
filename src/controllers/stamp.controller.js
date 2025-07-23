import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

import { StampbookNotFoundError } from "../errors/customErrors.js";

// 1. 전체 스탬프북 조회
export const getMyStampBooks = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const stampBooks = await prisma.stampBook.findMany({
      where: { userId },
      include: {
        cafe: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const response = stampBooks.map((sb) => ({
      id: sb.id,
      cafe: {
        id: sb.cafe.id,
        name: sb.cafe.name,
        address: sb.cafe.address,
      },
      currentStampCount: sb.currentStampCount,
      totalStampCount: sb.totalStampCount,
      status: sb.status,
      expiredAt: sb.expiredAt,
    }));

    return res.success(response);
  } catch (err) {
    next(err);
  }
};

// 2. 스탬프북 상세 조회
export const getStampBookDetail = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const stampBookId = parseInt(req.params.stampBookId);
  
      const stampBook = await prisma.stampBook.findFirst({
        where: {
          id: stampBookId,
          userId,
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
              stampedAt: 'asc',
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

  export const addStamp = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const stampBookId = parseInt(req.params.stampBookId, 10);
      const { cafeId, method } = req.body;
  
      // 유효성 검사
      if (!['QR', 'MANUAL'].includes(method)) {
        return res.error(400, '적립 방식이 올바르지 않습니다.');
      }
  
      // 스탬프북 존재 및 본인 소유 확인
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
  
      // 이미 목표 수량을 채웠는지 확인
      const currentCount = stampBook.stamps.length;
      const goalCount = stampBook.goalStampCount;
  
      if (currentCount >= goalCount) {
        return res.error(400, '이미 모든 도장이 적립되었습니다.');
      }
  
      // 도장 1개 적립
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

  // 스탬프 환전
  export const convertStampToPoint = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const stampBookId = parseInt(req.params.stampBookId, 10);
  
      const stampBook = await prisma.stampBook.findUnique({
        where: { id: stampBookId },
        include: { stamps: true },
      });
  
      if (!stampBook) throw new StampbookNotFoundError('존재하지 않는 스탬프북입니다.');
      if (stampBook.userId !== userId) throw new ForbiddenError('본인의 스탬프북만 환전할 수 있습니다.');
      if (stampBook.status !== 'completed') throw new BadRequestError('완료된 스탬프북만 환전할 수 있습니다.');
      if (stampBook.isConverted || stampBook.convertedAt) throw new BadRequestError('이미 환전된 스탬프북입니다.');
  
      const stampCount = stampBook.stamps.length;
      if (stampCount === 0) throw new BadRequestError('환전 가능한 스탬프가 없습니다.');
  
      const pointAmount = stampCount * 100;
  
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