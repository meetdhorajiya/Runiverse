import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { claimTerritory, getTerritories } from "../controllers/territoryController.js";

const router = Router();

router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    if (!token) {
      return next();
    }

    try {
      await authMiddleware(req as Parameters<typeof authMiddleware>[0], res, next);
    } catch (error) {
      next(error);
    }
  },
  getTerritories
);

router.post("/claim", authMiddleware, claimTerritory);

export default router;
