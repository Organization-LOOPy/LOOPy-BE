import prisma from "../../prisma/client.js";

export const verifyStamp = async (req, res, next) => {
  const userId = parseInt(req.user.userId);
  const cafeId = parseInt(req.params.cafeId);

  const activeStampBook = await prisma.stampBook.findFirst({
    where: {
      userId,
      cafeId,
      status: "active",
    },
  });

  if (!activeStampBook) {
    return res.status(403).error({
      errorCode: "NO_ACTIVE_STAMP",
      reason: "스탬프 적립을 시작하고 리뷰를 작성해보세요!",
    });
  }

  next();
};