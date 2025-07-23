import { CustomError } from "../errors/customErrors.js";

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      errorCode: err.errorCode,
      reason: err.message,
      data: err.data || null,
    });
  }

  return res.status(500).json({
    errorCode: "UNKNOWN",
    reason: err.message || "서버 내부 오류가 발생했습니다.",
    data: null,
  });
};
