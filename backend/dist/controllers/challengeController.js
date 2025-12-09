import axios from "axios";
import Challenge from "../models/Challenge.js";
export const createTask = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const body = req.body;
        const challenge = await Challenge.create({
            owner: req.user._id,
            title: body.description,
            description: body.description,
            goal: body.target,
            type: body.type,
            difficulty: body.difficulty,
            generatedByAI: body.generatedByAI ?? false,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        });
        return res.status(201).json(challenge);
    }
    catch (err) {
        console.error("Create task error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
};
export const getTasks = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const tasks = await Challenge.find({ owner: req.user._id }).sort({ createdAt: -1 });
        return res.json(tasks);
    }
    catch (err) {
        console.error("Get tasks error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
};
export const getTaskById = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const task = await Challenge.findOne({
            _id: req.params.id,
            owner: req.user._id,
        });
        if (!task) {
            return res.status(404).json({ msg: "Task not found" });
        }
        return res.json(task);
    }
    catch (err) {
        console.error("Get task error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
};
export const markTaskCompleted = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const task = await Challenge.findOne({
            _id: req.params.id,
            owner: req.user._id,
        });
        if (!task) {
            return res.status(404).json({ msg: "Task not found" });
        }
        task.completed = true;
        task.progress.forEach((entry) => {
            if (entry.user.toString() === req.user?._id.toString()) {
                entry.completed = true;
                entry.currentProgress = task.goal;
            }
        });
        await task.save();
        return res.json({ msg: "Task marked as completed", task });
    }
    catch (err) {
        console.error("Mark completed error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
};
export const deleteTask = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const task = await Challenge.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id,
        });
        if (!task) {
            return res.status(404).json({ msg: "Task not found" });
        }
        return res.json({ msg: "Task deleted successfully" });
    }
    catch (err) {
        console.error("Delete error:", err);
        return res.status(500).json({ msg: "Server error" });
    }
};
export const generateAITask = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        const { recentDistance = 0, streakDays = 0, avgSpeed = 0 } = req.body;
        const recentTasks = await Challenge.find({
            owner: req.user._id,
            generatedByAI: true,
            createdAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        }).sort({ createdAt: -1 });
        const previousDescriptions = recentTasks.map((t) => t.description).join("\n- ");
        const prompt = `
You are a friendly AI fitness coach creating personalized and motivating challenges.
Previously suggested challenges (do NOT repeat also do not make challenges around these):
- ${previousDescriptions || "None"}

User stats:
- Recent distance: ${recentDistance} km
- Current streak: ${streakDays} days
- Average speed: ${avgSpeed} km/h

Generate ONE unique, conversational, and inspiring challenge that feels personal to this user. Include small encouragements or friendly phrases like "You got this!" or "Keep the momentum going!"

Include in JSON ONLY (no extra text):
{
  "description": "...",  // a short, motivational sentence (mention progress, streak, or captured areas)
  "difficulty": "...",   // easy | medium | hard (match logically with user's stats)
  "type": "...",         // run | walk | capture | streak
  "target": ...          // realistic numeric value (km or days)
}
Guidelines:
- Tailor the challenge to the user's recent performance.
- Use a friendly, always pushing harder/motivational tone.
- Do not repeat tasks created in the last 5 days.
- Ensure the challenge feels fresh, dynamic, and achievable.
`;
        let aiTask = null;
        let attempts = 0;
        do {
            const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                model: "mistralai/mistral-small-3.2-24b-instruct:free",
                messages: [{ role: "user", content: prompt }],
            }, {
                headers: {
                    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY ?? ""}`,
                    "Content-Type": "application/json",
                },
            });
            const aiMessageRaw = response.data?.choices?.[0]?.message?.content;
            if (typeof aiMessageRaw !== "string") {
                attempts += 1;
                continue;
            }
            const cleanedMessage = aiMessageRaw.replace(/```json|```/g, "").trim();
            try {
                const parsed = JSON.parse(cleanedMessage);
                if (parsed.description && parsed.difficulty && parsed.type && typeof parsed.target === "number") {
                    aiTask = parsed;
                }
            }
            catch {
                console.warn("AI returned invalid JSON, retrying...");
            }
            attempts += 1;
        } while (attempts < 2 &&
            (!aiTask || recentTasks.some((t) => t.description === aiTask?.description)));
        if (!aiTask) {
            return res.status(500).json({ msg: "AI generation failed" });
        }
        const newTask = await Challenge.create({
            owner: req.user._id,
            description: aiTask.description,
            title: aiTask.description,
            difficulty: aiTask.difficulty,
            type: aiTask.type,
            goal: aiTask.target,
            generatedByAI: true,
            expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        });
        return res.status(201).json({ msg: "AI-generated task created successfully", task: newTask });
    }
    catch (err) {
        console.error("AI Task generation error:", err);
        return res.status(500).json({ msg: "AI generation failed" });
    }
};
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
