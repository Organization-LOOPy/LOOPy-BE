import express from "express";
import { getHomeController } from "../controllers/customer.home.controller.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateJWT);

router.get("/home", getHomeController);

export default router;
