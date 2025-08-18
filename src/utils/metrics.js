import client from "prom-client";

export const searchCounter = new client.Counter({
  name: "cafe_search_total",
  help: "Total number of cafe searches by keyword",
  labelNames: ["keyword"],
});

export const register = new client.Registry();
client.collectDefaultMetrics({ register });
register.registerMetric(searchCounter);