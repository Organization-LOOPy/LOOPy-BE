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
  if (region1) cond.region1DepthName = region1.trim(); // camelCase
  if (region2) cond.region2DepthName = region2.trim(); // camelCase
  if (region3) cond.region3DepthName = region3.trim(); // camelCase
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

function applyExplicitFiltersToRows(
  rows,
  selectedStoreFilters,
  selectedMenuFilters,
  selectedTakeOutFilters
) {
  if (
    selectedStoreFilters.length === 0 &&
    selectedMenuFilters.length === 0 &&
    selectedTakeOutFilters.length === 0
  )
    return rows;

  const hasAll = (obj, keys) =>
    keys.every((k) => obj?.[k] === true || obj?.[k]?.equals === true);

  return rows.filter((c) => {
    const okStore = hasAll(c.storeFilters ?? {}, selectedStoreFilters);
    const okMenu = hasAll(c.menuFilters ?? {}, selectedMenuFilters);
    const okTake = hasAll(c.takeOutFilters ?? {}, selectedTakeOutFilters);
    return okStore && okMenu && okTake;
  });
}

export const cafeSearchService = {
  /**
   * 요구사항:
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
    // x, y 필수
    const refinedX = parseFloat(x);
    const refinedY = parseFloat(y);

    const query = normalizeQuery(searchQuery);

    // 필터 매핑 함수들 추가
    const getFilterMappings = () => {
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
    };

    const convertFiltersToKorean = (filters, type) => {
      const mappings = getFilterMappings();
      const converted = {};
      Object.keys(filters || {}).forEach((englishKey) => {
        const koreanKey = mappings[type][englishKey];
        if (koreanKey) {
          converted[koreanKey] = filters[englishKey];
        }
      });
      return converted;
    };

    // 요청에서 보낸 필터 키들만 응답에 포함하는 함수
    const filterResponseData = (cafeData) => {
      return cafeData.map((cafe) => {
        const filteredCafe = { ...cafe };

        // 요청에서 보낸 storeFilters 키들만 포함
        if (storeFilters && Object.keys(storeFilters).length > 0) {
          const filteredStoreFilters = {};
          Object.keys(storeFilters).forEach((englishKey) => {
            const mappings = getFilterMappings();
            const koreanKey = mappings.store[englishKey];
            if (
              koreanKey &&
              cafe.storeFilters &&
              cafe.storeFilters[koreanKey] !== undefined
            ) {
              filteredStoreFilters[koreanKey] = cafe.storeFilters[koreanKey];
            }
          });
          filteredCafe.storeFilters = filteredStoreFilters;
        } else {
          filteredCafe.storeFilters = {};
        }

        // 요청에서 보낸 takeOutFilters 키들만 포함
        if (takeOutFilters && Object.keys(takeOutFilters).length > 0) {
          const filteredTakeOutFilters = {};
          Object.keys(takeOutFilters).forEach((englishKey) => {
            const mappings = getFilterMappings();
            const koreanKey = mappings.takeOut[englishKey];
            if (
              koreanKey &&
              cafe.takeOutFilters &&
              cafe.takeOutFilters[koreanKey] !== undefined
            ) {
              filteredTakeOutFilters[koreanKey] =
                cafe.takeOutFilters[koreanKey];
            }
          });
          filteredCafe.takeOutFilters = filteredTakeOutFilters;
        } else {
          filteredCafe.takeOutFilters = {};
        }

        // 요청에서 보낸 menuFilters 키들만 포함
        if (menuFilters && Object.keys(menuFilters).length > 0) {
          const filteredMenuFilters = {};
          Object.keys(menuFilters).forEach((englishKey) => {
            const mappings = getFilterMappings();
            const koreanKey = mappings.menu[englishKey];
            if (
              koreanKey &&
              cafe.menuFilters &&
              cafe.menuFilters[koreanKey] !== undefined
            ) {
              filteredMenuFilters[koreanKey] = cafe.menuFilters[koreanKey];
            }
          });
          filteredCafe.menuFilters = filteredMenuFilters;
        } else {
          filteredCafe.menuFilters = {};
        }

        return filteredCafe;
      });
    };

    // 영어 필터를 한국어로 변환
    const convertedStoreFilters = convertFiltersToKorean(storeFilters, "store");
    const convertedTakeOutFilters = convertFiltersToKorean(
      takeOutFilters,
      "takeOut"
    );
    const convertedMenuFilters = convertFiltersToKorean(menuFilters, "menu");

    // 변환된 필터에서 true인 키들만 추출
    const selectedStoreFilters = pickTrueKeys(convertedStoreFilters);
    const selectedTakeOutFilters = pickTrueKeys(convertedTakeOutFilters);
    const selectedMenuFilters = pickTrueKeys(convertedMenuFilters);

    const explicitRegionCond = buildRegionCondition(region1, region2, region3);

    const hasSearchQuery = !!query;
    const hasAnyFilter =
      selectedStoreFilters.length > 0 ||
      selectedMenuFilters.length > 0 ||
      selectedTakeOutFilters.length > 0;
    const hasRegionFilter = hasAnyKeys(explicitRegionCond);
    const isInitialRequest =
      !hasSearchQuery && !hasAnyFilter && !hasRegionFilter;

    // 1) 처음 리스팅: preference 임베딩 Top-K 추천 (+ user_preference 지역 적용)
    if (isInitialRequest) {
      console.log(isInitialRequest);

      const pref = await preferenceTopK(userId, { topK: 15 });
      const cafeIds = pref?.cafeIds ?? [];
      if (cafeIds.length === 0) {
        return {
          fromNLP: true,
          message: null,
          data: [],
          nextCursor: null,
          hasMore: false,
        };
      }
      let rows = await cafeSearchRepository.findCafeByIds(cafeIds, userId);

      return {
        fromNLP: true,
        message: null,
        data: filterResponseData(
          applyDistanceAndSort(rows, refinedX, refinedY)
        ),
        nextCursor: null,
        hasMore: false,
      };
    }

    // 2) 검색: 지역 미지정이면 전국, 지정 시 해당 지역만 (RDB 하드 검색 우선)
    const whereConditions = { AND: [] };
    if (hasRegionFilter) {
      // 각 지역 조건을 개별적으로 추가
      Object.entries(explicitRegionCond).forEach(([key, value]) => {
        whereConditions.AND.push({ [key]: value });
      });
    }
    if (hasSearchQuery) whereConditions.AND.push({ name: { contains: query } });

    selectedStoreFilters.forEach((f) =>
      whereConditions.AND.push({
        storeFilters: {
          path: `$."${f}"`,
          equals: true,
        },
      })
    );

    selectedMenuFilters.forEach((f) =>
      whereConditions.AND.push({
        menuFilters: {
          path: `$."${f}"`,
          equals: true,
        },
      })
    );

    selectedTakeOutFilters.forEach((f) =>
      whereConditions.AND.push({
        takeOutFilters: {
          path: `$."${f}"`,
          equals: true,
        },
      })
    );

    console.log("=== 필터 변환 디버깅 ===");
    console.log("원본 storeFilters:", storeFilters);
    console.log("변환된 storeFilters:", convertedStoreFilters);
    console.log("선택된 storeFilters:", selectedStoreFilters);
    console.log("=== 지역 필터 디버깅 ===");
    console.log("받은 지역 파라미터:", { region1, region2, region3 });
    console.log("buildRegionCondition 결과:", explicitRegionCond);
    console.log("hasRegionFilter:", hasRegionFilter);
    console.log(
      "최종 whereConditions:",
      JSON.stringify(whereConditions, null, 2)
    );

    const hardResults = await cafeSearchRepository.findCafeByInfos(
      whereConditions,
      cursor,
      userId
    );
    const hardRows = hardResults?.cafes ?? [];

    if (hardRows.length > 0) {
      const sortedData = applyDistanceAndSort(hardRows, refinedX, refinedY);

      return {
        fromNLP: false,
        message: null,
        data: filterResponseData(sortedData),
        nextCursor:
          sortedData.length > 0
            ? sortedData[sortedData.length - 1].id.toString()
            : null,
        hasMore: hardResults?.hasMore ?? false,
      };
    }

    console.log(whereConditions);

    // 3) RDB 결과 없음 → 임베딩 폴백(Top-15). 검색어 없고 필터만 있어도 폴백.
    const filterQuery =
      typeof buildQueryFromFilters === "function"
        ? buildQueryFromFilters(
            convertedStoreFilters ?? {},
            convertedTakeOutFilters ?? {},
            convertedMenuFilters ?? {}
          )
        : "";
    const embeddingQuery = hasSearchQuery ? query : filterQuery;

    let fallbackRows = [];
    function addDistanceWithoutSort(rows, x, y) {
      return rows.map((cafe) => {
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
    }

    // 유사도 순서를 유지하면서 카페 정보를 정렬하는 함수
    const sortByOriginalOrder = (cafes, orderedIds) => {
      const cafeMap = new Map(cafes.map((cafe) => [cafe.id, cafe]));
      return orderedIds.map((id) => cafeMap.get(id)).filter(Boolean);
    };

    // fallback 로직에서 유사도 순서 유지하는 전체 수정:
    if (embeddingQuery) {
      const nlpRes = await nlpSearch(embeddingQuery);
      const fallbackIds = Array.isArray(nlpRes?.cafeIds)
        ? nlpRes.cafeIds.slice(0, 15)
        : [];
      if (fallbackIds.length > 0) {
        let rows = await cafeSearchRepository.findCafeByIds(
          fallbackIds,
          userId
        );

        // 🔥 유사도 순서 유지
        rows = sortByOriginalOrder(rows, fallbackIds);

        // 지역 필터 적용
        if (hasRegionFilter) {
          rows = rows.filter((c) => {
            if (
              explicitRegionCond.region1DepthName &&
              c.region1DepthName !== explicitRegionCond.region1DepthName
            )
              return false;
            if (
              explicitRegionCond.region2DepthName &&
              c.region2DepthName !== explicitRegionCond.region2DepthName
            )
              return false;
            if (
              explicitRegionCond.region3DepthName &&
              c.region3DepthName !== explicitRegionCond.region3DepthName
            )
              return false;
            return true;
          });
        }

        // 선택된 필터 적용
        rows = applyExplicitFiltersToRows(
          rows,
          selectedStoreFilters,
          selectedMenuFilters,
          selectedTakeOutFilters
        );

        // 🔥 거리만 계산하고 정렬하지 않음 (유사도 순서 유지)
        fallbackRows = addDistanceWithoutSort(rows, refinedX, refinedY);
      }
    }

    if (fallbackRows.length > 0) {
      return {
        fromNLP: true,
        message: "검색 결과가 없어 유사 카페를 추천합니다.",
        data: filterResponseData(fallbackRows), // applyDistanceAndSort 제거!
        nextCursor: null,
        hasMore: false,
      };
    }

    // 폴백도 없으면 빈 결과
    return {
      fromNLP: true,
      message: "검색 결과가 없습니다.",
      data: [],
      nextCursor: null,
      hasMore: false,
    };
  },

  async getCafeDetails(cafe, userId, x, y) {
    const photos = await cafeRepository.findPhotos(cafe.id);
    const bookmark = await cafeRepository.isBookmarked(cafe.id, userId);
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
      isBookmarked: bookmark,
    };

    // x, y가 모두 제공된 경우에만 거리 계산
    if (x != null && y != null) {
      const xNum = parseFloat(x);
      const yNum = parseFloat(y);

      // 유효한 숫자인지 확인
      if (!isNaN(xNum) && !isNaN(yNum)) {
        cafeDetails.distance = getDistanceInMeters(
          parseFloat(cafe.latitude),
          parseFloat(cafe.longitude),
          yNum, // 사용자 위도
          xNum // 사용자 경도
        );
      }
    }

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

    const safetyMargin = 2; // 1.5배 여유 공간
    const minRadius = 200; // 최소 200m 보장
    const effectiveRadius = Math.max(
      zoomConfig.radius * safetyMargin,
      minRadius
    );

    const latRange = effectiveRadius / 111000;
    const lonRange =
      effectiveRadius / (111000 * Math.cos((refinedY * Math.PI) / 180));

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
    // 줌 레벨별 고정 반지름 설정
    const radiusConfig = {
      1: 106, // L1 ≈ 106 m
      2: 213, // L2 ≈ 213 m
      3: 426, // L3 ≈ 426 m
      4: 851, // L4 ≈ 851 m
      5: 1702, // L5 ≈ 1,702 m
      6: 3404, // L6 ≈ 3,404 m
      7: 6808, // L7 ≈ 6,808 m
      8: 13616, // L8 ≈ 13,616 m
    };

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

    // 기본값 설정 (범위를 벗어난 줌 레벨의 경우)
    const radius = radiusConfig[zoomLevel] || 1000; // 기본 1km
    const maxResults = maxResultsConfig[zoomLevel] || 100;

    // 카카오 지도 축척 계산 (참조용)
    const scale = 1 / Math.pow(2, zoomLevel - 3);

    return {
      maxResults,
      radius: radius,
      scale: scale,
    };
  },
};
