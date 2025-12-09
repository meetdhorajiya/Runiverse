import { describe, expect, it } from "@jest/globals";
import {
  closeRing,
  computeAreaPerimeterFromRings,
  computeLineLengthMeters,
  dedupeConsecutive,
  sanitizeLineString,
  sanitizePolygonRings,
} from "../../dist/utils/geometry.js";

describe("geometry utilities", () => {
  const baseRing = [
    [0, 0],
    [0, 0.001],
    [0.001, 0.001],
    [0.001, 0],
  ] as const;

  it("deduplicates consecutive points before closing a ring", () => {
    const ringWithDuplicates = [[0, 0], [0, 0], [0.001, 0.001], [0, 0.001], [0, 0]] as const;
    const deduped = dedupeConsecutive(ringWithDuplicates as unknown as number[][]);
    expect(deduped).toHaveLength(4);
    expect(deduped[0]).toEqual([0, 0]);
    const closed = closeRing(deduped as unknown as number[][]);
    expect(closed[0]).toEqual(closed[closed.length - 1]);
  });

  it("sanitizes polygon rings and ensures closure", () => {
    const dirtyRing = [
      [0, 0],
      [0, 0],
      [0.001, 0.001],
      ["nan", 0.5],
      [0.001, 0],
    ];
    const sanitized = sanitizePolygonRings([dirtyRing, [[1, 1], [1, 2]]]);
    expect(sanitized).not.toBeNull();
    expect(sanitized![0][0]).toEqual([0, 0]);
    expect(sanitized![0][sanitized![0].length - 1]).toEqual([0, 0]);
  });

  it("computes non-zero area and perimeter for valid rings", () => {
    const sanitized = sanitizePolygonRings([baseRing]);
    expect(sanitized).not.toBeNull();
    const metrics = computeAreaPerimeterFromRings(sanitized!);
    expect(metrics.area).toBeGreaterThan(0);
    expect(metrics.perimeter).toBeGreaterThan(0);
  });

  it("sanitizes line strings and computes length", () => {
    const dirtyLine = [[0, 0], [0, 0], [0.001, 0.001]];
    const sanitized = sanitizeLineString(dirtyLine);
    expect(sanitized).not.toBeNull();
    expect(sanitized).toHaveLength(2);
    const length = computeLineLengthMeters(sanitized!);
    expect(length).toBeGreaterThan(0);
  });
});
