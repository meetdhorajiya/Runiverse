import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getLeaderboard } from "../controllers/leaderboardController.js";

const router = express.Router();
router.get("/", authMiddleware, getLeaderboard);

export default router;
