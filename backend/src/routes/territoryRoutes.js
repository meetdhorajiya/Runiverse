import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { claimTerritory } from "../controllers/territoryController.js";

const router = express.Router();
router.post("/claim", authMiddleware, claimTerritory);

export default router;
