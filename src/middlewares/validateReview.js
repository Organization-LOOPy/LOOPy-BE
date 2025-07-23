import { MissingReviewFieldsError } from "../errors/customErrors.js";

export const validateReview = (req, res, next) => {
  const { title, content } = req.body;

  const missing = [];
  if (!title) missing.push("title");
  if (!content) missing.push("content");

  if (missing.length > 0) {
    return next(new MissingReviewFieldsError(missing));
  }

  next();
};
