import User from "../models/User.js";

export const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.find().sort({ distance: -1 }).limit(10).select("username avatar distance");
    res.json({ success: true, data: topUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
