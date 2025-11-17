import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { saveRoute } from "../controllers/routeController.js";

const router = express.Router();

router.post("/save", authMiddleware, saveRoute);

export default router;
