import CustomError from "../errors/customErrors";

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof CustomError) {
    return res.status(400).error({
      errorCode: err.errorCode,
      reason: err.message,
      data: err.data || null,
    });
  }

  console.error("🔥 Unhandled Error:", err);

  return res.status(500).error({
    errorCode: "UNKNOWN",
    reason: err.message || "서버 내부 오류가 발생했습니다.",
    data: null,
  });
};
