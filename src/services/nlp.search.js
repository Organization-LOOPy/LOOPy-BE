import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../utils/logger.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export const nlpSearch = async (searchQuery) => {
  try {
    const query = (searchQuery ?? "").trim();
    if (!query) return { cafeIds: [] };

    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    logger.debug(embeddingRes);
    const vector = embeddingRes.data[0].embedding;

    const searchRes = await qdrant.search({
      collection_name: "cafes",
      vector,
      limit: 5,
      with_payload: true,
    });
    logger.debug(searchRes);
    const cafeIds = searchRes.map((hit) => hit.payload?.cafeId).filter(Boolean);

    return { cafeIds };
  } catch (err) {
    logger.error("qdrant 조회중 오류 발생", err);
    return { cafeId: [] };
  }
};

export const cafeEmbedding = async (cafe) => {
  try {
  } catch (err) {
    logger.error("카페정보 임베딩중 오류 발생", err);
    next(err);
  }
};
