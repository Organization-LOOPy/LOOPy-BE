export const responseHandler = (req, res, next) => {
  res.success = (data) => {
    return res.json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  };

  res.error = ({
    errorCode = "UNKNOWN",
    reason = "알 수 없는 오류",
    data = null,
  }) => {
    return res.json({
      resultType: "FAIL",
      error: { errorCode, reason, data },
      success: null,
    });
  };

  res.fail = (reason, statusCode = 400) => {
    return res.status(statusCode).json({
      resultType: "FAIL",
      error: { errorCode: "FAIL", reason, data: null },
      success: null,
    });
  };

  next();
};

export default responseHandler;