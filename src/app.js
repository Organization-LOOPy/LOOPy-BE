import express from "express";
import { responseHandler } from "./middlewares/responseHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";

const app = express();

setupSwagger(app);
app.use(express.json());

app.get("/", (req, res) => res.send("루피 백엔드 작동 중!"));

app.use(responseHandler);
app.use(errorHandler);

export default app;
