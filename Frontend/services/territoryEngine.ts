import type { Feature, LineString, Polygon, Position } from "geojson";
import { lineString, polygon } from "@turf/helpers";
import lineIntersect from "@turf/line-intersect";
import booleanContains from "@turf/boolean-contains";
import booleanOverlap from "@turf/boolean-overlap";
import booleanIntersects from "@turf/boolean-intersects";
import union from "@turf/union";
import turfArea from "@turf/area";
import simplify from "@turf/simplify";
import { pathLengthMeters } from "@/utils/loopDetection";
import type { TerritoryFeature } from "@/services/territoryService";

export type LatLng = {
  latitude: number;
  longitude: number;
  timestamp?: number;
};

export interface TerritoryEngineConfig {
  minDistanceMeters?: number;
  minLoopAreaMeters?: number;
  simplifyTolerance?: number;
  maxRoutePoints?: number;
  minSegmentSamples?: number;
}

export interface TerritoryFeatureProperties {
  id?: string;
  name?: string;
  owner?: any;
  localId: string;
  area: number;
  length: number;
  claimedOn?: string | Date | null;
}

export type TerritoryFeatureShape = Feature<Polygon, TerritoryFeatureProperties>;

export interface HandleCoordinateResult {
  routeChanged: boolean;
  route: Position[];
  createdTerritory?: TerritoryFeatureShape;
  mergedTerritory?: TerritoryFeatureShape;
  mergedFromIndexes?: number[];
  territories: TerritoryFeatureShape[];
}

const DEFAULT_CONFIG: Required<TerritoryEngineConfig> = {
  minDistanceMeters: 10,
  minLoopAreaMeters: 200,
  simplifyTolerance: 0.00005,
  maxRoutePoints: 2000,
  minSegmentSamples: 4,
};

const createTerritoryFeature = (
  ring: Position[],
  properties?: Partial<TerritoryFeatureProperties>
): TerritoryFeatureShape => {
  const closedRing = ensureClosedRing(ring);
  const length = pathLengthMeters(closedRing as [number, number][]);
  const area = turfArea(polygon([closedRing]));

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [closedRing],
    },
    properties: {
      localId: properties?.localId ?? `territory-${Date.now()}`,
      claimedOn: properties?.claimedOn ?? new Date().toISOString(),
      area,
      length,
      id: properties?.id,
      name: properties?.name,
      owner: properties?.owner,
    },
  };
};

const ensureClosedRing = (ring: Position[]): Position[] => {
  if (!ring.length) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, [...first] as Position];
};

const positionsEqual = (a: Position, b: Position, epsilon = 1e-6): boolean => {
  return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon;
};

const dedupeSequentialPositions = (points: Position[], epsilon = 1e-6): Position[] => {
  if (points.length < 2) {
    return points;
  }
  const clean: Position[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const next = points[i];
    const prev = clean[clean.length - 1];
    if (!positionsEqual(prev, next, epsilon)) {
      clean.push(next);
    }
  }
  return clean;
};

const selectIntersectionPoint = (line: Feature<LineString>, segment: Feature<LineString>): Position | null => {
  const result = lineIntersect(line, segment);
  if (!result.features.length) {
    return null;
  }
  const first = result.features.find((feature) => feature.geometry?.type === "Point");
  if (first && "coordinates" in first.geometry && Array.isArray(first.geometry.coordinates)) {
    return first.geometry.coordinates as Position;
  }
  return null;
};

export class TerritoryEngine {
  private route: Position[] = [];

  private territories: TerritoryFeatureShape[] = [];

  private lastAppended?: Position;

  private readonly config: Required<TerritoryEngineConfig>;

  constructor(config?: TerritoryEngineConfig) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  }

  public hydrateTerritories(features: TerritoryFeatureShape[]) {
    this.territories = [...features];
  }

  public resetRoute() {
    this.route = [];
    this.lastAppended = undefined;
  }

  public seedRoute(path: [number, number][]) {
    this.route = [...path];
    this.lastAppended = this.route.length ? this.route[this.route.length - 1] : undefined;
  }

  public getRoute(): Position[] {
    return [...this.route];
  }

  public getTerritories(): TerritoryFeatureShape[] {
    return [...this.territories];
  }

  public handleNewCoordinate(coord: LatLng): HandleCoordinateResult | null {
    const newPosition: Position = [coord.longitude, coord.latitude];

    if (this.lastAppended && distanceMeters(this.lastAppended, newPosition) < this.config.minDistanceMeters) {
      return null;
    }

    if (this.route.length && positionsEqual(this.route[this.route.length - 1], newPosition)) {
      return null;
    }

    this.route = [...this.route, newPosition];
    this.lastAppended = newPosition;

    if (this.route.length > this.config.maxRoutePoints) {
      this.route = this.route.slice(this.route.length - this.config.maxRoutePoints);
    }

    const lastIndex = this.route.length - 1;
    if (lastIndex < this.config.minSegmentSamples) {
      return {
        routeChanged: true,
        route: [...this.route],
        territories: [...this.territories],
      };
    }

    const lastSegment = lineString([this.route[lastIndex - 1], this.route[lastIndex]]);

    for (let i = 0; i < lastIndex - 1; i += 1) {
      const segment = lineString([this.route[i], this.route[i + 1]]);
      const intersection = selectIntersectionPoint(segment, lastSegment);
      if (!intersection) {
        continue;
      }

      const ring = this.buildLoop(intersection, i + 1);
      if (!ring) {
        continue;
      }

      const normalized = simplify(polygon([ring]), {
        tolerance: this.config.simplifyTolerance,
        highQuality: false,
        mutate: true,
      });

      const simplifiedRing = normalized.geometry.type === "Polygon"
        ? normalized.geometry.coordinates[0] ?? []
        : ring;

      const dedupedRing = dedupeSequentialPositions(ensureClosedRing(simplifiedRing));
      if (dedupedRing.length < 4) {
        continue;
      }

      const feature = createTerritoryFeature(dedupedRing);
      if (feature.properties.area < this.config.minLoopAreaMeters) {
        continue;
      }

  const evaluation = this.evaluateAgainstExisting(feature);
      if (!evaluation) {
        continue;
      }

      const update: HandleCoordinateResult = {
        routeChanged: true,
        route: [...this.route],
        territories: [...this.territories],
      };

      if (evaluation.action === "ignore") {
        return update;
      }

      if (evaluation.action === "merge") {
        this.territories = this.territories.map((existing, index) =>
          index === evaluation.mergeIndex ? evaluation.feature : existing
        );
        update.mergedTerritory = evaluation.feature;
        update.mergedFromIndexes = [evaluation.mergeIndex];
        update.territories = [...this.territories];
        this.resetRoute();
        return update;
      }

      this.territories = [...this.territories, evaluation.feature];
      update.createdTerritory = evaluation.feature;
      update.territories = [...this.territories];
      this.resetRoute();
      return update;
    }

    return {
      routeChanged: true,
      route: [...this.route],
      territories: [...this.territories],
    };
  }

  private buildLoop(intersection: Position, startIndex: number): Position[] | null {
    const loop: Position[] = [intersection];
    for (let i = startIndex; i < this.route.length; i += 1) {
      loop.push(this.route[i]);
    }
    loop.push(intersection);
    const clean = dedupeSequentialPositions(loop);
    return clean.length >= 4 ? clean : null;
  }

  private evaluateAgainstExisting(feature: TerritoryFeatureShape):
    | { action: "ignore"; feature: TerritoryFeatureShape }
    | { action: "add"; feature: TerritoryFeatureShape }
    | { action: "merge"; feature: TerritoryFeatureShape; mergeIndex: number }
    | null {
    const newArea = feature.properties.area;

    for (let i = 0; i < this.territories.length; i += 1) {
      const existing = this.territories[i];
      const existingArea = existing.properties.area;
      const areaDiffRatio = Math.abs(existingArea - newArea) / Math.max(existingArea, newArea);

      if (areaDiffRatio < 0.05) {
        const containsExisting = booleanContains(existing, feature);
        const containsNew = booleanContains(feature, existing);
        if (containsExisting || containsNew) {
          return { action: "ignore", feature };
        }
      }

      if (
        booleanIntersects(existing as any, feature as any) ||
        booleanOverlap(existing as any, feature as any) ||
        booleanContains(existing as any, feature as any) ||
        booleanContains(feature as any, existing as any)
      ) {
        const merged = union(existing as any, feature as any) as Feature<Polygon> | null;
        if (merged && merged.geometry && merged.geometry.type === "Polygon") {
          const mergedRing = merged.geometry.coordinates[0] ?? [];
          const mergedFeature = createTerritoryFeature(mergedRing, {
            id: existing.properties.id,
            localId: existing.properties.localId,
          });
          return { action: "merge", feature: mergedFeature, mergeIndex: i };
        }
      }
    }

    return { action: "add", feature };
  }
}

const distanceMeters = (coord1: Position, coord2: Position): number => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const toEngineTerritory = (territory: TerritoryFeature): TerritoryFeatureShape => {
  const ring = Array.isArray(territory.geometry?.coordinates?.[0])
    ? (territory.geometry.coordinates[0] as Position[])
    : [];
  const area = typeof territory.properties?.area === "number"
    ? territory.properties.area
    : turfArea(polygon([ring]));
  const length = typeof territory.properties?.length === "number"
    ? territory.properties.length
    : pathLengthMeters(ring as [number, number][]);

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ensureClosedRing(ring)],
    },
    properties: {
      id: territory.properties?.id,
      name: territory.properties?.name,
      owner: territory.properties?.owner,
      localId: territory.properties?.localId ?? `territory-${Date.now()}`,
      area,
      length,
      claimedOn: territory.properties?.claimedOn ?? null,
    },
  };
};

export const fromEngineTerritory = (territory: TerritoryFeatureShape): TerritoryFeature => ({
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: territory.geometry.coordinates as [Array<[number, number]>],
  },
  properties: {
    id: territory.properties.id,
    name: territory.properties.name,
    owner: territory.properties.owner,
    area: territory.properties.area,
    length: territory.properties.length,
    claimedOn: territory.properties.claimedOn ?? null,
    localId: territory.properties.localId,
  },
});
