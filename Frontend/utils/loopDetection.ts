// utils/loopDetection.ts

// --- Thresholds (you can tweak) ---
const MIN_POINTS = 60;
const MIN_ADD_DISTANCE_METERS = 4;
const MIN_LOOP_CLOSE_METERS = 30;
const MIN_PATH_LENGTH_METERS = 120;
const MIN_AREA_METERS2 = 500;
const MIN_DURATION_MS = 20_000;
const MIN_BBOX_DIAG_METERS = 30;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

// Haversine distance between [lng, lat] in meters
export const haversineMeters = (a: [number, number], b: [number, number]) => {
   const [lon1, lat1] = a;
   const [lon2, lat2] = b;
   const R = 6371000;
   const dLat = toRadians(lat2 - lat1);
   const dLon = toRadians(lon2 - lon1);
   const rLat1 = toRadians(lat1);
   const rLat2 = toRadians(lat2);

   const sinDlat = Math.sin(dLat / 2);
   const sinDlon = Math.sin(dLon / 2);
   const aHav =
      sinDlat * sinDlat + Math.cos(rLat1) * Math.cos(rLat2) * sinDlon * sinDlon;
   const c = 2 * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));
   return R * c;
};

// total path length
export const pathLengthMeters = (pts: [number, number][]) => {
   if (pts.length < 2) return 0;
   let sum = 0;
   for (let i = 1; i < pts.length; i++) {
      sum += haversineMeters(pts[i - 1], pts[i]);
   }
   return sum;
};

// polygon area in m² (shoelace formula with lat/lon → meters conversion)
export const polygonAreaMeters2 = (pts: [number, number][]) => {
   if (pts.length < 3) return 0;
   const meanLat =
      pts.reduce((acc, p) => acc + p[1], 0) / Math.max(1, pts.length);
   const latFactor = 110574;
   const lonFactor = 111320 * Math.cos(toRadians(meanLat));

   const XY = pts.map(([lon, lat]) => [lon * lonFactor, lat * latFactor]);

   let area = 0;
   for (let i = 0; i < XY.length; i++) {
      const [x1, y1] = XY[i];
      const [x2, y2] = XY[(i + 1) % XY.length];
      area += x1 * y2 - x2 * y1;
   }
   return Math.abs(area) / 2;
};

// bounding box diagonal in meters
export const bboxDiagMeters = (pts: [number, number][]) => {
   if (pts.length === 0) return 0;
   let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
   for (const [lon, lat] of pts) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
   }
   return haversineMeters([minLon, minLat], [maxLon, maxLat]);
};

// --- Main Loop Detection Function ---
export const isClosedLoop = (
   points: [number, number][],
   startTime: number | null
): boolean => {
   if (points.length < MIN_POINTS) return false;

   const first = points[0];
   const last = points[points.length - 1];
   const closeDist = haversineMeters(first, last);
   if (closeDist > MIN_LOOP_CLOSE_METERS) return false;

   const totalLen = pathLengthMeters(points);
   if (totalLen < MIN_PATH_LENGTH_METERS) return false;

   const area = polygonAreaMeters2([...points, points[0]]);
   if (area < MIN_AREA_METERS2) return false;

   const bboxDiag = bboxDiagMeters(points);
   if (bboxDiag < MIN_BBOX_DIAG_METERS) return false;

   if (startTime == null) return false;
   const duration = Date.now() - startTime;
   if (duration < MIN_DURATION_MS) return false;

   return true;
};

// Export thresholds if you want to tweak them in other places
export const LOOP_THRESHOLDS = {
   MIN_POINTS,
   MIN_ADD_DISTANCE_METERS,
   MIN_LOOP_CLOSE_METERS,
   MIN_PATH_LENGTH_METERS,
   MIN_AREA_METERS2,
   MIN_DURATION_MS,
   MIN_BBOX_DIAG_METERS,
};
