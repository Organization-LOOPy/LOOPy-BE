import "dotenv/config";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../src/utils/logger.js";
import { cafeRepository } from "../src/repositories/cafe.repository.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const COLLECTION_NAME = "cafes";
const BATCH_SIZE = 10; // 동시 처리할 카페 개수
const DELAY_MS = 1000; // API 호출 간 지연시간 (ms)

// 유틸리티 함수들
function toLine(name, value) {
  if (value == null) return "";
  if (Array.isArray(value)) return `${name}: ${value.join(", ")}`;
  if (typeof value === "object") return `${name}: ${JSON.stringify(value)}`;
  return `${name}: ${String(value)}`;
}

function buildCafeText(cafe, menus) {
  const lines = [];
  lines.push(toLine("name", cafe.name));
  lines.push(toLine("description", cafe.description));
  lines.push(toLine("storeFilters", cafe.storeFilters));
  lines.push(toLine("takeOutFilters", cafe.takeOutFilters));
  lines.push(toLine("menuFilters", cafe.menuFilters));
  lines.push(toLine("keywords", cafe.keywords));

  if (menus?.length) {
    lines.push("menus:");
    for (const m of menus) {
      const n = (m?.name ?? "").trim();
      const d = (m?.description ?? "").trim();
      if (n || d) lines.push(`- ${n}${d ? `: ${d}` : ""}`);
    }
  }
  return lines.join("\n").slice(0, 10000);
}

async function summarizeCafe(cafe, menus) {
  const raw = buildCafeText(cafe, menus);
  const prompt = [
    {
      role: "system",
      content:
        "당신은 의미 기반 검색(semantic search) 임베딩에 적합한, 매우 간결한 3줄 요약을 작성하는 유능한 어시스턴트입니다.",
    },
    {
      role: "user",
      content: `다음 카페 정보를 정확히 3줄로 요약해주세요.
- 불릿포인트나 번호 사용 금지
- 각 줄은 최대 120자 이내
- 1줄: 카페 이름 + 분위기/설명
- 2줄: 대표 메뉴/특징
- 3줄: 키워드/필터

텍스트:
${raw}`,
    },
  ];

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt,
    });

    const text =
      resp.choices[0]?.message?.content
        ?.split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join("\n") ?? "";

    return text.slice(0, 600);
  } catch (error) {
    logger.error(`카페 ${cafe.id} 요약 생성 실패:`, error);
    // 요약 실패시 원본 텍스트의 일부를 사용
    return raw.slice(0, 600);
  }
}

async function createEmbedding(text) {
  try {
    const embeddingRes = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return embeddingRes.data[0].embedding;
  } catch (error) {
    logger.error("임베딩 생성 실패:", error);
    throw error;
  }
}

async function processCafe(cafe) {
  try {
    logger.info(`카페 처리 시작: ${cafe.id} - ${cafe.name}`);

    // 메뉴 정보 조회
    const menus = await cafeRepository.findMenu(cafe.id);

    // 요약 생성
    const summary = await summarizeCafe(cafe, menus);

    // 임베딩 생성
    const vector = await createEmbedding(summary);

    // Qdrant에 업서트
    const upsertRes = await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: cafe.id,
          vector: vector,
          payload: {
            cafeId: cafe.id,
            region1DepthName: cafe.region1DepthName ?? null,
            region2DepthName: cafe.region2DepthName ?? null,
            region3DepthName: cafe.region3DepthName ?? null,
            summary,
          },
        },
      ],
    });

    logger.info(`✅ 카페 ${cafe.id} 처리 완료`);
    return { success: true, cafeId: cafe.id, summary };
  } catch (error) {
    logger.error(`❌ 카페 ${cafe.id} 처리 실패:`, error);
    return { success: false, cafeId: cafe.id, error: error.message };
  }
}

async function ensureCollection() {
  try {
    // 테스트 임베딩으로 차원 확인
    const testVector = await createEmbedding("dimension test");
    const dimension = testVector.length;

    logger.info(`임베딩 차원: ${dimension}`);

    // 컬렉션 존재 여부 확인
    const exists = await qdrant
      .getCollection(COLLECTION_NAME)
      .then((info) => info?.result?.config?.params?.vectors)
      .catch(() => undefined);

    const needCreate =
      exists === undefined ||
      (typeof exists === "number" && exists !== dimension) ||
      typeof exists === "object";

    if (needCreate) {
      // 기존 컬렉션 삭제 (있다면)
      await qdrant.deleteCollection(COLLECTION_NAME).catch(() => {});

      // 새 컬렉션 생성
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: dimension, distance: "Cosine" },
      });

      logger.info(
        `✅ 컬렉션 '${COLLECTION_NAME}' 생성 완료 (차원: ${dimension})`
      );
    } else {
      logger.info(`✅ 컬렉션 '${COLLECTION_NAME}' 이미 존재`);
    }

    return dimension;
  } catch (error) {
    logger.error("컬렉션 설정 실패:", error);
    throw error;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processBatch(cafes, batchIndex) {
  const promises = cafes.map((cafe) => processCafe(cafe));
  const results = await Promise.allSettled(promises);

  const successes = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length;
  const failures = results.filter(
    (r) =>
      r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
  ).length;

  logger.info(
    `배치 ${batchIndex + 1} 완료 - 성공: ${successes}, 실패: ${failures}`
  );

  return results;
}

// 실제 카페 ID 목록 (제공해주신 데이터)

const CAFE_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30,
];

// 카페 이름 매핑
const CAFE_NAMES = {
  11: "그린그린",
  12: "크레페마스터",
  13: "신촌브루스",
  14: "클로리스 신촌본점",
  15: "블랙번즈",
  16: "그로토",
  17: "소피",
  18: "리릭스커피컴퍼니",
  19: "리버트리커피",
  20: "포티드",
  21: "책다방 위숨",
  22: "벤치커피스튜디오",
  23: "앤드커피바",
  24: "알토피소",
  25: "거북이의 기적",
  26: "후엘고",
  27: "포멜로빈 공덕점",
  28: "파네트",
  29: "채그로",
  30: "독수리다방",
};
async function getAllCafes() {
  try {
    const cafes = [];

    logger.info("🔍 지정된 카페 ID들로 카페 정보 조회 중...");

    // for문으로 각 카페 ID에 대해 데이터 조회
    for (const cafeId of CAFE_IDS) {
      try {
        logger.info(
          `📋 카페 ID ${cafeId} (${CAFE_NAMES[cafeId] || "Unknown"}) 조회 중...`
        );

        // cafeRepository에서 개별 카페 조회
        const cafe = await cafeRepository.findById(cafeId); // 또는 findOne, getById 등

        if (cafe) {
          cafes.push(cafe);
          logger.info(`✅ 카페 ID ${cafeId} 조회 성공`);
        } else {
          logger.warn(`⚠️  카페 ID ${cafeId} 데이터 없음`);
        }

        // API 부하 방지를 위한 짧은 지연
        await delay(100);
      } catch (error) {
        logger.error(`❌ 카페 ID ${cafeId} 조회 실패:`, error);
        // 개별 조회 실패해도 계속 진행
        continue;
      }
    }

    logger.info(
      `📊 총 ${cafes.length}개 카페 조회 완료 (전체 ${CAFE_IDS.length}개 중)`
    );
    return cafes;
  } catch (error) {
    logger.error("카페 목록 조회 실패:", error);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  logger.info("🚀 카페 데이터 자동 임베딩 업로드 시작");

  try {
    // 1. 컬렉션 준비
    await ensureCollection();

    // 2. 모든 카페 데이터 조회
    logger.info("📋 카페 데이터 조회 중...");
    const allCafes = await getAllCafes();

    if (!allCafes || allCafes.length === 0) {
      logger.warn("처리할 카페 데이터가 없습니다.");
      return;
    }

    logger.info(`📊 총 ${allCafes.length}개의 카페 발견`);

    // 3. 배치 단위로 처리
    const batches = [];
    for (let i = 0; i < allCafes.length; i += BATCH_SIZE) {
      batches.push(allCafes.slice(i, i + BATCH_SIZE));
    }

    logger.info(`🔄 ${batches.length}개 배치로 나누어 처리`);

    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(
        `\n📦 배치 ${i + 1}/${batches.length} 처리 중... (${
          batch.length
        }개 카페)`
      );

      const results = await processBatch(batch, i);

      // 결과 집계
      const batchSuccess = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const batchFailure = results.filter(
        (r) =>
          r.status === "rejected" ||
          (r.status === "fulfilled" && !r.value.success)
      ).length;

      totalSuccess += batchSuccess;
      totalFailure += batchFailure;

      // API 제한을 위한 지연
      if (i < batches.length - 1) {
        logger.info(`⏳ ${DELAY_MS}ms 대기...`);
        await delay(DELAY_MS);
      }
    }

    // 4. 최종 결과 출력
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    logger.info(`\n🎉 모든 작업 완료!`);
    logger.info(`📈 총 처리 결과:`);
    logger.info(`  - 성공: ${totalSuccess}개`);
    logger.info(`  - 실패: ${totalFailure}개`);
    logger.info(`  - 총 소요시간: ${duration}초`);

    if (totalFailure > 0) {
      logger.warn(
        `⚠️  ${totalFailure}개의 카페 처리에 실패했습니다. 로그를 확인해주세요.`
      );
    }
  } catch (error) {
    logger.error("❌ 전체 작업 실패:", error);
    process.exit(1);
  }
}

// 스크립트 실행
main().catch((error) => {
  logger.error("예상치 못한 오류:", error);
  process.exit(1);
});
