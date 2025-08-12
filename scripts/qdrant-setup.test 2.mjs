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
const DISTANCE = "Cosine";

async function getEmbeddingVector(sampleText = "dimension-check") {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: sampleText,
  });
  const vec = res?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("embedding vector not found");
  return vec;
}

async function ensureCollection(name, size) {
  try {
    await qdrant.getCollection(name);
    logger.info(`[OK] Collection already exists: ${name}`);
  } catch {
    logger.info(`[+] Creating collection: ${name}`);
    await qdrant.createCollection(name, {
      vectors: { size, distance: DISTANCE },
      // 필요시 추가 설정:
      // hnsw_config: { m: 16, ef_construct: 128 },
      // optimizers_config: { default_segment_number: 2 },
    });
    logger.info(`[OK] Created: ${name}`);
  }
}

async function upsertDummyPoint(collection, id, vector, payload = {}) {
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
    await qdrant.deleteCollection("cafes");
    await qdrant.deleteCollection("user_preferences");
    const testVector = await getEmbeddingVector("qdrant-setup sanity check");
    const dim = testVector.length;
    logger.info(`[INFO] Detected embedding dimension: ${dim}`);

    await ensureCollection("cafes", dim);
    await ensureCollection("user_preferences", dim);

    await upsertDummyPoint("cafes", 9999991, testVector, {
      cafeId: 9999991,
      region1DepthName: "서울",
      region2DepthName: "강남구",
      region3DepthName: "역삼동",
      summary: "더미 카페 요약입니다.",
    });

    await upsertDummyPoint("user_preferences", randomUUID(), testVector, {
      userId: "user-dummy-1", // payload는 문자열 가능
      summary: "더미 사용자 선호 요약입니다.",
      region1DepthName: "서울",
      region2DepthName: "마포구",
      region3DepthName: "상수동",
    });

    await searchNear("cafes", testVector);
    await searchNear("user_preferences", testVector);

    logger.info("[ALL DONE] Qdrant collections ready.");
  } catch (err) {
    if (err?.response?.data) {
      logger.error(
        "[ERROR] Qdrant setup failed - API Response:",
        err.response.data
      );
    } else {
      logger.error("[ERROR] Qdrant setup failed - Raw Error:", err);
    }
    process.exit(1);
  }
}

main();
