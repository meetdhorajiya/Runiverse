import User from "../models/User.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("badges");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
  const allowedFields = ["username", "displayName", "avatar", "avatarUrl", "location", "bio"];
    const updates = {};

    for (let key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.location && updates.location.coordinates) {
      updates.location.type = "Point";
    } else {
      delete updates.location;
    }

    // Map avatarUrl -> avatar if provided
    if (updates.avatarUrl && !updates.avatar) {
      updates.avatar = updates.avatarUrl;
      delete updates.avatarUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const syncStats = async (req, res) => {
  try {
    const { steps, distance } = req.body;

    if (!steps && !distance) {
      return res.status(400).json({ msg: "No stats provided" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (steps) await user.updateSteps(steps);
    if (distance) await user.updateDistance(distance);

    await user.save();

    res.json({
      msg: "Stats synced successfully",
      user: {
        id: user._id,
        steps: user.steps,
        distance: user.distance,
        territories: user.territories,
      },
    });
  } catch (err) {
    console.error("Stats sync error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

