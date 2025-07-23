import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafe.repository.js";
import { searchCafeRepository } from "../repositories/search.repository.js";
import { getDistanceInMeters } from "../utils/geo.js";

export const searchCafeService = {
  async findcafeList(
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
    const refinedX = Number(x);
    const refinedY = Number(y);
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

    const searchResults = await searchRepository.findCafeByInfos(
      whereConditions
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

    cafe.distance = getDistanceInMeters(cafe.latitude, cafe.longtitude, x, y);

    return cafeDetails;
  },
};
