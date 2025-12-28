import express from "express";
import client from "prom-client";

const router = express.Router();

export const searchKeywordCounter = new client.Counter({
  name: "search_keyword_total",
  help: "검색 키워드별 검색 횟수",
  labelNames: ["keyword"],
});

router.get("/", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

export default router;
