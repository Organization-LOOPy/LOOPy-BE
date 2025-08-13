import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../src/utils/logger.js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "cafes";

// 업로드했던 카페 ID 목록

const EXPECTED_CAFE_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 53, 54,
  55, 56, 57, 68, 69, 70, 71, 72,
];

// 카페 이름 매핑
const CAFE_NAMES = {
  1: "브루키",
  2: "콘시드서울 (공덕)",
  3: "파이홀",
  4: "호밀밭",
  5: "10593 베이글커피하우스 신촌점",
  6: "그로토",
  7: "소피",
  8: "리릭스커피컴퍼니",
  9: "리버트리커피",
  10: "포티드",
  38: "책다방 위숨",
  39: "벤치커피스튜디오",
  40: "앤드커피바",
  41: "알토피소",
  42: "거북이의 기적",
  43: "후엘고",
  44: "포멜로빈 공덕점",
  45: "파네트",
  46: "채그로",
  47: "독수리다방",
  53: "고르드",
  54: "크레페마스터",
  55: "신촌브루스",
  56: "클로리스 신촌본점",
  57: "블랙번즈",
  68: "THAT COFFEE",
  69: "커파우스",
  70: "그로토",
  71: "네마커피",
  72: "겟앤쇼카페",
};

async function checkCollectionInfo() {
  try {
    logger.info("📊 컬렉션 정보 확인 중...");

    const collectionInfo = await qdrant.getCollection(COLLECTION_NAME);
    console.log(collectionInfo);
    const config = collectionInfo.config;
    const status = collectionInfo.status;
    const point = collectionInfo.points_count;

    logger.info(`✅ 컬렉션 '${COLLECTION_NAME}' 정보:`);
    logger.info(`  - 상태: ${status}`);
    logger.info(`  - 벡터 차원: ${config.params.size}`);
    logger.info(`  - 거리 측정: ${config.params.vectors.distance}`);
    logger.info(`  - 총 포인트 수: ${point}`);
    logger.info(`  - 인덱싱된 포인트: ${collectionInfo.indexed_vectors_count}`);

    return point;
  } catch (error) {
    logger.error("❌ 컬렉션 정보 조회 실패:", error);
    throw error;
  }
}

async function checkSpecificCafes() {
  try {
    logger.info("\n🔍 특정 카페 데이터 확인 중...");

    const foundCafes = [];
    const missingCafes = [];

    for (const cafeId of EXPECTED_CAFE_IDS) {
      try {
        const result = await qdrant.retrieve(COLLECTION_NAME, {
          ids: [cafeId],
          with_payload: true,
          with_vectors: false, // 벡터는 너무 길어서 제외
        });

        if (result && result.length > 0) {
          const point = result[0];
          foundCafes.push({
            id: cafeId,
            name: CAFE_NAMES[cafeId],
            payload: point.payload,
          });

          logger.info(
            `✅ 카페 ${cafeId} (${CAFE_NAMES[cafeId]}) - 데이터 존재`
          );
        } else {
          missingCafes.push({ id: cafeId, name: CAFE_NAMES[cafeId] });
          logger.warn(
            `❌ 카페 ${cafeId} (${CAFE_NAMES[cafeId]}) - 데이터 없음`
          );
        }
      } catch (error) {
        missingCafes.push({ id: cafeId, name: CAFE_NAMES[cafeId] });
        logger.error(`❌ 카페 ${cafeId} 조회 실패:`, error.message);
      }
    }

    return { foundCafes, missingCafes };
  } catch (error) {
    logger.error("카페 데이터 확인 실패:", error);
    throw error;
  }
}

async function sampleDataCheck() {
  try {
    logger.info("\n📝 샘플 데이터 확인 중...");

    // 처음 3개 포인트의 상세 정보 조회
    const sampleIds = EXPECTED_CAFE_IDS.slice(0, 3);

    for (const cafeId of sampleIds) {
      try {
        const result = await qdrant.retrieve(COLLECTION_NAME, {
          ids: [cafeId],
          with_payload: true,
          with_vectors: true,
        });

        if (result && result.length > 0) {
          const point = result[0];
          logger.info(`\n🔍 카페 ${cafeId} (${CAFE_NAMES[cafeId]}) 상세 정보:`);
          logger.info(`  - ID: ${point.id}`);
          logger.info(
            `  - 벡터 차원: ${point.vector ? point.vector.length : "N/A"}`
          );
          logger.info(`  - Payload:`);

          if (point.payload) {
            Object.entries(point.payload).forEach(([key, value]) => {
              if (key === "summary") {
                // 요약은 너무 길 수 있으므로 일부만 표시
                const preview =
                  typeof value === "string"
                    ? value.slice(0, 100) + "..."
                    : value;
                logger.info(`    * ${key}: ${preview}`);
              } else {
                logger.info(`    * ${key}: ${value}`);
              }
            });
          }
        }
      } catch (error) {
        logger.error(`샘플 카페 ${cafeId} 조회 실패:`, error.message);
      }
    }
  } catch (error) {
    logger.error("샘플 데이터 확인 실패:", error);
  }
}

async function testSearch() {
  try {
    logger.info("\n🔎 검색 테스트 중...");

    // 간단한 스크롤 조회로 모든 포인트 확인
    const scrollResult = await qdrant.scroll(COLLECTION_NAME, {
      limit: 10,
      with_payload: true,
      with_vectors: false,
    });

    if (scrollResult && scrollResult.points) {
      logger.info(`📋 컬렉션에서 발견된 포인트들 (처음 10개):`);
      scrollResult.points.forEach((point) => {
        const cafeId = point.payload?.cafeId || point.id;
        const cafeName = CAFE_NAMES[cafeId] || "Unknown";
        logger.info(`  - ID ${point.id}: ${cafeName}`);
      });

      logger.info(`총 ${scrollResult.points.length}개 포인트 조회됨`);
    }
  } catch (error) {
    logger.error("검색 테스트 실패:", error);
  }
}

async function main() {
  logger.info("🔍 Qdrant 카페 컬렉션 확인 시작\n");

  try {
    // 1. 컬렉션 기본 정보 확인
    const totalPoints = await checkCollectionInfo();

    // 2. 예상 카페들이 실제로 존재하는지 확인
    const { foundCafes, missingCafes } = await checkSpecificCafes();

    // 3. 샘플 데이터 상세 확인
    await sampleDataCheck();

    // 4. 검색 테스트
    await testSearch();

    // 5. 최종 요약
    logger.info("\n📊 최종 요약:");
    logger.info(`  - 컬렉션 총 포인트 수: ${totalPoints}`);
    logger.info(`  - 예상 카페 수: ${EXPECTED_CAFE_IDS.length}`);
    logger.info(`  - 발견된 카페: ${foundCafes.length}개`);
    logger.info(`  - 누락된 카페: ${missingCafes.length}개`);

    if (missingCafes.length > 0) {
      logger.warn("\n⚠️  누락된 카페들:");
      missingCafes.forEach((cafe) => {
        logger.warn(`  - ID ${cafe.id}: ${cafe.name}`);
      });
    }

    if (foundCafes.length === EXPECTED_CAFE_IDS.length) {
      logger.info("\n🎉 모든 카페 데이터가 성공적으로 업로드되었습니다!");
    } else {
      logger.warn(
        `\n⚠️  ${missingCafes.length}개의 카페 데이터가 누락되어 있습니다.`
      );
    }
  } catch (error) {
    logger.error("❌ 컬렉션 확인 실패:", error);
    process.exit(1);
  }
}

// 스크립트 실행
main().catch((error) => {
  logger.error("예상치 못한 오류:", error);
  process.exit(1);
});
