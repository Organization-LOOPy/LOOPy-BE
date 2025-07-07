export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);
  
    res.status(err.statusCode || 500).json({
      resultType: "FAIL",
      error: {
        errorCode: err.errorCode || "unknown",
        reason: err.reason || err.message || null,
        data: err.data || null,
      },
      success: null,
    });
  };