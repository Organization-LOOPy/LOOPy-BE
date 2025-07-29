import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafe.repository.js";
import { cafeSearchRepository } from "../repositories/search.repository.js";
import { getDistanceInMeters } from "../utils/geo.js";
import { parseFiltersFromQuery } from "../utils/parserFilterFromJson.js";

export const cafeSearchService = {
  async findcafeList(
    cursor,
    x,
    y,
    searchQuery,
    storeFilters,
    takeOutFilters,
    menuFilters,
    region1,
    region2,
    region3
  ) {
    const refinedX = parseFloat(x);
    const refinedY = parseFloat(y);
    const query = (searchQuery ?? "").trim();

    const selectedStoreFilters = Object.entries(storeFilters ?? {})
      .filter(([_, v]) => v)
      .map(([k]) => k);

    const selectedTakeOutFilters = Object.entries(takeOutFilters ?? {})
      .filter(([_, v]) => v)
      .map(([k]) => k);

    const selectedMenuFilters = Object.entries(menuFilters ?? {})
      .filter(([_, v]) => v)
      .map(([k]) => k);

    const refinedRegion1 = region1?.trim() || null;
    const refinedRegion2 = region2?.trim() || null;
    const refinedRegion3 = region3?.trim() || null;

    const whereConditions = {
      AND: [
        // 지역 조건
        {
          region1: refinedRegion1,
          region2: refinedRegion2,
          region3: refinedRegion3,
        },
        // 쿼리 조건
        query ? { name: { contains: query } } : {},
      ],
    };

    if (selectedStoreFilters && selectedStoreFilters.length > 0) {
      selectedStoreFilters.forEach((filter) => {
        whereConditions.AND.push({
          storeFilters: {
            path: [filter],
            equals: true,
          },
        });
      });
    }

    if (selectedMenuFilters && selectedMenuFilters.length > 0) {
      selectedMenuFilters.forEach((filter) => {
        whereConditions.AND.push({
          menuFilters: {
            path: [filter],
            equals: true,
          },
        });
      });
    }

    if (selectedTakeOutFilters && selectedTakeOutFilters.length > 0) {
      selectedTakeOutFilters.forEach((filter) => {
        whereConditions.AND.push({
          takeOutFilters: {
            path: [filter],
            equals: true,
          },
        });
      });
    }

    const searchResults = await cafeSearchRepository.findCafeByInfos(
      whereConditions,
      cursor
    );

    if (searchResults.length > 0) {
      const cafesWithDistance = searchResults.map((cafe) => {
        const distance = getDistanceInMeters(
          cafe.latitude,
          cafe.longitude,
          refinedX,
          refinedY
        );
        return {
          ...cafe,
          distance: distance,
        };
      });

      const sortedCafes = cafesWithDistance.sort(
        (a, b) => a.distance - b.distance
      );

      return { fromNLP: false, data: sortedCafes };
    }

    return { fromNLP: true, data: [] };
    //nlp 기능 확장이후 추가 예정
    /*
    if (searchResults.length > 0) {
      return { fromNLP: false, data: searchResults };
    }

    //NLP 서버에 query 보내서 cafeId 리스트 받기
    let nlpCafeIds = [];
    try {
      const { data: nlpResult } = await axios.post("http://jusou/search", {
        query,
      });
      nlpCafeIds = nlpResult.cafeIds || [];
    } catch (err) {
      console.error("NLP 검색 서버 에러:", err.message);
      return { fromNLP: true, data: [] };
    }

    if (nlpCafeIds.length === 0) {
      return { fromNLP: true, data: [] };
    }

    //카페 ID 리스트로 DB에서 상세 정보 조회
    const cafesByNlp = await searchCafeRepository.findCafesByIds(nlpCafeIds);

    //거리 구하기
    const cafesWithDistance = cafesByNlp.map((cafe) => {
      const distance = getDistanceInMeters(
        cafe.latitude,
        cafe.longitude,
        refinedX,
        refinedY
      );
      return {
        ...cafe,
        distance: distance,
      };
    });

    const sortedCafes = cafesWithDistance.sort(
      (a, b) => a.distance - b.distance
    );

    return { fromNLP: true, data: sortedCafes }; */
  },

  async getCafeDetails(cafe, x, y) {
    const photos = await cafeRepository.findPhotos(cafe.id);
    const cafeDetails = {
      id: cafe.id.toString(),
      name: cafe.name,
      adress: cafe.adress,
      keywords: cafe.keywords,
      photos: photos.map((photo) => ({
        id: photo.id.toString(),
        url: photo.photoUrl,
        displayOrder: photo.displayOrder,
      })),
    };

    const xNum = parseFloat(x);
    const yNum = parseFloat(y);
    cafeDetails.distance = getDistanceInMeters(
      parseFloat(cafe.latitude),
      parseFloat(cafe.longitude),
      yNum,
      xNum
    );

    return cafeDetails;
  },
};

export const mapSearchService = {
  async searchCafesOnMap({
    x,
    y,
    storeFilters,
    menuFilters,
    takeOutFilters,
    region1,
    region2,
    region3,
    userId,
  }) {
    const refinedX = parseFloat(x);
    const refinedY = parseFloat(y);

    const parsedStoreFilters = parseFiltersFromQuery(storeFilters);
    const parsedMenuFilters = parseFiltersFromQuery(menuFilters);
    const parsedTakeOutFilters = parseFiltersFromQuery(takeOutFilters);

    const refinedRegion1 = region1?.trim() || null;
    const refinedRegion2 = region2?.trim() || null;
    const refinedRegion3 = region3?.trim() || null;

    const whereConditions = {
      AND: [
        { status: "active" },
        ...(refinedRegion1 ? [{ region1DepthName: refinedRegion1 }] : []),
        ...(refinedRegion2 ? [{ region2DepthName: refinedRegion2 }] : []),
      ],
    };

    //필터조건 추가
    Object.keys(parsedStoreFilters).forEach((filter) => {
      whereConditions.AND.push({
        storeFilters: {
          path: [filter],
          equals: true,
        },
      });
    });

    Object.keys(parsedMenuFilters).forEach((filter) => {
      whereConditions.AND.push({
        menuFilters: {
          path: [filter],
          equals: true,
        },
      });
    });

    Object.keys(parsedTakeOutFilters).forEach((filter) => {
      whereConditions.AND.push({
        takeOutFilters: {
          path: [filter],
          equals: true,
        },
      });
    });

    const cafes = await cafeSearchRepository.findCafeWithBookmarks(
      whereConditions,
      userId
    );

    return cafes;
  },
};
