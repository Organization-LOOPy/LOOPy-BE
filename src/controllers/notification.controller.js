// notification.controller.js
import prisma from "../../prisma/client.js";
import { NotificationNotFoundError } from "../errors/customErrors.js";


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
      cafeId: true,           
    },
  });

  const formatted = notifications.map((n) => {
    let parsedContent = n.content;
    try {
      parsedContent = JSON.parse(n.content);
    } catch (e) {}

    return {
      notificationId: n.id,
      cafeId: n.cafeId ?? null,  
      cafeName: null,            
      title: n.title,
      content: parsedContent,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  });

  return res.success({
    message: "알림 목록 조회 성공",
    data: formatted,
  });
};

export const getUserNotificationsWithCafeInfo = async (req, res) => {
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
      cafeId: true,
      cafe: {
        select: {
          name: true,
          photos: {
            where: { displayOrder: 0 },
            select: { photoUrl: true },
            take: 1,
          },
        },
      },
    },
  });

  const formatted = notifications.map((n) => {
    let parsedContent = n.content;
    try {
      parsedContent = JSON.parse(n.content);
    } catch (e) {}

    return {
      notificationId: n.id,
      cafeId: n.cafeId ?? null,
      cafeName: n.cafe?.name ?? null,
      cafeMainImage: n.cafe?.photos?.[0]?.photoUrl ?? null,
      title: n.title,
      content: parsedContent,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  });

  return res.success({
    message: "알림 목록 조회 성공",
    data: formatted,
  });
};

export const getNotificationById = async (req, res) => {
  const userId = req.user.id;
  const notificationId = parseInt(req.params.notificationId, 10);

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      type: true,
      createdAt: true,
      isRead: true,
      cafeId: true,              // ✅ 리레이션 대신 스칼라만
    },
  });

  if (!notification) {
    throw new NotificationNotFoundError(notificationId);
  }

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  return res.success({
    message: "알림 상세 조회 성공",
    data: {
      notificationId: notification.id,
      type: notification.type,
      createdAt: notification.createdAt,
      cafe: null,               
    },
  });
};
