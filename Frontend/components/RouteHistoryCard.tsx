import { useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Svg, Polygon, Polyline, Circle } from "react-native-svg";
import { StyledText, StyledView } from "./Styled";
import type { RouteHistoryEntry } from "@/services/routeHistoryService";

const CANVAS_WIDTH = 140;
const CANVAS_HEIGHT = 170;
const CANVAS_PADDING = 12;

interface SvgPoint {
  x: number;
  y: number;
}

const useSvgPoints = (coordinates: RouteHistoryEntry["coordinates"]) => {
  return useMemo(() => {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return {
        polygonPoints: "",
        polylinePoints: "",
        start: null as SvgPoint | null,
        end: null as SvgPoint | null,
      };
    }

    const lats = coordinates.map((coord) => coord.latitude);
    const lons = coordinates.map((coord) => coord.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latRange = Math.max(maxLat - minLat, 1e-6);
    const lonRange = Math.max(maxLon - minLon, 1e-6);

    const scale = Math.min(
      (CANVAS_WIDTH - CANVAS_PADDING * 2) / lonRange,
      (CANVAS_HEIGHT - CANVAS_PADDING * 2) / latRange
    );

    const offsetX = (CANVAS_WIDTH - scale * lonRange) / 2;
    const offsetY = (CANVAS_HEIGHT - scale * latRange) / 2;

    const project = (latitude: number, longitude: number): SvgPoint => {
      const x = (longitude - minLon) * scale + offsetX;
      const y = (maxLat - latitude) * scale + offsetY;
      return { x, y };
    };

    const svgPoints = coordinates.map((coord) => project(coord.latitude, coord.longitude));

    const pointString = svgPoints
      .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");

    const canRenderPolygon = svgPoints.length >= 3;

    return {
      polygonPoints: canRenderPolygon ? `${pointString} ${pointString.split(" ")[0]}` : "",
      polylinePoints: canRenderPolygon ? "" : pointString,
      start: svgPoints[0],
      end: svgPoints[svgPoints.length - 1],
    };
  }, [coordinates]);
};

const formatDate = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return { label: "Unknown", details: date };
  }

  const label = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(parsed);

  const details = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);

  return { label: label.toUpperCase(), details };
};

interface Props {
  entry: RouteHistoryEntry;
}

export const RouteHistoryCard = ({ entry }: Props) => {
  const { polygonPoints, polylinePoints, start, end } = useSvgPoints(entry.coordinates);
  const { label, details } = formatDate(entry.date);

  const hasShape = polygonPoints.length > 0 || polylinePoints.length > 0;

  return (
    <LinearGradient
      colors={["#1e1b4b", "#312e81", "#047857"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="w-[180px] h-[260px] rounded-3xl p-4 justify-between"
    >
      <StyledView>
        <StyledText className="text-white text-xs tracking-[2px] font-semibold">
          {label}
        </StyledText>
        <StyledText className="text-white/80 text-sm font-medium mt-1">
          {details}
        </StyledText>
      </StyledView>

      <StyledView className="flex-1 my-4 rounded-2xl bg-black/15 overflow-hidden items-center justify-center">
        {hasShape ? (
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
            {polygonPoints ? (
              <Polygon
                points={polygonPoints}
                fill="rgba(255,255,255,0.12)"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ) : (
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )}

            {start ? (
              <Circle cx={start.x} cy={start.y} r={5} fill="#22c55e" />
            ) : null}

            {end ? (
              <Circle cx={end.x} cy={end.y} r={5} fill="#f97316" />
            ) : null}
          </Svg>
        ) : (
          <StyledText className="text-white/70 text-xs">
            No path captured
          </StyledText>
        )}
      </StyledView>

      <StyledView>
        <StyledText className="text-white/70 text-xs uppercase tracking-wide">
          Distance
        </StyledText>
        <StyledText className="text-white text-2xl font-bold mt-1">
          {entry.totalDistanceKm.toFixed(2)} km
        </StyledText>
        <StyledText className="text-white/60 text-[11px] mt-2">
          Polygon rendered from recorded coordinates
        </StyledText>
      </StyledView>
    </LinearGradient>
  );
};