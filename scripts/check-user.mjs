import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../src/utils/logger.js";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});
