import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

const swaggerSpec = YAML.load("docs/swagger.yaml");

export const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};