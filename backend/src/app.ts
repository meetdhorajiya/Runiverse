import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import territoryRoutes from "./routes/territoryRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import avatarRoutes from "./routes/avatarRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(cors({ origin: ["https://runiverse.onrender.com/"], credentials: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log("➡️ Incoming:", req.method, req.originalUrl);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/territories", territoryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/avatar", avatarRoutes);

console.log("📦 Task routes mounted at /api/tasks");

app.get("/", (_req: Request, res: Response) => res.json({ message: "Runiverse Backend running 🚀" }));

app.use(notFound);
app.use(errorHandler);

export default app;
