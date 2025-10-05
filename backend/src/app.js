import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use(cors({
  origin: [
    "http://localhost:19006", // Expo dev
    "exp://*",                // Expo Go app
  ],
  credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Runiverse Backend is running 🚀" });
});

app.use(notFound);
app.use(errorHandler);
export default app;
