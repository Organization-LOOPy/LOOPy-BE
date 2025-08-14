import "dotenv/config";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../src/utils/logger.js";
import { randomUUID } from "crypto";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const DISTANCE = "Cosine"; // 업서트와 동일하게 사용할 거리 지표

async function getEmbeddingVector(sampleText = "dimension-check") {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: sampleText,
  });
  const vec = res?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("embedding vector not found");
  if (vec.some((v) => !Number.isFinite(v)))
    throw new Error("embedding has non-finite numbers");
  return vec;
}

/**
 * 업서트 페이로드(unnamed vector: number[])와 완전히 일치하는 컬렉션 보장:
 * - vectors: { size, distance } 형태(unnamed)
 * - 스키마가 다르면 드롭 후 재생성
 */
async function ensureUnnamedVectorCollection(name, size, distance = DISTANCE) {
  const exists = await qdrant
    .getCollection(name)
    .then((info) => info?.result?.config?.params?.vectors)
    .catch(() => undefined);

  const needCreate =
    exists === undefined ||
    // exists가 숫자면 unnamed, 객체면 named. unnamed라도 크기/거리 바뀌었으면 재생성
    (typeof exists === "number" && exists !== size) ||
    typeof exists === "object"; // named vectors면 재생성

  if (needCreate) {
    // 있으면 삭제
    await qdrant.deleteCollection(name).catch(() => {});
    // unnamed vector 컬렉션으로 생성 (업서트 벡터:number[] 과 동일)
    await qdrant.createCollection(name, {
      vectors: { size, distance },
      // 필요시 추가 설정 예시:
      // hnsw_config: { m: 16, ef_construct: 128 },
      // optimizers_config: { default_segment_number: 2 },
      // shard_number: 1,
    });
    logger.info(
      `[OK] (Re)created unnamed-vector collection: ${name} (size=${size}, distance=${distance})`
    );
  } else {
    logger.info(`[OK] Collection already compatible (unnamed vector): ${name}`);
  }
}

async function upsertDummyPoint(collection, id, vector, payload = {}) {
  // 업서트는 unnamed vector(number[])로 고정
  if (!Array.isArray(vector) || vector.some((v) => !Number.isFinite(v))) {
    throw new Error("invalid embedding vector");
  }
  await qdrant.upsert(collection, {
    wait: true,
    points: [{ id, vector, payload }],
  });
  logger.info(`[OK] Upserted dummy point into ${collection} (id=${id}).`);
}

async function searchNear(collection, vector) {
  const hits = await qdrant.search(collection, {
    vector,
    limit: 3,
    with_payload: true,
    score_threshold: 0,
  });
  logger.info(
    `[OK] Search in ${collection}: ${JSON.stringify(
      hits.map((h) => ({ id: h.id, score: h.score, payload: h.payload })),
      null,
      2
    )}`
  );
}

async function main() {
  try {
    await qdrant.deleteCollection("cafes").catch(() => {});
    await qdrant.deleteCollection("user_preferences").catch(() => {});

    // 1) 임베딩으로 차원 결정 (업서트와 동일 모델/벡터로 보장)
    const testVector = await getEmbeddingVector("qdrant-setup sanity check");
    const dim = testVector.length;
    logger.info(`[INFO] Detected embedding dimension: ${dim}`);

    // 2) 컬렉션을 업서트 형식(unnamed vector:number[])과 동일하게 보장
    await ensureUnnamedVectorCollection("cafes", dim);
    await ensureUnnamedVectorCollection("user_preferences", dim);

    // 3) 업서트 (벡터:number[] 그대로)
    const randomInt = (min = 1, max = 2 ** 31 - 1) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    /* cafes
    const cafeId = randomInt();
    await upsertDummyPoint("cafes", cafeId, testVector, {
      cafeId, // payload에도 동일 타입 유지
      region1DepthName: "서울",
      region2DepthName: "강남구",
      region3DepthName: "역삼동",
      summary: "더미 카페 요약입니다.",
    }); */

    /*/ user_preferences
    const userPk = randomInt();
    await upsertDummyPoint("user_preferences", userPk, testVector, {
      userId: userPk, // 실제 사용자 PK 타입 그대로
      summary: "더미 사용자 선호 요약입니다.",
    });
    // 4) 검색 체크
    await searchNear("cafes", testVector);
    */
    await searchNear("user_preferences", testVector);

    logger.info("[ALL DONE] Qdrant collections ready.");
  } catch (err) {
    const data = err?.response?.data || err?.data || err?.message || err;
    logger.error("[ERROR] Qdrant setup failed:", data);
    process.exit(1);
  }
}

main();
