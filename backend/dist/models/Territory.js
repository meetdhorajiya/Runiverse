import mongoose, { Schema } from "mongoose";
const geometrySchema = new Schema({
    type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
        required: true,
    },
    coordinates: {
        type: [[[Number]]],
        required: true,
    },
}, { _id: false });
const deviceInfoSchema = new Schema({
    platform: { type: String },
    model: { type: String },
    osVersion: { type: String },
    appVersion: { type: String },
    accuracyMeters: { type: Number },
    source: { type: String },
}, { _id: false });
const territorySchema = new Schema({
    name: { type: String, default: "Unnamed Territory", trim: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    geometry: { type: geometrySchema, default: undefined },
    encodedPolyline: { type: String },
    processedPoints: { type: [[[Number]]], default: [] },
    rawPoints: { type: Schema.Types.Mixed, default: [] },
    area: { type: Number, default: null },
    perimeter: { type: Number, default: null },
    claimedOn: { type: Date },
    deviceInfo: { type: deviceInfoSchema },
    geometry_migrated: { type: Boolean, default: false },
}, { timestamps: true });
territorySchema.index({ geometry: "2dsphere" });
const Territory = mongoose.model("Territory", territorySchema);
export default Territory;
