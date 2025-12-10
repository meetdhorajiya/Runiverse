import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { saveRoute } from "../controllers/routeController.js";

const router = Router();

// Stores a completed activity route for the authenticated user
router.post("/save", authMiddleware, saveRoute);

export default router;
