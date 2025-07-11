import express from "express";
import { responseHandler } from "./middlewares/responseHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import authRouter from './routes/auth.routes.js';
import passport from "./config/passport.js"

const app = express();

setupSwagger(app);            // Swagger UI 등록
app.use(express.json());      // JSON 파싱


app.get("/", (req, res) => res.send("루피 백엔드 작동 중!"));

app.use(responseHandler);     // 응답 포맷 통일 미들웨어
app.use(errorHandler);        // 전역 예외 처리 미들웨어
app.use(passport.initialize());

app.use('/api/auth', authRouter);
export default app;
