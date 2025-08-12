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
      cafe: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const formatted = notifications.map((n) => {
    let parsedContent = n.content;

    try {
      parsedContent = JSON.parse(n.content);
    } catch (e) {
      // content가 JSON이 아닐 경우 그대로 사용
    }

    return {
      notificationId: n.id,
      cafeId: n.cafe?.id ?? null,
      cafeName: n.cafe?.name ?? null,
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
  const notificationId = parseInt(req.params.notificationId);

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      cafe: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
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
      cafe: notification.cafe ?? null,
    },
  });
};
