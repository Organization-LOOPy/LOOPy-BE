import prisma from "../../prisma/client.js";
import { NoActiveStampError } from "../errors/customErrors.js";

export const verifyStamp = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cafeId = parseInt(req.params.cafeId);

    // 1. 스탬프북이 존재하는지
    const stampBook = await prisma.stampBook.findFirst({
      where: {
        userId,
        cafeId,
        status: 'active',
      },
    });

    // 없으면 인증 실패
    if (!stampBook) {
      return next(new NotAuthenticatedError());
    }
    
    // 2. 스탬프가 적어도 1개 이상 있는지 확인
    const stamps = await prisma.stamp.findMany({
      where: {
        stampBookId: stampBook.id,
      },
    });

    if (stamps.length === 0) {
      return next(new NoActiveStampError(userId, cafeId));
    }

    next();
  } catch (err) {
    next(err); // 예외 위임
  }
};
