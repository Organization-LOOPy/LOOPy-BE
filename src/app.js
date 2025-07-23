import express from "express";
import cors from "cors";
import { morganMiddleware } from "./utils/logger.js";
import { responseHandler } from "./middlewares/responseHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import authRouter from "./routes/auth.routes.js";
import searchRouter from "./routes/searchRoutes.js";
import cafeRouter from "./routes/cafeRoutes.js";
import passport from "./config/passport.js";
import userRouter from "./routes/user.routes.js";
import reviewRouter from './routes/review.routes.js';

const app = express();

setupSwagger(app);
app.use(morganMiddleware);

const corsOptions = {
  origin: [
    "http://localhost:5173", // 프론트엔드 로컬 환경
    "https://loo-py.xyz/", // 프론트엔드 배포 환경
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
  exposedHeaders: ["x-access-token", "Content-Encoding"],
};
app.use(cors(corsOptions));
app.use(express.json());


app.get("/", (req, res) => res.send("루피 백엔드 작동 중!"));

app.use(responseHandler);           
app.use(passport.initialize());

app.use(responseHandler); // 응답 포맷 통일 미들웨어
app.get("/", (req, res) => res.send("루피 백엔드 작동 중!"));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/cafe/:cafeId", cafeRouter);

app.use(errorHandler); // 전역 예외 처리 미들웨어

app.use(errorHandler);

app.use(errorHandler);

export default app;
