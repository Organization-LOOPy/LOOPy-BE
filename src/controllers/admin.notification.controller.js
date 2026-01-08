import pkg from '@prisma/client';
const { PrismaClient, NotificationType } = pkg;
const prisma = new PrismaClient();

// 고객 알림 메시지 전송
export const sendNotificationToCustomers = async (req, res, next) => {
  // 1) 입력값 검증
  const cafeIdRaw = req.params.cafeId;
  const cafeId = Number(cafeIdRaw);
  const { message } = req.body;

  try {
    if (!Number.isInteger(cafeId) || cafeId <= 0) {
      return res.fail('유효한 카페 ID가 아닙니다.', 400);
    }
    if (!message || message.trim() === '') {
      return res.fail('알림 메시지를 입력해주세요.', 400);
    }
    if (message.length > 500) {
      return res.fail('알림 메시지는 최대 500자까지 입력 가능합니다.', 400);
    }

    // 2) 권한 확인 (사장님인지)
    if (!req.user?.roles?.includes('OWNER')) {
      return res.fail('권한 없음', 403);
    }

    // 3) 카페 존재 + 소유권 확인
    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!cafe) {
      return res.fail('해당 카페를 찾을 수 없습니다.', 404);
    }

    if (Number(cafe.ownerId) !== Number(req.user.id)) {
      return res.fail('본인 카페에만 알림을 보낼 수 있습니다.', 403);
    }

    // 4) 알림 수신 허용 고객(이 카페 관련 사용자만 대상으로 하면 조인 사용)
    //    - 전 카페 공지라면 where: { allowKakaoAlert: true } 그대로 사용
    //    - 특정 카페 구독자/이용자에게만 보내려면 아래 예시 중 골라서 사용

    // (A) 전 카페 공지: 카카오 알림 허용한 모든 사용자
    // const users = await prisma.user.findMany({
    //   where: { allowKakaoAlert: true },
    //   select: { id: true },
    // });

    // (B) 이 카페 ‘즐겨찾기/구독(예: UserCafeNotification)’ 한 사용자만
    const users = await prisma.user.findMany({
      where: {
        cafeNotifications: { some: { cafeId } },
      },
      select: { id: true },
    });

    if (users.length === 0) {
      // 대상이 없어도 200으로 처리할지 404/204로 처리할지는 팀 정책에 맞게
      return res.success('발송 대상 사용자가 없습니다. (조건을 충족하는 유저 0명)');
    }

    const userIds = users.map((u) => u.id);

    // 5) 알림 기록 생성 (NotificationType enum 사용 권장)
    await prisma.notification.createMany({
      data: userIds.map((id) => ({
        userId: id,
        cafeId,
        type: NotificationType.cafe, // 문자열 'cafe' 대신 enum
        title: `${cafe.name} 사장님 메시지 알림`,
        content: message,
      })),
    });

    return res.success(`알림 메시지가 전송되었습니다. (대상 ${userIds.length}명)`, 200);
  } catch (err) {
    next(err);
  }
};
