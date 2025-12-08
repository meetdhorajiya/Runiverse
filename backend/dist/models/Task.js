import mongoose, { Schema } from "mongoose";
const taskSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
    },
    type: {
        type: String,
        enum: ["run", "walk", "capture", "streak"],
        required: true,
    },
    target: {
        type: Number,
        required: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
    },
    generatedByAI: { type: Boolean, default: false },
}, { timestamps: true });
taskSchema.methods.markCompleted = function () {
    this.completed = true;
    return this.save();
};
taskSchema.methods.isExpired = function () {
    return !!(this.expiresAt && this.expiresAt < new Date());
};
const Task = mongoose.model("Task", taskSchema);
export default Task;
