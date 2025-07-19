export const validateReview = (req, res, next) => {
    const { title, content } = req.body;
  
    if (!title || !content) {
      return res.error({
        errorCode: "INVALID_REVIEW",
        reason: "제목과 본문을 모두 입력해주세요.",
      });
    }
  
    next();
  };
  