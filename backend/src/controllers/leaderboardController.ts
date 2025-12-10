import type { Request, Response } from "express";
import mongoose from "mongoose";
import User, { UserDocument } from "../models/User.js";
import Territory from "../models/Territory.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string | null;
  avatarUrl: string | null;
  city: string | null;
  steps: number;
  distance: number;
  lifetimeSteps: number;
  lifetimeDistance: number;
  rank: number;
  totalArea: number;
  territoryCount: number;
}

interface GlobalUserRecord {
  _id: mongoose.Types.ObjectId | string;
  username: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  steps?: number | null;
  distance?: number | null;
  lifetimeSteps?: number | null;
  lifetimeDistance?: number | null;
  territories?: number | null;
}

interface TerritoryStat {
  _id: mongoose.Types.ObjectId;
  totalArea?: number;
  territoryCount?: number;
}

const GLOBAL_LIMIT = 50;
const CITY_LIMIT = 25;

const serializeGlobalLeaderboard = (users: GlobalUserRecord[]): LeaderboardEntry[] =>
  users.map((user, index) => {
    const userId = typeof user._id === "string" ? user._id : user._id.toString();
    const avatar = user.avatarUrl ?? user.avatar ?? null;

    return {
      userId,
      username: user.username,
      avatar,
      avatarUrl: avatar,
      city: user.city ?? null,
      steps: user.steps ?? 0,
      distance: user.distance ?? 0,
      lifetimeSteps: user.lifetimeSteps ?? 0,
      lifetimeDistance: user.lifetimeDistance ?? 0,
      rank: index + 1,
      totalArea: 0,
      territoryCount: 0,
    };
  });

const fetchGlobalLeaderboard = async (limit = GLOBAL_LIMIT): Promise<LeaderboardEntry[]> => {
  const users = await User.find()
    .sort({ distance: -1, steps: -1, lifetimeDistance: -1 })
    .limit(limit)
    .select("username avatar avatarUrl distance steps city lifetimeSteps lifetimeDistance")
    .lean<GlobalUserRecord[]>();

  return serializeGlobalLeaderboard(users ?? []);
};

const escapeForRegex = (input = ""): string => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getLeaderboard = async (_req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const leaderboard = await fetchGlobalLeaderboard();
    return res.json({ success: true, data: leaderboard });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCityLeaderboard = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const rawCity = typeof req.query.city === "string" ? req.query.city.trim() : "";

    if (!rawCity) {
      return res.status(400).json({ success: false, message: "city query parameter is required" });
    }

    const cityRegex = new RegExp(`^${escapeForRegex(rawCity)}$`, "i");

    const usersInCity = await User.find({ city: cityRegex })
      .select("username avatar avatarUrl steps city territories distance lifetimeSteps lifetimeDistance")
      .limit(CITY_LIMIT)
      .lean<GlobalUserRecord[]>();

    const normalizedUsers: GlobalUserRecord[] = [...(usersInCity ?? [])];

    if (req.user && req.user.city && cityRegex.test(req.user.city)) {
      const userId = req.user._id.toString();
      const alreadyIncluded = normalizedUsers.some((candidate) => {
        const candidateId = typeof candidate._id === "string" ? candidate._id : candidate._id.toString();
        return candidateId === userId;
      });

      if (!alreadyIncluded) {
        normalizedUsers.push({
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatarUrl ?? req.user.avatar ?? null,
          avatarUrl: req.user.avatarUrl ?? req.user.avatar ?? null,
          city: req.user.city ?? null,
          steps: req.user.steps ?? 0,
          territories: req.user.territories ?? 0,
          distance: req.user.distance ?? 0,
          lifetimeSteps: req.user.lifetimeSteps ?? 0,
          lifetimeDistance: req.user.lifetimeDistance ?? 0,
        });
      }
    }

    if (normalizedUsers.length === 0) {
      return res.json({ success: true, data: [], message: "No results found for the selected city." });
    }

    const ownerIds = normalizedUsers.map((u) => (typeof u._id === "string" ? new mongoose.Types.ObjectId(u._id) : u._id));

    const territoryStats = await Territory.aggregate<TerritoryStat>([
      { $match: { owner: { $in: ownerIds } } },
      {
        $group: {
          _id: "$owner",
          totalArea: { $sum: { $ifNull: ["$area", 0] } },
          territoryCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = territoryStats.reduce<Record<string, { totalArea: number; territoryCount: number }>>((acc, stat) => {
      const key = stat._id.toString();
      acc[key] = {
        totalArea: stat.totalArea ?? 0,
        territoryCount: stat.territoryCount ?? 0,
      };
      return acc;
    }, {});

    const leaderboard = normalizedUsers
      .map<LeaderboardEntry>((user) => {
        const key = typeof user._id === "string" ? user._id : user._id.toString();
        const stat = statsMap[key] ?? { totalArea: 0, territoryCount: 0 };
        const avatar = user.avatarUrl ?? user.avatar ?? null;

        return {
          userId: key,
          username: user.username,
          avatar,
          avatarUrl: avatar,
          city: user.city ?? null,
          steps: user.steps ?? 0,
          distance: user.distance ?? 0,
          lifetimeSteps: user.lifetimeSteps ?? 0,
          lifetimeDistance: user.lifetimeDistance ?? 0,
          totalArea: stat.totalArea,
          territoryCount: stat.territoryCount,
          rank: 0, // placeholder, will be replaced in subsequent map
        };
      })
      .sort((a, b) => {
        if ((b.totalArea ?? 0) !== (a.totalArea ?? 0)) {
          return (b.totalArea ?? 0) - (a.totalArea ?? 0);
        }
        return (b.steps ?? 0) - (a.steps ?? 0);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return res.json({ success: true, data: leaderboard });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return res.status(500).json({ success: false, message: error.message });
  }
};
