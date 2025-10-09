import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  lastName: { type: String },
  mobileNumber: { type: String },
  steps: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  territories: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  multiplier: { type: Number, default: 1 },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }],
  location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], default: [0, 0] } },
  oauthProvider: { type: String },
  oauthId: { type: String, index: true },
  displayName: { type: String },
  avatar: { type: String },
}, { timestamps: true });

userSchema.index({ location: "2dsphere" });

// Stat update methods
userSchema.methods.updateSteps = function(newSteps) { this.steps += newSteps; return this.save(); };
userSchema.methods.updateDistance = function(newDistance) { this.distance += newDistance; return this.save(); };
userSchema.methods.addTerritory = function() { this.territories += 1; return this.save(); };
userSchema.methods.updateStreak = function() { this.streak += 1; this.multiplier = 1 + this.streak * 0.1; return this.save(); };
userSchema.methods.resetStreak = function() { this.streak = 0; this.multiplier = 1; return this.save(); };
userSchema.methods.updateLocation = function(lng, lat) { this.location = { type: "Point", coordinates: [lng, lat] }; return this.save(); };

export default mongoose.model("User", userSchema);
