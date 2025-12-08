import User from "../models/User.js";
export const getProfile = async (req, res) => {
    try {
        const baseUser = req.user && req.user._id
            ? req.user
            : await User.findById(req.user?.id ?? req.user?._id).select("-password");
        if (!baseUser) {
            return res.status(404).json({ msg: "User not found" });
        }
        await baseUser.populate("badges");
        baseUser.ensureDailyReset();
        if (baseUser.isModified()) {
            await baseUser.save();
        }
        return res.json(baseUser);
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("getProfile error:", error);
        return res.status(500).json({ msg: "Server error" });
    }
};
export const updateProfile = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const incoming = req.body;
        const updates = {};
        if (typeof incoming.username === "string" && incoming.username.trim().length > 0) {
            updates.username = incoming.username.trim();
        }
        if (typeof incoming.displayName === "string") {
            updates.displayName = incoming.displayName.trim();
        }
        if (Object.prototype.hasOwnProperty.call(incoming, "avatar")) {
            updates.avatar = incoming.avatar === null ? null : incoming.avatar;
        }
        if (Object.prototype.hasOwnProperty.call(incoming, "avatarUrl")) {
            updates.avatarUrl = incoming.avatarUrl === null ? null : incoming.avatarUrl;
        }
        if (typeof incoming.bio === "string" || incoming.bio === null) {
            updates.bio = incoming.bio;
        }
        if (typeof incoming.city === "string") {
            const normalizedCity = incoming.city.trim();
            if (normalizedCity.length > 0) {
                updates.city = normalizedCity;
            }
        }
        if (incoming.location && Array.isArray(incoming.location.coordinates) && incoming.location.coordinates.length === 2) {
            updates.location = {
                type: "Point",
                coordinates: incoming.location.coordinates,
            };
        }
        const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true }).select("-password");
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        console.log("User profile response:", user.avatarUrl);
        return res.json(user);
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Update error:", error);
        return res.status(500).json({ msg: "Server error" });
    }
};
export const addBadge = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }
        const { badge } = req.body;
        if (!badge) {
            return res.status(400).json({ success: false, error: "Badge id is required" });
        }
        const user = await User.findByIdAndUpdate(req.user.id, { $push: { badges: badge } }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }
        return res.json({ success: true, data: user.badges });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return res.status(500).json({ success: false, error: error.message });
    }
};
export const syncStats = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const { steps, distance } = req.body;
        if (!steps && !distance) {
            return res.status(400).json({ msg: "No stats provided" });
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        user.ensureDailyReset();
        if (typeof steps === "number") {
            user.updateSteps(Number(steps));
        }
        if (typeof distance === "number") {
            user.updateDistance(Number(distance));
        }
        await user.save();
        return res.json({
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
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Stats sync error:", error);
        return res.status(500).json({ msg: "Server error" });
    }
};
