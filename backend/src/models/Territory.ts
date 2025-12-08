import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

export interface ITerritoryMetrics {
  area: number | null;
  length: number | null;
}

export interface ITerritory {
  name?: string;
  owner: Types.ObjectId | null;
  location: {
    type: "Polygon";
    coordinates: number[][][];
  };
  metrics: ITerritoryMetrics;
  claimedOn?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TerritoryDocument = HydratedDocument<ITerritory>;
export type TerritoryModel = Model<ITerritory>;

const territorySchema = new Schema<ITerritory, TerritoryModel>(
  {
    name: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    location: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon",
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    metrics: {
      area: { type: Number, default: null },
      length: { type: Number, default: null },
    },
    claimedOn: { type: Date },
  },
  { timestamps: true }
);

territorySchema.index({ location: "2dsphere" });

const Territory = mongoose.model<ITerritory, TerritoryModel>("Territory", territorySchema);
export default Territory;
