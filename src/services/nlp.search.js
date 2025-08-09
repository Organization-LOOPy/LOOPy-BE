import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafe.repository.js";

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
        "You are a helpful assistant that writes ultra-concise 3-line summaries for semantic search embeddings.",
    },
    {
      role: "user",
      content: `Summarize the following cafe profile into EXACTLY 3 lines.\n- No bullets, no numbering.\n- Each line <= 120 chars.\n- Line 1: name + vibe/description\n- Line 2: notable menus/features\n- Line 3: region/tags/filters\n\nTEXT:\n${raw}`,
    },
  ];

  const resp = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const text =
    resp.output_text
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join("\n") ?? "";

  if (!text) throw new Error("Failed to summarize cafe");

  return text.slice(0, 600);
}

export const cafeEmbedding = async (cafe) => {
  try {
    if (!cafe?.id)
      throw new Error("cafeEmbedding: invalid cafe object (missing id)");

    const menus = await cafeRepository.findMenu(cafe.id);

    //3줄 요약
    const summary = await summarizeCafe(cafe, menus);

    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small", // 1536차원
      input: summary,
    });
    const vector = embeddingRes.data[0].embedding;

    // 4) Qdrant 업서트
    const upsertRes = await qdrant.upsert({
      collection_name: "cafes",
      wait: true,
      points: [
        {
          id: cafe.id,
          vector,
          payload: {
            cafeId: cafe.id,
            name: cafe.name ?? null,
            region1: cafe.region1DepthName ?? null,
            region2: cafe.region2DepthName ?? null,
            region3: cafe.region3DepthName ?? null,
            summary, // 검색 결과 프리뷰용으로 저장하면 좋음
          },
        },
      ],
    });

    return { ok: true, upsertRes, summary };
  } catch (err) {
    console.error("카페정보 임베딩중 오류 발생:", err);
    return { ok: false, error: err?.message ?? String(err) };
  }
};
