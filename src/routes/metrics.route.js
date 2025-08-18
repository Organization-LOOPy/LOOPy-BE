import express from "express";
import client from "prom-client";

const router = express.Router();

router.get("/", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

export default router;
