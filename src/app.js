import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { morganMiddleware } from "./utils/logger.js";
import { responseHandler } from "./middlewares/responseHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import authRouter from "./routes/auth.routes.js";
import searchRouter from "./routes/search.routes.js";
import cafeRouter from "./routes/cafe.routes.js";
import passport from "./config/passport.js";
import userRouter from "./routes/user.routes.js";
import pointRouter from "./routes/point.router.js";
import reviewRouter from "./routes/review.routes.js";
import challengeRoutes from "./routes/challenge.routes.js";

import notificationRouter from "./routes/notification.routes.js";
import stampbookRouter from "./routes/stampbook.routes.js";
import adminCafeRouter from "./routes/admin.cafe.routes.js";
import adminStampRouter from "./routes/admin.stamp.routes.js";
//import couponRouter from './routes/coupon.routes.js';
import customerPageRouter from "./routes/customer.page.routes.js";


const app = express();

setupSwagger(app);
app.use(morganMiddleware);

const corsOptions = {
  origin: [
    "http://localhost:5173", // 프론트엔드 로컬 환경
    "https://loo-py.xyz", // 프론트엔드 배포 환경
    "http://13.209.89.251:3000",
    "http://localhost:3000",
    "https://loopyxyz.duckdns.org",
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
  exposedHeaders: ["x-access-token", "Content-Encoding"],
};
app.use(cors(corsOptions));
setupSwagger(app);
app.use(express.json());

app.use(passport.initialize());

app.use(responseHandler); // 응답 포맷 통일 미들웨어
app.get("/", (req, res) =>
  res.send("루피 백엔드 작동 중!, cicd파이프라인 확인")
);
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

// 고객용
app.use("/api/v1/challenges", challengeRoutes);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1", reviewRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/cafes/:cafeId", cafeRouter);
app.use("/api/v1", notificationRouter);
app.use("/api/v1/points", pointRouter);
app.use("/api/v1/stampbooks", stampbookRouter);

// 사장용
app.use("/api/v1/owners/cafes", adminCafeRouter);
app.use("/api/v1/owner/stamps", adminStampRouter);
//app.use("/api/v1/owners/cafes/:cafeId/coupons", couponRouter);

// 페이지GET
app.use("/api/v1/pages", customerPageRouter);

app.use(errorHandler); // 전역 예외 처리 미들웨어

export default app;
