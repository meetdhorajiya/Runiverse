import Challenge from "../models/Challenge.js";
export const getChallenges = async (_req, res) => {
    try {
        const challenges = await Challenge.find().populate("participants", "username avatar");
        return res.json({ success: true, data: challenges });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return res.status(500).json({ success: false, message: error.message });
    }
};
export const updateChallengeProgress = async (req, res) => {
    try {
        const { challengeId, steps, distance } = req.body;
        if (!challengeId) {
            return res.status(400).json({ msg: "challengeId is required" });
        }
        if (!req.user?._id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ msg: "Challenge not found" });
        }
        const userId = req.user._id.toString();
        let progressEntry = challenge.progress.find((p) => p.user.toString() === userId);
        if (!progressEntry) {
            progressEntry = { user: req.user._id, currentProgress: 0, completed: false };
            challenge.progress.push(progressEntry);
        }
        if (challenge.type === "steps") {
            progressEntry.currentProgress += steps ?? 0;
        }
        if (challenge.type === "distance") {
            progressEntry.currentProgress += distance ?? 0;
        }
        progressEntry.completed = progressEntry.currentProgress >= challenge.goal;
        await challenge.save();
        return res.json({ success: true, data: progressEntry });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return res.status(500).json({ msg: error.message });
    }
};
