import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    lon: { type: Number, required: true },
    lat: { type: Number, required: true },
    ts: { type: Date },
  },
  { _id: false }
);

const territorySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, trim: true },
    geometry: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    encodedPolyline: { type: String },
    processedPoints: { type: [pointSchema], default: [] },
    rawPoints: { type: [pointSchema], default: [] },
    area: { type: Number, default: null },
    perimeter: { type: Number, default: null },
    claimedOn: { type: Date, default: Date.now },
    deviceInfo: {
      platform: { type: String, trim: true },
      appVersion: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

territorySchema.index({ geometry: "2dsphere" });

export default mongoose.model("Territory", territorySchema);
