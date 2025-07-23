import { logger } from "../utils/logger.js";
import {
  MissingUserCoordinate,
  MissingSearchQuery,
} from "../errors/customErrors.js";
import { searchCafeService } from "../services/searchService.js";

export const cafeSearch = async (res, req, next) => {
  try {
    const { x, y, searchQuery } = req.query;
    const { storeFilter, takeOutFilter, menuFilter, addressInfo } = req.body;

    if (!x || !y) {
      throw new MissingUserCoordinate();
    }
    if (!searchQuery) {
      throw new MissingSearchQuery();
    }

    const results = await cafeService.findCafes({
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
/*return {
        id: place.id,
        place_name: place.place_name,
        address_name: place.address_name,
        road_address_name: place.road_address_name,
        x: place.x,
        y: place.y,
        region_1depth_name: addressParts[0] ?? "",
        region_2depth_name: addressParts[1] ?? "",
        region_3depth_name: addressParts[2] ?? "",
*/

export const getCafeMapData = async (res, req, next) => {
  try {
    const { x, y, searchQuery } = req.query;
    const { storeFilter, takeOutFilter, menuFilter } = req.body;
  } catch (err) {
    logger.error(`카페 검색 중 오류 발생: ${err.message}`);
    next(err);
  }
};

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
