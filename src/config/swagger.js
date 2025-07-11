import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";

// ESModules용 __dirname 대체 코드
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// docs 폴더에 있는 Swagger 파일 로딩
const swaggerSpec = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));

export const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};