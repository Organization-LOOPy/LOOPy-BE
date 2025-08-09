import { logger } from "../utils/logger.js";
import { MissingUserCoordinate } from "../errors/customErrors.js";
import {
  cafeSearchService,
  mapSearchService,
} from "../services/search.service.js";

export const cafeSearch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { x, y, searchQuery, cursor } = req.query;
    const { storeFilters, takeOutFilters, menuFilters, addressInfo } = req.body;

    // 필수는 아님 -> 수정 필요
    if (!x || !y) {
      throw new MissingUserCoordinate();
    }

    const results = await cafeSearchService.findCafeList(
      cursor, // 이미 문자열
      x,
      y,
      searchQuery,
      storeFilters,
      takeOutFilters,
      menuFilters,
      addressInfo?.region_1depth_name,
      addressInfo?.region_2depth_name,
      addressInfo?.region_3depth_name,
      userId
    );

    logger.debug(`카페 검색 완료: ${JSON.stringify(results)}`);
    res.success(results);
  } catch (err) {
    logger.error(`카페 검색 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const getCafeMapData = async (req, res, next) => {
  try {
    const { x, y, store, menu, takeout, region1, region2, region3, zoom } =
      req.query;
    const userId = req.user.id;

    if (!x || !y) {
      throw new MissingUserCoordinate();
    }

    if (!zoom) {
      throw new Error("줌 레벨이 필요합니다.");
    }

    const results = await mapSearchService.searchCafesOnMap({
      x,
      y,
      storeFilters: store,
      menuFilters: menu,
      takeOutFilters: takeout,
      region1,
      region2,
      region3,
      zoom,
      userId,
    });

    logger.debug(`카페 검색 완료: ${results.totalCount}개 (줌 레벨: ${zoom})`);
    res.success(results);
  } catch (err) {
    logger.error(`카페 검색 중 오류 발생: ${err.message}`);
    next(err);
  }
};

export const cafeDetail = async (req, res, next) => {
  try {
    const cafe = req.cafe;
    const { x, y } = req.query;

    if (!x && !y) {
      throw new MissingUserCoordinate();
    }

    const cafeDetails = await cafeSearchService.getCafeDetails(cafe, x, y);

    logger.debug(`카페 검색 정보 조회 성공: ${cafeDetails.name}`);
    res.success(cafeDetails);
  } catch (err) {
    logger.error(`카페 검색 정보 조회 중 오류 발생: ${err.message}`);
    next(err);
  }
};
