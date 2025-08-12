
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const attachCafeId = () => async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role ?? req.user?.currentRole ?? req.user?.roles?.[0];

    if (!userId) {
      return res.error({ errorCode: 'UNAUTHORIZED', reason: '인증 필요', data: null }, 401);
    }

    if (role !== 'OWNER') {
      // 오너 전용 영역이면 OWNER만 허용. 필요 시 직원/관리자 로직 추가 가능
      return res.error({ errorCode: 'FORBIDDEN', reason: 'OWNER 권한 필요', data: null }, 403);
    }

    const cafe = await prisma.cafe.findUnique({
      where: { ownerId: Number(userId) },
      select: { id: true },
    });

    if (!cafe?.id) {
      return res.error({ errorCode: 'CAFE_REQUIRED', reason: '등록된 카페가 없습니다.', data: null }, 403);
    }

    req.user.cafeId = Number(cafe.id);
    next();
  } catch (e) {
    next(e);
  }
};

export default attachCafeId;
