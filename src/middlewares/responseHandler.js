module.exports.responseHelper = (req, res, next) => {
  res.success = (data) => {
    return res.json({
      resultType: "SUCCESS",
      error: null,
      success: data,
    });
  };

  res.error = ({ errorCode = "UNKNOWN", reason = "알 수 없는 오류", data = null }) => {
    return res.json({
      resultType: "FAIL",
      error: { errorCode, reason, data },
      success: null,
    });
  };

  next();
};