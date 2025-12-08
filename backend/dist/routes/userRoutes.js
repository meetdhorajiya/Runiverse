import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getProfile, updateProfile, syncStats, addBadge, } from "../controllers/userController.js";
const router = Router();
router.get("/me", authMiddleware, getProfile);
router.put("/me", authMiddleware, updateProfile);
router.put("/me/sync-stats", authMiddleware, syncStats);
router.post("/me/badges", authMiddleware, addBadge);
export default router;
