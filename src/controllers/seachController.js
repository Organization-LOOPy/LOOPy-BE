import { logger } from "../utils/logger.js";
import { MissingUserCoordinate } from "../errors/customErrors.js";
import { searchCafeService } from "../services/searchService.js";
export const cafeSearch = async (res, req, next) => {};

export const getCafeMapData = async (req, req, next) => {};

export const getRegion = async (res, req, next) => {};

//북마크 여부도 체크해야함, 해당 라우터 qa 필요
export const cafeDetail = async (res, req, next) => {
  try {
    const cafe = req.cafe;
    const { x, y } = req.params;

    if (!x && !y) {
      throw new MissingUserCoordinate();
    }

    const cafeDetails = await searchCafeService.getCafeDetails(cafe, x, y);

    logger.debug(`카페 검색 정보 조회 성공: ${cafeDetails.name}`);
    res.success(cafeDetails);
  } catch (err) {
    logger.error(`카페 검색 정보 조회 중 오류 발생: ${err.message}`);
    next(err);
  }
};
