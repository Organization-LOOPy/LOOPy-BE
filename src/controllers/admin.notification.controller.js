import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 고객 알림 메시지 전송
export const sendNotificationToCustomers = async (req, res, next) => {
  const cafeId = Number(req.params.cafeId);
  const { message } = req.body;

  try {
    // 유효성 검사
    if (!message || message.trim() === '') {
      return res.fail('알림 메시지를 입력해주세요.', 400);
    }

    if (message.length > 500) {
      return res.fail('알림 메시지는 최대 500자까지 입력 가능합니다.', 400);
    }

    // 해당 카페의 사용자 조회
    const users = await prisma.user.findMany({
      where: { allowKakaoAlert: true },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);

    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { name: true },
    });
    
    if (!cafe) {
      return res.fail('해당 카페를 찾을 수 없습니다.', 404);
    }

    // 알림 기록 생성
    await prisma.notification.createMany({
      data: userIds.map((id) => ({
        userId: id,
        cafeId,
        type: 'cafe',
        title: `${cafe.name} 사장님 메시지 알림`,
        content: message,
      })),
    });

    return res.success('알림 메시지가 전송되었습니다.');
  } catch (err) {
    next(err);
  }
};
