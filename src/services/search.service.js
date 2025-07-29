import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafe.repository.js";
import {
  cafeSearchRepository,
  cafeMapRepository,
} from "../repositories/search.repository.js";
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
  getFilterMappings() {
    return {
      store: {
        single_seat: "1인석",
        group_seat: "단체석",
        laptop_seat: "노트북석",
        pet_friendly: "애견 동반",
        reservation: "예약 가능",
        parking: "주차 가능",
        "24hours": "24시간 운영",
        wifi: "와이파이 제공",
      },
      takeOut: {
        package_discount: "포장 할인",
        tumbler_discount: "텀블러 할인",
      },
      menu: {
        vegan: "비건",
        decaf: "디카페인",
        gluten_free: "글루텐프리",
        sugar_free: "저당/무가당",
      },
    };
  },

  // 영문 키를 한글로 변환하는 함수
  convertFiltersToKorean(filters, type) {
    const mappings = this.getFilterMappings();
    const converted = {};

    Object.keys(filters).forEach((englishKey) => {
      const koreanKey = mappings[type][englishKey];
      if (koreanKey) {
        converted[koreanKey] = filters[englishKey];
      }
    });

    return converted;
  },

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
    zoom,
  }) {
    const refinedX = parseFloat(x);
    const refinedY = parseFloat(y);
    const zoomConfig = this.getZoomConfig(zoom);

    const parsedStoreFilters = parseFiltersFromQuery(storeFilters);
    const parsedMenuFilters = parseFiltersFromQuery(menuFilters);
    const parsedTakeOutFilters = parseFiltersFromQuery(takeOutFilters);

    // 영문 키를 한글로 변환
    const convertedStoreFilters = this.convertFiltersToKorean(
      parsedStoreFilters,
      "store"
    );
    const convertedMenuFilters = this.convertFiltersToKorean(
      parsedMenuFilters,
      "menu"
    );
    const convertedTakeOutFilters = this.convertFiltersToKorean(
      parsedTakeOutFilters,
      "takeOut"
    );

    const refinedRegion1 = region1?.trim() || null;
    const refinedRegion2 = region2?.trim() || null;
    const refinedRegion3 = region3?.trim() || null;

    // 대략적인 위경도 범위 계산 (DB 쿼리 최적화)
    const latRange = zoomConfig.radius / 111000; // 1도 ≈ 111km
    const lonRange =
      zoomConfig.radius / (111000 * Math.cos((refinedY * Math.PI) / 180));

    // 검색 조건 구성
    const searchParams = {
      centerX: refinedX,
      centerY: refinedY,
      latRange,
      lonRange,
      region1: refinedRegion1,
      region2: refinedRegion2,
      region3: refinedRegion3,
      storeFilters: convertedStoreFilters, // 변환된 필터 사용
      menuFilters: convertedMenuFilters, // 변환된 필터 사용
      takeOutFilters: convertedTakeOutFilters, // 변환된 필터 사용
      userId,
    };

    // Repository에서 카페 데이터 조회
    const allCafes = await cafeMapRepository.findCafesInArea(searchParams);

    // 정확한 거리 계산 및 필터링
    const cafesWithDistance = allCafes.map((cafe) => ({
      ...cafe,
      distance: getDistanceInMeters(
        refinedY,
        refinedX,
        cafe.latitude,
        cafe.longitude
      ),
    }));

    // 반경 내의 카페만 필터링
    const cafesInRadius = cafesWithDistance.filter(
      (cafe) => cafe.distance <= zoomConfig.radius
    );

    // 거리순으로 정렬
    cafesInRadius.sort((a, b) => a.distance - b.distance);

    // 줌 레벨에 따른 최대 개수 제한
    const limitedCafes = cafesInRadius.slice(0, zoomConfig.maxResults);

    // distance 필드는 응답에서 제거 (필요시 유지 가능)
    const finalCafes = limitedCafes.map(({ distance, ...cafe }) => cafe);

    return {
      cafes: finalCafes,
      totalCount: finalCafes.length,
      searchRadius: zoomConfig.radius,
      zoomLevel: zoom,
      center: { x: refinedX, y: refinedY },
    };
  },

  getZoomConfig(zoomLevel) {
    // 카카오 지도 축척 공식: 3레벨에서 1px = 1m 기준
    // scale = 1 / Math.pow(2, level - 3)
    const scale = 1 / Math.pow(2, zoomLevel - 3);

    // 지도 화면 크기를 기준으로 적절한 반경 계산
    // 일반적인 지도 컨테이너 크기 (가로 800px 기준)
    const mapWidth = 800; // px

    // 화면 너비의 절반 정도를 검색 반경으로 설정
    const radiusInPixels = mapWidth * 0.4; // 화면 너비의 40%

    // 픽셀을 미터로 변환
    const radiusInMeters = Math.round(radiusInPixels / scale);

    // 최소/최대 반경 제한
    const minRadius = 100; // 최소 100m
    const maxRadius = 10000; // 최대 10km
    const finalRadius = Math.max(
      minRadius,
      Math.min(maxRadius, radiusInMeters)
    );

    // 줌 레벨별 최대 결과 수 설정
    const maxResultsConfig = {
      1: 30, // 가장 확대된 상태
      2: 40,
      3: 50,
      4: 70,
      5: 85,
      6: 100, // 가장 축소된 상태
    };

    const maxResults = maxResultsConfig[zoomLevel] || 100;

    return {
      maxResults,
      radius: finalRadius,
      scale: scale,
      calculatedRadius: radiusInMeters, // 디버깅용
    };
  },
};
