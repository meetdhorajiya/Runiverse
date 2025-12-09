import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export type CoordinateTuple = [number, number];
export type PolygonRings = CoordinateTuple[][];

export interface IDeviceInfo {
  platform?: string;
  model?: string;
  osVersion?: string;
  appVersion?: string;
  accuracyMeters?: number;
  source?: string;
}

export interface ITerritory {
  name: string;
  owner: Types.ObjectId | null;
  geometry?: {
    type: "Polygon";
    coordinates: PolygonRings;
  } | null;
  encodedPolyline?: string;
  processedPoints: PolygonRings;
  rawPoints: unknown;
  area: number | null;
  perimeter: number | null;
  claimedOn?: Date;
  deviceInfo?: IDeviceInfo;
  geometry_migrated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TerritoryDocument = HydratedDocument<ITerritory>;
export type TerritoryModel = Model<ITerritory>;

const geometrySchema = new Schema(
  {
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
  },
  { _id: false }
);

const deviceInfoSchema = new Schema<IDeviceInfo>(
  {
    platform: { type: String },
    model: { type: String },
    osVersion: { type: String },
    appVersion: { type: String },
    accuracyMeters: { type: Number },
    source: { type: String },
  },
  { _id: false }
);

const territorySchema = new Schema<ITerritory, TerritoryModel>(
  {
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
  },
  { timestamps: true }
);

territorySchema.index({ geometry: "2dsphere" });

const Territory = mongoose.model<ITerritory, TerritoryModel>("Territory", territorySchema);
export default Territory;
