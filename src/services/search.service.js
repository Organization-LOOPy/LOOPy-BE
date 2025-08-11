import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafe.repository.js";
import {
  cafeSearchRepository,
  cafeMapRepository,
} from "../repositories/search.repository.js";
import { getDistanceInMeters } from "../utils/geo.js";
import { parseFiltersFromQuery } from "../utils/parserFilterFromJson.js";
import { nlpSearch, preferenceTopK } from "./nlp.search.js";
import prisma from "../../prisma/client.js";

/** "서울 강남구 역삼동" → {region1:"서울", region2:"강남구", region3:"역삼동"} */
function parsePreferredArea(area) {
  if (!area || typeof area !== "string") return {};
  const parts = area.trim().split(/\s+/).filter(Boolean);
  return {
    region1DepthName: parts[0] || undefined,
    region2DepthName: parts[1] || undefined,
    region3DepthName: parts[2] || undefined,
  };
}

// 검색 쿼리 전처리
function normalizeQuery(s) {
  return (s ?? "").trim().replace(/"/g, "").normalize("NFC");
}
function pickTrueKeys(obj) {
  return Object.entries(obj ?? {})
    .filter(([, v]) => !!v)
    .map(([k]) => k);
}
function hasAnyKeys(o) {
  return !!o && Object.keys(o).length > 0;
}
// 지역 필터링 전처리
function buildRegionCondition(region1, region2, region3) {
  const cond = {};
  if (region1) cond.region1DepthName = region1.trim();
  if (region2) cond.region2DepthName = region2.trim();
  if (region3) cond.region3DepthName = region3.trim();
  return cond;
}

// 필터를 임베딩 질의로 변환(간단 키워드 뭉치)
function buildQueryFromFilters(storeFilters, takeOutFilters, menuFilters) {
  const s = pickTrueKeys(storeFilters);
  const t = pickTrueKeys(takeOutFilters);
  const m = pickTrueKeys(menuFilters);
  const tokens = [...s, ...t, ...m];
  return tokens.join(" ");
}

// 거리 순으로 정렬 (사용자 좌표는 항상 (x, y) 그대로 전달)
function applyDistanceAndSort(rows, x, y) {
  const withDistance = rows.map((cafe) => {
    const distance = getDistanceInMeters(
      parseFloat(cafe.latitude),
      parseFloat(cafe.longitude),
      parseFloat(y),
      parseFloat(x)
    );
    const isBookmarked =
      Array.isArray(cafe.bookmarkedBy) && cafe.bookmarkedBy.length > 0;
    return { ...cafe, distance, isBookmarked };
  });

  withDistance.sort((a, b) => {
    if (a.isBookmarked && !b.isBookmarked) return -1;
    if (!a.isBookmarked && b.isBookmarked) return 1;
    return a.distance - b.distance;
  });
  return withDistance;
}

// 사용자의 취향 지역
async function getUserPreferredAreaCond(userId) {
  if (!userId) return {};
  try {
    const pref = await prisma.userPreference.findUnique({
      where: { userId },
      select: { preferredArea: true },
    });
    const areaText = pref?.preferredArea;
    return parsePreferredArea(areaText);
  } catch (e) {
    logger.warn("getUserPreferredAreaCond failed:", e?.message);
    return {};
  }
}

export const cafeSearchService = {
  /**
   * 요구사항(개정):
   * 1) 처음 리스팅: preference 임베딩 Top-K 추천 (지역은 user_preference에 명시된 지역 사용)
   * 2) 검색 시: 지역 미지정이면 전국 단위, 지정 시 해당 지역만
   * 3) 검색 결과 없음 → Top-15 유사 카페(임베딩) 폴백 (검색어 없고 필터만 있어도 폴백)
   * 4) 항상 사용자 (x, y) 포함, 거리 기준 정렬
   */
  async findCafeList(
    cursor,
    x,
    y,
    searchQuery,
    storeFilters,
    takeOutFilters,
    menuFilters,
    region1,
    region2,
    region3,
    userId
  ) {
    const refinedX = parseFloat(x);
    const refinedY = parseFloat(y);
    const query = normalizeQuery(searchQuery);

    const selectedStoreFilters = pickTrueKeys(storeFilters);
    const selectedTakeOutFilters = pickTrueKeys(takeOutFilters);
    const selectedMenuFilters = pickTrueKeys(menuFilters);
    const explicitRegionCond = buildRegionCondition(region1, region2, region3);

    const whereConditions = { AND: [] };

    // 지역 조건
    if (hasAnyKeys(explicitRegionCond)) {
      whereConditions.AND.push(explicitRegionCond);
    }

    // 검색어 조건
    if (query) {
      whereConditions.AND.push({ name: { contains: query } });
    }

    // 스토어 필터
    selectedStoreFilters.forEach((f) =>
      whereConditions.AND.push({ storeFilters: { path: [f], equals: true } })
    );

    // 메뉴 필터
    selectedMenuFilters.forEach((f) =>
      whereConditions.AND.push({ menuFilters: { path: [f], equals: true } })
    );

    // 테이크아웃 필터
    selectedTakeOutFilters.forEach((f) =>
      whereConditions.AND.push({ takeOutFilters: { path: [f], equals: true } })
    );

    // 바로 RDB 조회
    const basic = await cafeSearchRepository.findCafeByInfos(
      whereConditions,
      cursor,
      userId
    );

    const cafes = basic?.cafes ?? [];
    return {
      fromNLP: false,
      message: null,
      data: applyDistanceAndSort(cafes, refinedX, refinedY),
      nextCursor: basic?.nextCursor ?? null,
      hasMore: basic?.hasMore ?? false,
    };
  },

  async getCafeDetails(cafe, x, y) {
    const photos = await cafeRepository.findPhotos(cafe.id);
    const cafeDetails = {
      id: cafe.id.toString(),
      name: cafe.name,
      address: cafe.address,
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
      yNum, // 사용자 위도
      xNum // 사용자 경도
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
      1: 30,
      2: 40,
      3: 50,
      4: 70,
      5: 85,
      6: 100,
      7: 110,
      8: 120,
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
