import express from "express";
import { responseHandler } from "./middlewares/responseHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import authRouter from './routes/auth.routes.js';
import passport from "./config/passport.js"
import userRouter from './routes/user.routes.js';

const app = express();

setupSwagger(app);
app.use(express.json());


app.get("/", (req, res) => res.send("루피 백엔드 작동 중!"));

app.use(responseHandler);           
app.use(passport.initialize());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);

app.use(errorHandler);

export default app;
