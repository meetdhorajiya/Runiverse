import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { claimTerritory, getTerritories } from "../controllers/territoryController.js";
const router = Router();
router.get("/", async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return next();
    }
    try {
        await authMiddleware(req, res, next);
    }
    catch (error) {
        next(error);
    }
}, getTerritories);
router.post("/claim", authMiddleware, claimTerritory);
export default router;
