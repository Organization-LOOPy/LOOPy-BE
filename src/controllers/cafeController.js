import logger from "../utils/logger.js";
import prisma from "../../prisma/client.js";
import { CafeNotFoundError } from "../errors/customErrors.js";
import { cafeService } from "../services/cafeService.js";

export const getCafe = async (req, res, next) => {
  try {
    const cafe = req.cafe;

    const cafeDetails = await cafeService.getCafeDetails(cafe, cafe.id);
    logger.debug(`카페 정보 조회 성공: ${cafeDetails.name}`);
    res.success(cafeDetails);
  } catch (err) {
    logger.error(`카페 정보 조회 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const getCafeStamp = async (req, res) => {};

export const getCafeCoupon = async (req, res) => {};

export const addCafeCoupon = async (req, res) => {};

export const getCafeReview = async (req, res) => {};
