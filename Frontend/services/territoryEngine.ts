import lineIntersect from "@turf/line-intersect";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import simplify from "@turf/simplify";
import area from "@turf/area";
import length from "@turf/length";
import { lineString, point, polygon } from "@turf/helpers";

export type Position = [number, number];

export interface EngineConfig {
  minDistanceMeters: number;
  simplifyTolerance: number;
  minSegmentSamples: number;
  minLoopAreaMeters: number;
}

export interface HandleResult {
  routeChanged: boolean;
  route: Position[];
  territories: any[];
  createdTerritory?: any;
  mergedTerritory?: any;
}

const DEFAULT_CONFIG: EngineConfig = {
  minDistanceMeters: 6,
  simplifyTolerance: 0.00001,
  minSegmentSamples: 6,
  minLoopAreaMeters: 10,
};

const ensureClosedRing = (ring: Position[]): Position[] => {
  if (!ring.length) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first];
  }
  return ring;
};

const dedupeSequentialPositions = (points: Position[], tol = 1e-7): Position[] => {
  if (!points.length) return [];
  const out: Position[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (Math.abs(prev[0] - curr[0]) > tol || Math.abs(prev[1] - curr[1]) > tol) {
      out.push(curr);
    }
  }
  return out;
};

const makeTerritory = (ring: Position[]) => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [ring],
  },
});

const metersBetween = (a: Position, b: Position): number => {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default class TerrotorieEngine {
  private config: EngineConfig;

  private route: Position[] = [];

  private territories: any[] = [];

  constructor(config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  }

  reset() {
    this.route = [];
    this.territories = [];
  }

  seedRoute(points: Position[]) {
    this.route = points.slice();
  }

  getRoute() {
    return [...this.route];
  }

  handleNewCoordinate(coord: { latitude: number; longitude: number; timestamp?: number }): HandleResult {
    const next: Position = [coord.longitude, coord.latitude];
    const last = this.route[this.route.length - 1];

    if (last && last[0] === next[0] && last[1] === next[1]) {
      return { routeChanged: false, route: [...this.route], territories: [...this.territories] };
    }

    this.route.push(next);

    if (this.route.length < this.config.minSegmentSamples) {
      return { routeChanged: true, route: [...this.route], territories: [...this.territories] };
    }

    const closure = this.detectClosure();
    if (closure) {
      const loop = this.buildLoop(closure.coord, closure.startIndex);
      if (loop) {
        const terr = makeTerritory(loop);
        const evalResult = this.evaluateTerritory(terr);
        if (evalResult?.action === "add") {
          this.territories.push(evalResult.feature);
          return {
            routeChanged: true,
            route: [...this.route],
            territories: [...this.territories],
            createdTerritory: evalResult.feature,
          };
        }
      }
    }

    return { routeChanged: true, route: [...this.route], territories: [...this.territories] };
  }

  finalizeAfterRun(): HandleResult {
    const n = this.route.length - 1;
    if (n < this.config.minSegmentSamples) {
      return { routeChanged: false, route: [...this.route], territories: [...this.territories] };
    }

    for (let j = 0; j < n - 2; j += 1) {
      for (let i = j + 2; i < n; i += 1) {
        const inter = this.lineIntersection(this.route[j], this.route[j + 1], this.route[i], this.route[i + 1]);
        if (inter) {
          const loop = this.buildLoop(inter, j + 1);
          if (loop) {
            const terr = makeTerritory(loop);
            const evalResult = this.evaluateTerritory(terr);
            if (evalResult?.action === "add") {
              this.territories.push(evalResult.feature);
              return {
                routeChanged: true,
                route: [...this.route],
                territories: [...this.territories],
                createdTerritory: evalResult.feature,
              };
            }
          }
        }
      }
    }

    return { routeChanged: false, route: [...this.route], territories: [...this.territories] };
  }

  private detectClosure() {
    const lastIdx = this.route.length - 1;
    const lastPoint = this.route[lastIdx];
    const tailGuard = Math.max(this.config.minSegmentSamples, 4);

    // exact intersections as we append new segment
    const a = this.route[lastIdx - 1];
    const b = this.route[lastIdx];
    for (let i = 0; i < lastIdx - 2; i += 1) {
      const inter = this.lineIntersection(a, b, this.route[i], this.route[i + 1]);
      if (inter) {
        return { coord: inter, startIndex: i + 1 };
      }
    }

    // proximity snap (vertex or projection)
    const threshold = Math.max(this.config.minDistanceMeters * 1.4, 10);
    for (let i = 0; i < lastIdx - tailGuard; i += 1) {
      const candidate = this.route[i];
      const dist = metersBetween(candidate, lastPoint);
      if (dist <= threshold) {
        return { coord: candidate, startIndex: i + 1 };
      }
      const seg = lineString([this.route[i], this.route[i + 1]]);
      const proj = nearestPointOnLine(seg, point(lastPoint));
      if (proj.properties && typeof proj.properties.dist === "number" && proj.properties.dist <= threshold) {
        return { coord: proj.geometry.coordinates as Position, startIndex: i + 1 };
      }
    }

    return null;
  }

  private buildLoop(intersection: Position, startIndex: number): Position[] | null {
    const loop: Position[] = [intersection];
    for (let i = startIndex; i < this.route.length; i += 1) {
      loop.push(this.route[i]);
    }
    loop.push(intersection);
    let ring = ensureClosedRing(loop);
    ring = dedupeSequentialPositions(ring);
    if (ring.length < 4) return null;

    const simplified = simplify(polygon([ring]), {
      tolerance: this.config.simplifyTolerance,
      highQuality: false,
    });
    const coords = simplified.geometry.type === "Polygon" ? simplified.geometry.coordinates[0] ?? ring : ring;
    return ensureClosedRing(coords as Position[]);
  }

  private evaluateTerritory(feature: any) {
    const polygonArea = area(feature);
    if (polygonArea < this.config.minLoopAreaMeters) {
      return { action: "ignore" as const };
    }

    const perimeterMeters = length(feature, { units: "meters" });
    return {
      action: "add" as const,
      feature: {
        ...feature,
        properties: {
          ...feature.properties,
          area: polygonArea,
          perimeter: perimeterMeters,
        },
      },
    };
  }

  private lineIntersection(a: Position, b: Position, c: Position, d: Position): Position | null {
    const res = lineIntersect(lineString([a, b]), lineString([c, d]));
    if (!res.features.length) {
      return null;
    }
    const coords = res.features[0].geometry.coordinates as Position;
    return [coords[0], coords[1]];
  }
}
