import { logger } from "../utils/logger.js";
import {
  MissingUserCoordinate,
  MissingSearchQuery,
} from "../errors/customErrors.js";
import {
  cafeSearchService,
  mapSearchService,
} from "../services/search.service.js";

export const cafeSearch = async (req, res, next) => {
  try {
    const { x, y, searchQuery, cursor } = req.query;
    const { storeFilter, takeOutFilter, menuFilter, addressInfo } = req.body;

    //필수는 아님 -> 수정 필요
    if (!x || !y) {
      throw new MissingUserCoordinate();
    }
    if (!searchQuery) {
      throw new MissingSearchQuery();
    }

    const results = await cafeSearchService.findCafeList({
      cursor,
      x,
      y,
      searchQuery,
      storeFilters,
      takeOutFilters,
      menuFilters,
      region1: addressInfo.region_1depth_name,
      region2: addressInfo.region_2depth_name,
      region3: addressInfo.region_3depth_name,
    });

    logger.debug(`카페 검색 완료: ${results}`);
    return success(results);
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
