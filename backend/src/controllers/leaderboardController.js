import User from "../models/User.js";
import Territory from "../models/Territory.js";

export const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.find().sort({ distance: -1 }).limit(10).select("username avatar distance");
    res.json({ success: true, data: topUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCityLeaderboard = async (req, res) => {
  try {
    const city = req.query.city?.trim();

    if (!city) {
      return res.status(400).json({ success: false, message: "city query parameter is required" });
    }

    const usersInCity = await User.find({ city })
      .select("username avatar steps city territories")
      .lean();

    if (usersInCity.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const territoryStats = await Territory.aggregate([
      { $match: { owner: { $in: usersInCity.map((u) => u._id) } } },
      {
        $group: {
          _id: "$owner",
          totalArea: { $sum: { $ifNull: ["$metrics.area", 0] } },
          territoryCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = territoryStats.reduce((acc, stat) => {
      acc[stat._id.toString()] = {
        totalArea: stat.totalArea ?? 0,
        territoryCount: stat.territoryCount ?? 0,
      };
      return acc;
    }, {});

    const leaderboard = usersInCity
      .map((user) => {
        const stat = statsMap[user._id.toString()] ?? { totalArea: 0, territoryCount: 0 };
        return {
          userId: user._id,
          username: user.username,
          avatar: user.avatar ?? null,
          city: user.city ?? null,
          steps: user.steps ?? 0,
          totalArea: stat.totalArea,
          territoryCount: stat.territoryCount,
        };
      })
      .sort((a, b) => {
        if (b.totalArea !== a.totalArea) {
          return b.totalArea - a.totalArea;
        }
        return (b.steps ?? 0) - (a.steps ?? 0);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
