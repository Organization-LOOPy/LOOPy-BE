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
        "당신은 의미 기반 검색(semantic search) 임베딩에 적합한, 매우 간결한 3줄 요약을 작성하는 유능한 어시스턴트입니다.",
    },
    {
      role: "user",
      content: `다음 카페 정보를 정확히 3줄로 요약해주세요.\n- 불릿포인트나 번호 사용 금지\n- 각 줄은 최대 120자 이내\n- 1줄: 카페 이름 + 분위기/설명\n- 2줄: 대표 메뉴/특징\n- 3줄: 키워드/필터\n\n텍스트:\n${raw}`,
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

  if (!text) throw err;

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

    //Qdrant 업서트
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
            summary,
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
