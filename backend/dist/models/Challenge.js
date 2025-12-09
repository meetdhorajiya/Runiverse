import mongoose, { Schema } from "mongoose";
const challengeSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    goal: { type: Number, required: true, alias: "target" },
    type: {
        type: String,
        enum: ["steps", "distance", "run", "walk", "capture", "streak"],
        required: true,
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
    },
    generatedByAI: { type: Boolean, default: false },
    isDaily: { type: Boolean, default: false },
    isWeekly: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    expiresAt: { type: Date },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    progress: [
        {
            user: { type: Schema.Types.ObjectId, ref: "User" },
            currentProgress: { type: Number, default: 0 },
            completed: { type: Boolean, default: false },
        },
    ],
    completed: { type: Boolean, default: false },
}, {
    timestamps: true,
});
challengeSchema.set("toJSON", { virtuals: true });
challengeSchema.set("toObject", { virtuals: true });
challengeSchema.pre("save", function (next) {
    if (this.owner && (!this.participants || this.participants.length === 0)) {
        this.participants = [this.owner];
    }
    if (this.owner && (!this.progress || this.progress.length === 0)) {
        this.progress = [{ user: this.owner, currentProgress: 0, completed: false }];
    }
    next();
});
const Challenge = mongoose.model("Challenge", challengeSchema);
export default Challenge;
