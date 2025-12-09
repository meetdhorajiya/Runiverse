import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface IRoutePoint {
  latitude: number;
  longitude: number;
  elevation?: number | null;
  recordedAt?: Date | null;
}

export interface IRoute {
  user: Types.ObjectId;
  rawPoints: IRoutePoint[];
  processedPoints: IRoutePoint[];
  encodedPolyline?: string;
  startedAt: Date;
  endedAt?: Date | null;
  distanceMeters: number;
  durationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

export type RouteDocument = HydratedDocument<IRoute>;
export type RouteModel = Model<IRoute>;

const routePointSchema = new Schema<IRoutePoint>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    elevation: { type: Number, default: null },
    recordedAt: { type: Date, default: null },
  },
  { _id: false }
);

const routeSchema = new Schema<IRoute, RouteModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rawPoints: { type: [routePointSchema], default: [] },
    processedPoints: { type: [routePointSchema], default: [] },
    encodedPolyline: { type: String },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    distanceMeters: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

routeSchema.index({ user: 1, startedAt: -1 });

const Route = mongoose.model<IRoute, RouteModel>("Route", routeSchema);
export default Route;
