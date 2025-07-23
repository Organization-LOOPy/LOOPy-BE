import prisma from "../../prisma/client.js";

export const getUserNotifications = async (req, res) => {
  const userId = req.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      isRead: true,
      createdAt: true,
      cafe: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const formatted = notifications.map((n) => ({
    notificationId: n.id,
    title: n.title,
    content: n.content,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt,
    cafe: n.cafe ?? null,
  }));

  return res.success({
    message: "알림 목록 조회 성공",
    data: formatted,
  });
};

export const getNotificationById = async (req, res) => {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.notificationId);
  
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        cafe: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  // 2. 읽음 처리 (읽지 않았을 때만)
  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // 3. 유형별 상세정보 동적 처리
  let detail = null;

  switch (notification.type) {
    case "challenge":
        if (!notification.cafeId) {
            detail = [];
            break;
        }

        detail = await prisma.challenge.findMany({
            where: {
            availableCafes: {
                some: {
                cafeId: notification.cafeId, // 해당 카페의 챌린지로 이동
                },
            },
            },
            select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            startDate: true,
            endDate: true,
            isActive: true,
            },
        });
        break;

    case "stamp":
      detail = await prisma.stampBook.findFirst({ // 해당 카페의 스탬프북으로 이동
        where: {
          userId,
          cafeId: notification.cafeId,
        },
        select: {
          id: true,
          currentCount: true,
          goalCount: true,
          rewardDetail: true,
          status: true,
          isCompleted: true,
          isConverted: true,
          expiresAt: true,
          lastVisitedAt: true,
        },
      });
      break;

    case "review":
        if (!notification.cafeId) {
          detail = null;
          break;
        }
      
        const cafe = await prisma.cafe.findUnique({
          where: { id: notification.cafeId }, // 카페 상세 페이지로 이동
          select: {
            id: true,
            name: true,
            address: true,
          },
        });
      
        detail = cafe;
        break;

        case "coupon":
          const rawUserCoupons = await prisma.$queryRaw`
            SELECT
              id AS couponId,
              user_id AS userId,
              coupon_template_id AS couponTemplateId,
              acquisition_type AS acquisitionType,
              status,
              issued_at AS issuedAt,
              expired_at AS expiredAt,
              used_at AS usedAt,
              cafeId
            FROM user_coupons
            WHERE user_id = ${userId}
              AND status = 'active'
          `;

          detail = rawUserCoupons.map(coupon => ({
            couponId: Number(coupon.couponId),
            userId: Number(coupon.userId),
            couponTemplateId: Number(coupon.couponTemplateId),
            acquisitionType: coupon.acquisitionType,
            status: coupon.status,
            issuedAt: coupon.issuedAt,
            expiredAt: coupon.expiredAt,
            usedAt: coupon.usedAt,
            cafeId: Number(coupon.cafeId),
          }));
          break;

        
        
    case "system":
      default:
        detail = {
          title: notification.title,
          content: notification.content,
        };
        break;
        
  }

  return res.success({
    message: "알림 상세 조회 성공",
    data: {
      notificationId: notification.id,
      title: notification.title,
      type: notification.type,
      createdAt: notification.createdAt,
      cafe: notification.cafe ?? null,
      detail,
    },
    });
}