import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export type TaskDifficulty = "easy" | "medium" | "hard";
export type TaskType = "run" | "walk" | "capture" | "streak";

export interface ITask {
  userId: Types.ObjectId;
  description: string;
  difficulty: TaskDifficulty;
  type: TaskType;
  target: number;
  completed: boolean;
  createdAt: Date;
  expiresAt?: Date;
  generatedByAI: boolean;
  updatedAt: Date;
}

export interface ITaskMethods {
  markCompleted(): Promise<TaskDocument>;
  isExpired(): boolean;
}

export type TaskModel = Model<ITask, Record<string, never>, ITaskMethods>;
export type TaskDocument = HydratedDocument<ITask, ITaskMethods>;

const taskSchema = new Schema<ITask, TaskModel, ITaskMethods>(
  {
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
  },
  { timestamps: true }
);

taskSchema.methods.markCompleted = function (this: TaskDocument): Promise<TaskDocument> {
  this.completed = true;
  return this.save();
};

taskSchema.methods.isExpired = function (this: TaskDocument): boolean {
  return !!(this.expiresAt && this.expiresAt < new Date());
};

const Task = mongoose.model<ITask, TaskModel>("Task", taskSchema);
export default Task;
