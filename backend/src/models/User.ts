import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  password: string;
  lastName?: string;
  mobileNumber?: string;
  steps: number;
  distance: number;
  lifetimeSteps: number;
  lifetimeDistance: number;
  dailyResetAt: Date | null;
  territories: number;
  streak: number;
  multiplier: number;
  city?: string;
  badges: Types.ObjectId[];
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  displayName?: string;
  avatarUrl: string;
  avatarPublicId: string;
  avatarProvider: string;
  avatar?: string | null;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  ensureDailyReset(referenceDate?: Date): void;
  updateSteps(newSteps: number, referenceDate?: Date): UserDocument;
  updateDistance(newDistance: number, referenceDate?: Date): UserDocument;
  addTerritory(): Promise<UserDocument>;
  updateStreak(): Promise<UserDocument>;
  resetStreak(): Promise<UserDocument>;
  updateLocation(lng: number, lat: number): Promise<UserDocument>;
  setAvatar(url: string, publicId: string, provider?: string): Promise<UserDocument>;
  clearAvatar(): Promise<UserDocument>;
}

export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    lastName: { type: String },
    mobileNumber: { type: String },
    steps: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    lifetimeSteps: { type: Number, default: 0 },
    lifetimeDistance: { type: Number, default: 0 },
    dailyResetAt: { type: Date, default: null },
    territories: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    multiplier: { type: Number, default: 1 },
    city: { type: String, trim: true },
    badges: [{ type: Schema.Types.ObjectId, ref: "Badge" }],
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    displayName: { type: String },
    avatarUrl: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    avatarProvider: { type: String, default: "cloudinary" },
    avatar: { type: String },
    bio: { type: String },
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

userSchema.methods.ensureDailyReset = function (this: UserDocument, referenceDate: Date = new Date()): void {
  const startOfDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (!this.dailyResetAt || this.dailyResetAt < startOfDay) {
    this.steps = 0;
    this.distance = 0;
    this.dailyResetAt = startOfDay;
  }
};

userSchema.methods.updateSteps = function (this: UserDocument, newSteps: number, referenceDate: Date = new Date()): UserDocument {
  if (!Number.isFinite(newSteps) || newSteps <= 0) {
    return this;
  }
  this.ensureDailyReset(referenceDate);
  this.steps += newSteps;
  this.lifetimeSteps += newSteps;
  return this;
};

userSchema.methods.updateDistance = function (this: UserDocument, newDistance: number, referenceDate: Date = new Date()): UserDocument {
  if (!Number.isFinite(newDistance) || newDistance <= 0) {
    return this;
  }
  this.ensureDailyReset(referenceDate);
  this.distance += newDistance;
  this.lifetimeDistance += newDistance;
  return this;
};

userSchema.methods.addTerritory = function (this: UserDocument): Promise<UserDocument> {
  this.territories += 1;
  return this.save();
};

userSchema.methods.updateStreak = function (this: UserDocument): Promise<UserDocument> {
  this.streak += 1;
  this.multiplier = 1 + this.streak * 0.1;
  return this.save();
};

userSchema.methods.resetStreak = function (this: UserDocument): Promise<UserDocument> {
  this.streak = 0;
  this.multiplier = 1;
  return this.save();
};

userSchema.methods.updateLocation = function (this: UserDocument, lng: number, lat: number): Promise<UserDocument> {
  this.location = { type: "Point", coordinates: [lng, lat] };
  return this.save();
};

userSchema.methods.setAvatar = function (this: UserDocument, url: string, publicId: string, provider = "cloudinary"): Promise<UserDocument> {
  this.avatarUrl = url;
  this.avatarPublicId = publicId;
  this.avatarProvider = provider;
  return this.save();
};

userSchema.methods.clearAvatar = function (this: UserDocument): Promise<UserDocument> {
  this.avatarUrl = "";
  this.avatarPublicId = "";
  this.avatarProvider = "cloudinary";
  this.avatar = null;
  return this.save();
};

const User = mongoose.model<IUser, UserModel>("User", userSchema);
export default User;
