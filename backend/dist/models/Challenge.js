import mongoose, { Schema } from "mongoose";
const challengeSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    goal: { type: Number, required: true },
    type: { type: String, enum: ["steps", "distance"], required: true },
    isDaily: { type: Boolean, default: false },
    isWeekly: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    progress: [
        {
            user: { type: Schema.Types.ObjectId, ref: "User" },
            currentProgress: { type: Number, default: 0 },
            completed: { type: Boolean, default: false },
        },
    ],
}, { timestamps: true });
const Challenge = mongoose.model("Challenge", challengeSchema);
export default Challenge;
