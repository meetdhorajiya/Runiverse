import mongoose from "mongoose";
import User from "../models/User.js";
import Territory from "../models/Territory.js";
const GLOBAL_LIMIT = 50;
const CITY_LIMIT = 25;
const serializeGlobalLeaderboard = (users) => users.map((user, index) => {
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
const fetchGlobalLeaderboard = async (limit = GLOBAL_LIMIT) => {
    const users = await User.find()
        .sort({ distance: -1, steps: -1, lifetimeDistance: -1 })
        .limit(limit)
        .select("username avatar avatarUrl distance steps city lifetimeSteps lifetimeDistance")
        .lean();
    return serializeGlobalLeaderboard(users ?? []);
};
const escapeForRegex = (input = "") => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const getLeaderboard = async (_req, res) => {
    try {
        const leaderboard = await fetchGlobalLeaderboard();
        return res.json({ success: true, data: leaderboard });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const getCityLeaderboard = async (req, res) => {
    try {
        const rawCity = typeof req.query.city === "string" ? req.query.city.trim() : "";
        if (!rawCity) {
            return res.status(400).json({ success: false, message: "city query parameter is required" });
        }
        const cityRegex = new RegExp(`^${escapeForRegex(rawCity)}$`, "i");
        const usersInCity = await User.find({ city: cityRegex })
            .select("username avatar avatarUrl steps city territories distance lifetimeSteps lifetimeDistance")
            .limit(CITY_LIMIT)
            .lean();
        const normalizedUsers = [...(usersInCity ?? [])];
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
            const fallback = await fetchGlobalLeaderboard(10);
            return res.json({ success: true, data: fallback });
        }
        const ownerIds = normalizedUsers.map((u) => (typeof u._id === "string" ? new mongoose.Types.ObjectId(u._id) : u._id));
        const territoryStats = await Territory.aggregate([
            { $match: { owner: { $in: ownerIds } } },
            {
                $group: {
                    _id: "$owner",
                    totalArea: { $sum: { $ifNull: ["$metrics.area", 0] } },
                    territoryCount: { $sum: 1 },
                },
            },
        ]);
        const statsMap = territoryStats.reduce((acc, stat) => {
            const key = stat._id.toString();
            acc[key] = {
                totalArea: stat.totalArea ?? 0,
                territoryCount: stat.territoryCount ?? 0,
            };
            return acc;
        }, {});
        const leaderboard = normalizedUsers
            .map((user) => {
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
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return res.status(500).json({ success: false, message: error.message });
    }
};
