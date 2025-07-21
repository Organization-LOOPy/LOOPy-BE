//review.controller.js

import prisma from "../../prisma/client.js";

export const createReview = async (req, res, next) => {
    try {
      const { title, content } = req.body;
      const { cafeId } = req.params;
      const userId = parseInt(req.user.userId);
      const images = [];
      //const images = req.files?.map(file => file.location) || []; // S3 업로드 후 이미지 URL
      //추후 이미지 업로드 기능 추가 예정
    
      // 리뷰 작성 시 필수 값 검증
      if (!title || title.length < 20) {
        return res.error({
          errorCode: "INVALID_TITLE",
          reason: "제목은 최소 20자 이상이어야 합니다.",
        });
      }

      if (!content || content.length < 500) {
        return res.error({
          errorCode: "INVALID_CONTENT",
          reason: "본문은 최소 500자 이상이어야 합니다.",
        });
      }
      // 리뷰 저장
      const review = await prisma.review.create({
        data: {
          title,
          content,
          cafeId: parseInt(cafeId),
          userId,
          images, // JSON 타입 (string[] 형태로 저장)
        },
      });
  
      return res.success({
        message: "리뷰 작성 성공",
        review,
      });
    } catch (err) {
      next(err);
    }
  };
  
export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { title, content } = req.body;
    const userId = parseInt(req.user.userId);

    // 리뷰 존재 여부
    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) }
    });

    if (!review) {
      return res.error({
        errorCode: "REVIEW_NOT_FOUND",
        reason: "존재하지 않는 리뷰입니다."
      });
    }

    // 작성자 본인 확인
    if (review.userId !== userId) {
      return res.error({
        errorCode: "FORBIDDEN",
        reason: "본인의 리뷰만 수정할 수 있습니다."
      });
    }

    // 업데이트
    const updatedReview = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        title,
        content,
        updatedAt: new Date()
      }
    });

    // 응답
    return res.success({
      message: "리뷰 수정 성공",
      review: updatedReview
    });
  } catch (err) {
    next(err);
  }
};
  
  export const deleteReview = async (req, res, next) => {
    try {
      const { reviewId } = req.params;
      const userId = parseInt(req.user.userId);
  
      // 리뷰 존재 여부
      const review = await prisma.review.findUnique({
        where: { id: parseInt(reviewId) },
      });
  
      if (!review) {
        return res.error({
          errorCode: "REVIEW_NOT_FOUND",
          reason: "존재하지 않는 리뷰입니다.",
        });
      }
  
      // 작성자 본인 확인
      if (review.userId !== userId) {
        return res.error({
          errorCode: "FORBIDDEN",
          reason: "본인의 리뷰만 삭제할 수 있습니다.",
        });
      }
  
      // 삭제 
      await prisma.review.delete({
        where: { id: parseInt(reviewId) },
      });
  
      // 응답
      return res.success({
        message: "리뷰 삭제 성공!",
      });
    } catch (err) {
      next(err);
    }
  };
  
  
  export const getMyReviews = async (req, res, next) => {
    try {
      const userId = parseInt(req.user.userId);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const [total, reviews] = await Promise.all([
        prisma.review.count({ where: { userId } }),
        prisma.review.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            cafe: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
      ]);
  
      const formatted = reviews.map((review) => ({
        reviewId: review.id,
        cafeId: review.cafe.id,
        cafeName: review.cafe.name,
        title: review.title,
        content: review.content,
        images: review.images || [],
        createdAt: review.createdAt
      }));
  
      return res.success({
        message: '내가 쓴 리뷰 목록 조회 성공',
        data: formatted,
        pagination: {
          page,
          limit,
          total
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  