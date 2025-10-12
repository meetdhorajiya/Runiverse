import User from "../models/User.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("badges");
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.ensureDailyReset();
    if (user.isModified()) {
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
  const allowedFields = ["username", "displayName", "avatar", "location", "bio", "city"];
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

// Add this in controllers/userController.js
export const addBadge = async (req, res) => {
  try {
    const userId = req.user.id;
    const { badge } = req.body;

    // Example: push badge into user's badges array
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { badges: badge } },
      { new: true }
    );

    res.json({ success: true, data: user.badges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

    user.ensureDailyReset();

    if (steps) user.updateSteps(Number(steps));
    if (distance) user.updateDistance(Number(distance));

    await user.save();

    res.json({
      msg: "Stats synced successfully",
      user: {
        id: user._id,
        steps: user.steps,
        distance: user.distance,
        lifetimeSteps: user.lifetimeSteps,
        lifetimeDistance: user.lifetimeDistance,
        territories: user.territories,
      },
    });
  } catch (err) {
    console.error("Stats sync error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

