import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export type ChallengeType = "steps" | "distance" | "run" | "walk" | "capture" | "streak";
export type ChallengeDifficulty = "easy" | "medium" | "hard";

export interface IChallengeProgress {
  user: Types.ObjectId;
  currentProgress: number;
  completed: boolean;
}

export interface IChallenge {
  owner: Types.ObjectId;
  title: string;
  description?: string;
  goal: number;
  target?: number;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  generatedByAI: boolean;
  isDaily: boolean;
  isWeekly: boolean;
  startDate?: Date;
  endDate?: Date;
  expiresAt?: Date;
  participants: Types.ObjectId[];
  progress: IChallengeProgress[];
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ChallengeDocument = HydratedDocument<IChallenge>;
export type ChallengeModel = Model<IChallenge>;

const challengeSchema = new Schema<IChallenge, ChallengeModel>(
  {
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
  },
  {
    timestamps: true,
  }
);

challengeSchema.set("toJSON", { virtuals: true });
challengeSchema.set("toObject", { virtuals: true });

challengeSchema.pre("save", function (this: ChallengeDocument, next) {
  if (this.owner && (!this.participants || this.participants.length === 0)) {
    this.participants = [this.owner];
  }
  if (this.owner && (!this.progress || this.progress.length === 0)) {
    this.progress = [{ user: this.owner, currentProgress: 0, completed: false }];
  }
  next();
});

const Challenge = mongoose.model<IChallenge, ChallengeModel>("Challenge", challengeSchema);
export default Challenge;
