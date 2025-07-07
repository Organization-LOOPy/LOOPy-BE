import { successResponse, errorResponse } from "../utils/response.js";

export const responseHandler = (req, res, next) => {
  res.success = (data) => res.json(successResponse(data));
  res.error = (args) => res.json(errorResponse(args.errorCode, args.reason, args.data));
  next();
};