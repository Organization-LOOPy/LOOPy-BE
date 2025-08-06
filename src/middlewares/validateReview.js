import { InvalidReviewContentError, MissingReviewFieldsError } from "../errors/customErrors.js";

export const validateReview = (req, res, next) => {
  const { content } = req.body;

  const missing = [];
  if (!content) missing.push("content");

  if (missing.length > 0) {
    return next(new MissingReviewFieldsError(missing));
  }

  if (content.length > 500) {
    return next(new InvalidReviewContentError(content));
  }

  next();
};
