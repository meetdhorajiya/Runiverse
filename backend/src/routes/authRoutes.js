import express from "express";
import passport from "../config/passport.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Helper to sign JWT
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION || "7d",
  });
};

// Email/Password Registration
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: "username, email and password are required" });
    }
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) {
      return res.status(409).json({ msg: "User with that email or username already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = await User.create({ username, email: email.toLowerCase(), password: hashed });
    const token = signToken(user._id);
    return res.status(201).json({
      msg: "Registration successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        steps: user.steps,
        distance: user.distance,
        territories: user.territories,
      },
    });
  } catch (err) {
    console.error("Register error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// Email/Password Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "email and password required" });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ msg: "Invalid credentials" });
    if (user.password === "GOOGLE_AUTH") {
      return res.status(400).json({ msg: "Use Google login for this account" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ msg: "Invalid credentials" });
    const token = signToken(user._id);
    return res.json({
      msg: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        steps: user.steps,
        distance: user.distance,
        territories: user.territories,
      },
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

router.get(
  "/google",
  passport.authenticate("google", { 
    scope: ["profile", "email"], 
    session: false, 
    prompt: "consent"
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/api/auth/google/fail", session: false }),
  (req, res) => {
    const { user, token } = req.user;

    // redirect to mobile app
    return res.json({
      msg: "Google login successful 🚀",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    });
  }
);

router.get("/google/fail", (req, res) => {
  res.status(401).json({ msg: "Google login failed" });
});

export default router;
