export const successResponse = (data) => ({
    resultType: "SUCCESS",
    error: null,
    success: data,
  });
  
  export const errorResponse = (errorCode = "unknown", reason = "", data = null) => ({
    resultType: "FAIL",
    error: { errorCode, reason, data },
    success: null,
  });