import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../utils/logger.js";
import { cafeRepository } from "../repositories/cafe.repository.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

function toLine(name, value) {
  if (value == null) return "";
  if (Array.isArray(value)) return `${name}: ${value.join(", ")}`;
  if (typeof value === "object") return `${name}: ${JSON.stringify(value)}`;
  return `${name}: ${String(value)}`;
}

export function parseAreaToRegions(area) {
  if (!area || typeof area !== "string") return {};
  const [r1, r2, r3] = area.trim().split(/\s+/).filter(Boolean);
  const res = {};
  if (r1) res.region1DepthName = r1;
  if (r2) res.region2DepthName = r2;
  if (r3) res.region3DepthName = r3;
  return res;
}

export const nlpSearch = async (searchQuery) => {
  try {
    const query = (searchQuery ?? "").trim();
    if (!query) return { cafeIds: [] };

    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const vector = embeddingRes?.data?.[0]?.embedding;
    if (!Array.isArray(vector)) {
      logger.warn("nlpSearch: empty embedding vector");
      return { cafeIds: [] };
    }

    const searchRes = await qdrant.search("cafes", {
      vector,
      limit: 15,
      with_payload: true,
    });

    const cafeIds = (searchRes ?? [])
      .map((hit) => hit?.payload?.cafeId)
      .filter(Boolean);

    return { cafeIds };
  } catch (err) {
    logger.error("qdrant 조회중 오류 발생", err);
    return { cafeIds: [] };
  }
};

export async function preferenceTopK(userId, opts = {}) {
  const topK = Number(opts.topK ?? 15);
  if (!userId) return { cafeIds: [] };

  try {
    // 사용자 벡터 조회
    const prefPoint = await qdrant.retrieve("user_preferences", {
      ids: [userId],
      with_payload: true,
      with_vector: true,
    });

    console.log("Retrieve result:", JSON.stringify(prefPoint, null, 2));

    const point = Array.isArray(prefPoint) ? prefPoint[0] : null;

    if (!point) {
      logger.info(`preferenceTopK: no point found for userId ${userId}`);
      return { cafeIds: [] };
    }

    const vector = point?.vector;

    if (!Array.isArray(vector) || vector.length === 0) {
      logger.info(
        `preferenceTopK: no valid vector for userId ${userId}, vector type: ${typeof vector}, length: ${
          vector?.length
        }`
      );
      return { cafeIds: [] };
    }

    logger.info(
      `preferenceTopK: found vector with ${vector.length} dimensions for userId ${userId}`
    );

    const hits = await qdrant.search("cafes", {
      vector,
      limit: topK,
      with_payload: true,
    });

    console.log("Search hits:", hits?.length || 0);
    const cafeIds = (hits ?? []).map((h) => h?.payload?.cafeId).filter(Boolean);

    return { cafeIds };
    ``;
  } catch (err) {
    logger.error("preferenceTopK: 오류", err);
    return { cafeIds: [] };
  }
}

//---------------------------------카페임베딩---------------------
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
}

export const cafeEmbedding = async (cafe) => {
  try {
    const menus = await cafeRepository.findMenu(cafe.id);

    const summary = await summarizeCafe(cafe, menus);
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: summary,
    });
    const vectorRes = embeddingRes.data[0].embedding;

    const upsertRes = await qdrant.upsert("cafes", {
      wait: true,
      points: [
        {
          id: cafe.id,
          vector: vectorRes,
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

    console.log(upsertRes);

    return { ok: true, upsertRes, summary, dim: vectorRes.length };
  } catch (err) {
    logger.error("카페정보 임베딩중 오류 발생:", err);
    return err;
  }
};

//----------------------------사용자 임베딩 ----------------------------------------
function buildPreferenceText(p) {
  const lines = [];
  lines.push("TYPE: USER_PREFERENCE_V1");
  lines.push(toLine("store", p?.preferredStore));
  lines.push(toLine("takeout", p?.preferredTakeout));
  lines.push(toLine("menu", p?.preferredMenu));
  lines.push(toLine("extra", p?.extraFilters));
  return lines.filter(Boolean).join("\n").slice(0, 5000);
}

async function summarizePreference(p) {
  const raw = buildPreferenceText(p);
  const prompt = [
    {
      role: "system",
      content:
        "당신은 의미 기반 검색(semantic search) 임베딩에 적합한, 매우 간결한 3줄 요약을 작성하는 유능한 어시스턴트입니다.",
    },
    {
      role: "user",
      content: `다음 "사용자 취향" 정보를 정확히 3줄로 요약해주세요.
- 불릿포인트/번호 금지
- 각 줄 최대 120자
- 1줄: 선호 매장/이용형태 요약
- 2줄: 선호 메뉴/스타일
- 3줄: 키워드/필터

텍스트:
${raw}`,
    },
  ];

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
}

export const userPreferenceEmbedding = async ({
  preferredStore,
  preferredTakeout,
  preferredMenu,
  userId,
}) => {
  try {
    const pref = {
      preferredStore,
      preferredTakeout,
      preferredMenu,
      userId,
    };

    const summary = await summarizePreference(pref);
    console.log(summary);

    const existing = await qdrant
      .retrieve("user_preferences", {
        id: userId,
        with_payload: true,
        with_vector: false,
      })
      .catch(() => null);

    const oldSummary = Array.isArray(existing)
      ? existing[0]?.payload?.summary
      : undefined;

    if (oldSummary && oldSummary === summary) {
      return { ok: true, updated: false, reason: "no-change", summary };
    }

    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: summary,
    });
    const vectorRes = embeddingRes.data[0].embedding;

    const upsertRes = await qdrant.upsert("user_preferences", {
      wait: true,
      points: [
        {
          id: userId,
          vector: vectorRes,
          payload: {
            userId: userId,
            summary,
          },
        },
      ],
    });
    console.log("Upsert response:", upsertRes);
    console.log("Vector length:", vectorRes.length);
    console.log("Vector sample:", vectorRes.slice(0, 5));

    return {
      ok: true,
      updated: true,
      upsertRes,
      summary,
      dim: vectorRes.length,
    };
  } catch (err) {
    logger.error("사용자 취향 임베딩중 오류 발생:", err);
    return err;
  }
};
