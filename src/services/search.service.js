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
    // ✅ 디버깅: 함수 시작
    console.log("=== 🔍 findCafeList 시작 ===");
    console.log("입력 파라미터:", {
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
      userId,
    });

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

    // ✅ 디버깅: 지역 파라미터
    console.log("=== 🗺️ 지역 파라미터 디버깅 ===");
    console.log("받은 원본 값:", { region1, region2, region3 });
    console.log("buildRegionCondition 결과:", explicitRegionCond);
    console.log("hasRegionFilter:", hasRegionFilter);

    // ✅ 디버깅: 필터 상태
    console.log("=== 🔧 필터 상태 ===");
    console.log("hasSearchQuery:", hasSearchQuery, "query:", query);
    console.log("hasAnyFilter:", hasAnyFilter);
    console.log("selectedStoreFilters:", selectedStoreFilters);
    console.log("selectedMenuFilters:", selectedMenuFilters);
    console.log("selectedTakeOutFilters:", selectedTakeOutFilters);

    // ✅ 수정: region은 initial 판단에서 제외
    const isInitialRequest =
      !hasSearchQuery && !hasAnyFilter && !hasRegionFilter;

    const isRegionOnly =
      hasRegionFilter && !hasSearchQuery && !hasAnyFilter;

    // 1) 처음 리스팅: preference 임베딩 Top-K 추천 (+ user_preference 지역 적용)
    // 1️⃣ 초기 진입: preference → 없으면 nearby RDB fallback
    if (isInitialRequest && !hasRegionFilter) {
      const pref = await preferenceTopK(userId, { topK: 15 });
      const cafeIds = pref?.cafeIds ?? [];

      // 🔥 preference 없는 유저 fallback
      if (cafeIds.length === 0) {
        const rows = await cafeSearchRepository.findCafeByInfos(
          { status: "active" }, // 조건 없이 active 전체
          null,
          userId,
          15
        );

        return {
          fromNLP: false,
          message: null,
          data: filterResponseData(
            applyDistanceAndSort(rows.cafes ?? [], refinedX, refinedY)
          ),
          nextCursor: rows.nextCursor,
          hasMore: rows.hasMore,
        };
      }

      // 기존 preference 로직
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

    // ✅ 핵심 수정: whereConditions 생성 로직 개선
    let whereConditions = null;

    // 조건이 하나라도 있을 때만 whereConditions 생성
    if (hasRegionFilter || hasSearchQuery || hasAnyFilter) {
      const andConditions = [];

      // 지역 조건 추가
      if (hasRegionFilter) {
        Object.entries(explicitRegionCond).forEach(([key, value]) => {
          andConditions.push({ [key]: value });
        });
      }

      // 검색어 조건 추가
      if (hasSearchQuery) {
        andConditions.push({ name: { contains: query } });
      }

      // 스토어 필터 조건 추가
      selectedStoreFilters.forEach((f) => {
        andConditions.push({
          storeFilters: {
            path: `$."${f}"`,
            equals: true,
          },
        });
      });

      // 메뉴 필터 조건 추가
      selectedMenuFilters.forEach((f) => {
        andConditions.push({
          menuFilters: {
            path: `$."${f}"`,
            equals: true,
          },
        });
      });

      // 테이크아웃 필터 조건 추가
      selectedTakeOutFilters.forEach((f) => {
        andConditions.push({
          takeOutFilters: {
            path: `$."${f}"`,
            equals: true,
          },
        });
      });

      // ✅ AND 배열에 조건이 있을 때만 whereConditions 설정
      if (andConditions.length > 0) {
        whereConditions = { AND: andConditions };
      }
    }

    // ✅ 디버깅: whereConditions
    console.log("=== 📋 whereConditions 생성 ===");
    console.log("whereConditions:", JSON.stringify(whereConditions, null, 2));

    // ✅ whereConditions가 null이 아닐 때만 RDB 검색 실행
    let hardRows = [];
    let hardResults = null;

    if (whereConditions !== null) {
      console.log("=== 🔍 RDB 검색 실행 ===");
      
      hardResults = await cafeSearchRepository.findCafeByInfos(
        whereConditions,
        cursor,
        userId
      );
      hardRows = hardResults?.cafes ?? [];
      
      console.log("=== ✅ RDB 검색 완료 ===");
      console.log("조회된 카페 수:", hardRows.length);
      if (hardRows.length > 0) {
        console.log("카페 목록:", hardRows.map(c => ({ id: c.id, name: c.name, region: `${c.region1DepthName} ${c.region2DepthName} ${c.region3DepthName}` })));
      }
    } else {
      console.log("=== ⚠️ whereConditions가 null이라 RDB 검색 스킵 ===");
    }



    if (hardRows.length > 0) {
      const sortedData = applyDistanceAndSort(hardRows, refinedX, refinedY);

      console.log("=== ✅ 검색 성공 - RDB 결과 반환 ===");
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
    if (isRegionOnly) {
      const sortedData = applyDistanceAndSort(hardRows, refinedX, refinedY);
    
      return {
        fromNLP: false,
        message: null,
        data: filterResponseData(sortedData),
        nextCursor: null,
        hasMore: false,
      };
    }

    console.log("=== 🔄 RDB 검색 결과 없음, Fallback 시작 ===");

    if (!hasSearchQuery && !hasAnyFilter) {
      return {
        fromNLP: false,
        message: null,
        data: [],
        nextCursor: null,
        hasMore: false,
      };
    }

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

    console.log("=== 🤖 Fallback 임베딩 쿼리 ===");
    console.log("embeddingQuery:", embeddingQuery);

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

    // fallback 로직에서 유사도 순서 유지
    if (embeddingQuery) {
      const nlpRes = await nlpSearch(embeddingQuery);
      const fallbackIds = Array.isArray(nlpRes?.cafeIds)
        ? nlpRes.cafeIds.slice(0, 15)
        : [];
      
      console.log("=== 🎯 NLP 검색 결과 ===");
      console.log("fallbackIds:", fallbackIds);
      
      if (fallbackIds.length > 0) {
        let rows = await cafeSearchRepository.findCafeByIds(
          fallbackIds,
          userId
        );

        console.log("=== 📍 Fallback 카페 조회 완료 ===");
        console.log("조회된 카페 수:", rows.length);

        // 🔥 유사도 순서 유지
        rows = sortByOriginalOrder(rows, fallbackIds);

        // 지역 필터 적용
        if (hasRegionFilter) {
          console.log("=== 🗺️ 지역 필터 적용 (Fallback) ===");
          const beforeFilter = rows.length;
          
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
          
          console.log(`지역 필터 적용: ${beforeFilter}개 → ${rows.length}개`);
        }

        // 선택된 필터 적용
        rows = applyExplicitFiltersToRows(
          rows,
          selectedStoreFilters,
          selectedMenuFilters,
          selectedTakeOutFilters
        );

        console.log("=== 🔧 필터 적용 후 카페 수:", rows.length, "===");

        // 🔥 거리만 계산하고 정렬하지 않음 (유사도 순서 유지)
        fallbackRows = addDistanceWithoutSort(rows, refinedX, refinedY);
      }
    }

    if (fallbackRows.length > 0) {
      console.log("=== ✅ Fallback 성공 ===");
      return {
        fromNLP: true,
        message: "검색 결과가 없어 유사 카페를 추천합니다.",
        data: filterResponseData(fallbackRows),
        nextCursor: null,
        hasMore: false,
      };
    }

    console.log("=== ❌ 검색 결과 없음 ===");
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
    const bookmark = userId ? await cafeRepository.isBookmarked(cafe.id, userId) : null;
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

    if (x != null && y != null) {
      const xNum = parseFloat(x);
      const yNum = parseFloat(y);

      if (!isNaN(xNum) && !isNaN(yNum)) {
        cafeDetails.distance = getDistanceInMeters(
          parseFloat(cafe.latitude),
          parseFloat(cafe.longitude),
          yNum,
          xNum
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

    const safetyMargin = 2;
    const minRadius = 200;
    const effectiveRadius = Math.max(
      zoomConfig.radius * safetyMargin,
      minRadius
    );

    const latRange = effectiveRadius / 111000;
    const lonRange =
      effectiveRadius / (111000 * Math.cos((refinedY * Math.PI) / 180));

    const searchParams = {
      centerX: refinedX,
      centerY: refinedY,
      latRange,
      lonRange,
      region1: refinedRegion1,
      region2: refinedRegion2,
      region3: refinedRegion3,
      storeFilters: convertedStoreFilters,
      menuFilters: convertedMenuFilters,
      takeOutFilters: convertedTakeOutFilters,
      userId,
    };

    const allCafes = await cafeMapRepository.findCafesInArea(searchParams);

    const cafesWithDistance = allCafes.map((cafe) => ({
      ...cafe,
      distance: getDistanceInMeters(
        refinedY,
        refinedX,
        cafe.latitude,
        cafe.longitude
      ),
    }));

    const cafesInRadius = cafesWithDistance.filter(
      (cafe) => cafe.distance <= effectiveRadius
    );

    cafesInRadius.sort((a, b) => a.distance - b.distance);

    const limitedCafes = cafesInRadius.slice(0, zoomConfig.maxResults);

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
    const radiusConfig = {
      1: 106,
      2: 213,
      3: 426,
      4: 851,
      5: 1702,
      6: 3404,
      7: 6808,
      8: 13616,
    };

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

    const radius = radiusConfig[zoomLevel] || 1000;
    const maxResults = maxResultsConfig[zoomLevel] || 100;

    const scale = 1 / Math.pow(2, zoomLevel - 3);

    return {
      maxResults,
      radius,
      scale,
    };
  },
};