import jwt from "jsonwebtoken";
import User from "../models/User.js";
export const authMiddleware = async (req, res, next) => {
    console.log("Authorization header:", req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not configured");
        }
        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ msg: "User not found" });
        }
        req.user = user;
        return next();
    }
    catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ msg: "Token is not valid" });
    }
};
