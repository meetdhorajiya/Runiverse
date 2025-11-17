import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    lon: { type: Number, required: true },
    lat: { type: Number, required: true },
    ts: { type: Date },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rawPoints: { type: [pointSchema], default: [] },
    processedPoints: { type: [pointSchema], default: [] },
    encodedPolyline: { type: String },
    startedAt: { type: Date },
    endedAt: { type: Date },
    distanceMeters: { type: Number },
    durationSeconds: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("Route", routeSchema);
