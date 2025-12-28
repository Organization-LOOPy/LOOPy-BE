import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import client from "prom-client";
import { morganMiddleware } from "./utils/logger.js";
import { responseHandler } from "./middlewares/responseHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import passport from "./config/passport.js";

// Routers
import verificationRouter from './routes/verificationRouter.js';
import authRouter from "./routes/auth.routes.js";
import searchRouter from "./routes/search.routes.js";
import cafeRouter from "./routes/cafe.routes.js";
import userRouter from "./routes/user.routes.js";
import pointRouter from "./routes/point.router.js";
import reviewRouter from "./routes/review.routes.js";
import challengeRoutes from "./routes/challenge.routes.js";
import usercouponRoutes from "./routes/user.coupon.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import stampRouter from "./routes/stamp.routes.js";
import ownerRouter from "./routes/admin.user.routes.js";
import adminCafeRouter from "./routes/admin.cafe.routes.js";
import adminStampRouter from "./routes/admin.stamp.routes.js";
import couponRouter from "./routes/coupon.routes.js";
import customerPageRouter from "./routes/customer.page.routes.js";
import DashboardRouter from "./routes/dashboard.routes.js";
import adminChallengeRouter from "./routes/admin.challenge.routes.js";
import adminNotificationRouter from "./routes/admin.notification.routes.js";
import metricsRouter from "./routes/metrics.route.js";

console.log("🚩 [Check 1] 모든 모듈 Import 완료");

const app = express();
app.set("trust proxy", 1);

// CORS 설정
const corsOptions = {
  origin: [
    "http://localhost:5173",      // 프론트 로컬
    "https://loo-py.xyz",         // 프론트 배포
    "http://13.209.89.251:3000",
    "http://localhost:3000",
    "https://loopy-biz.xyz",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Action-Token", "x-action-token", "x-access-token"],
  exposedHeaders: ["x-access-token", "Content-Encoding"],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
console.log("🚩 [Check 2] CORS 설정 완료");

// Swagger & 공통 미들웨어
console.log("🚩 [Check 3] Swagger 설정 시작...");
setupSwagger(app);
console.log("🚩 [Check 4] Swagger 설정 완료");

app.use(morganMiddleware);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(responseHandler);

app.use(passport.initialize());
console.log("🚩 [Check 6] Passport 초기화 완료");

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
app.use("/metrics", metricsRouter);
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// 헬스체크
app.get("/", (req, res) => res.send("루피 백엔드 작동 중!, cicd파이프라인 확인"));
app.get("/health", (req, res) => res.status(200).send("ok"));
app.use('/api/verification', verificationRouter);
// 고객용
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1", reviewRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/cafes/:cafeId", cafeRouter);
app.use("/api/v1", notificationRouter);
app.use("/api/v1/points", pointRouter);
app.use("/api/v1", stampRouter); 
app.use("/api/v1/", usercouponRoutes);
app.use("/api/v1/challenges", challengeRoutes);

// 사장용
app.use("/api/v1/owner/cafes", adminCafeRouter);
app.use("/api/v1/owner/stamps", adminStampRouter);
app.use("/api/v1/owner/cafes", couponRouter);
app.use("/api/v1/owner/dashboard", DashboardRouter);
app.use("/api/v1/owner/cafes", adminChallengeRouter);
app.use("/api/v1/owner", ownerRouter);
app.use("/api/v1/owner/cafes", adminNotificationRouter);

// 페이지
app.use("/api/v1/pages", customerPageRouter);

// 전역 에러 핸들러
app.use(errorHandler);

console.log("🚩 [Check 7] 모든 라우터 및 미들웨어 로드 완료 (app.js 끝)");

export default app;
