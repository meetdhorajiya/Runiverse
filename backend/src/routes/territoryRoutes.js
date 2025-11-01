import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { claimTerritory, getTerritories } from "../controllers/territoryController.js";

const router = express.Router();
// Use optional auth middleware - if authenticated, returns user's territories
// If not authenticated, returns all territories
router.get("/", (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    authMiddleware(req, res, next);
  } else {
    next();
  }
}, getTerritories);
router.post("/claim", authMiddleware, claimTerritory);

export default router;
