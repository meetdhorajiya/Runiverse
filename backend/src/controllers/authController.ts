import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { UserDocument } from "../models/User.js";

interface RegisterRequestBody {
  username?: string;
  email?: string;
  password?: string;
  lastName?: string;
  mobileNumber?: string;
}

interface LoginRequestBody {
  email?: string;
  password?: string;
}

interface AuthSuccessResponse {
  success: true;
  message: string;
  token: string;
  user: SanitizedUser;
}

interface AuthErrorResponse {
  success: false;
  message: string;
}

interface SanitizedUser {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string | null;
  avatarUrl?: string;
  steps: number;
  distance: number;
  territories: number;
  streak: number;
  multiplier: number;
}

const signToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const expiresIn = (process.env.JWT_EXPIRATION ?? "7d") as SignOptions["expiresIn"];
  const options: SignOptions = { expiresIn };

  return jwt.sign({ id: userId }, secret, options);
};

const sanitizeUser = (user: UserDocument): SanitizedUser => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  displayName: user.displayName ?? undefined,
  avatar: user.avatar ?? null,
  avatarUrl: user.avatarUrl ?? undefined,
  steps: user.steps,
  distance: user.distance,
  territories: user.territories,
  streak: user.streak,
  multiplier: user.multiplier,
});

export const registerUser = async (
  req: Request<unknown, unknown, RegisterRequestBody>,
  res: Response<AuthSuccessResponse | AuthErrorResponse>
): Promise<Response<AuthSuccessResponse | AuthErrorResponse>> => {
  try {
    const { username, email, password, lastName, mobileNumber } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Username, email and password are required" });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      lastName,
      mobileNumber,
    });

    const token = signToken(user._id.toString());

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
};

export const loginUser = async (
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response<AuthSuccessResponse | AuthErrorResponse>
): Promise<Response<AuthSuccessResponse | AuthErrorResponse>> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user._id.toString());

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};
