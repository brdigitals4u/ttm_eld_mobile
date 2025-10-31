// FMCSA-compliant HOS Chart
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import Svg, { Rect, Line as SvgLine, Text as SvgText } from "react-native-svg";

/**
 * FMCSA HOS Chart Component
 * Displays duty status changes over a 24-hour period
 * Supports: OFF_DUTY, SLEEPER, DRIVING, ON_DUTY
 */

// FMCSA standard colors with theme
const THEME_COLOR = "#0071ce";
const THEME_LIGHT = "#E0F2FE"; // Light variant of primary color

const FMCSA_STATUS = {
  OFF_DUTY: { key: "OFF_DUTY", label: "OFF", shortLabel: "OFF", color: "#F3F4F6", row: 1, iconColor: "#6B7280" },
  SLEEPER: { key: "SLEEPER", label: "SB", shortLabel: "SB", color: "#FFFFFF", row: 2, iconColor: "#1F2937" },
  DRIVING: { key: "DRIVING", label: "D", shortLabel: "D", color: "#ECFDF5", row: 3, iconColor: "#059669" },
  ON_DUTY: { key: "ON_DUTY", label: "ON", shortLabel: "ON", color: "#FFF7ED", row: 4, iconColor: "#D97706" },
};

type StatusKey = keyof typeof FMCSA_STATUS;

type LogEntry = {
  start: string | Date;
  end: string | Date;
  status: string;
  note?: string;
};

interface HOSChartProps {
  data?: LogEntry[];
  dayStartIso: string;
  header?: {
    recordDate?: string;
    timezoneOffset?: string;
    carrierName?: string;
    usdot?: string;
    driverName?: string;
    driverId?: string;
  };
  onSegmentPress?: (segment: any) => void;
}

function parseISO(iso: string | Date): Date {
  return iso instanceof Date ? iso : new Date(iso);
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function normalizeStatus(status: string): StatusKey {
  const s = status.toUpperCase().replace(/[_\s-]/g, "_");
  if (s.includes("DRIVING") || s === "DR") return "DRIVING";
  if (s.includes("SLEEPER") || s === "SB") return "SLEEPER";
  if (s.includes("ON") && s.includes("DUTY")) return "ON_DUTY";
  if (s.includes("OFF") && s.includes("DUTY")) return "OFF_DUTY";
  return "OFF_DUTY";
}

export default function HOSChart({ data = [], dayStartIso, header = {}, onSegmentPress }: HOSChartProps) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 20; // Full screen width with minimal padding
  const ROW_HEIGHT = 40;
  const CHART_HEIGHT = ROW_HEIGHT * 4;
  const LEFT_MARGIN = 45; // Minimal margin for labels
  const RIGHT_MARGIN = 16; // Just small padding on right
  const TOP_MARGIN = 32; // More top padding for hour labels
  const BOTTOM_MARGIN = 12; // Minimal bottom padding
  const TOTAL_HEIGHT = CHART_HEIGHT + TOP_MARGIN + BOTTOM_MARGIN;
  const drawingWidth = chartWidth - LEFT_MARGIN - RIGHT_MARGIN;

  const dayStart = parseISO(dayStartIso);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Normalize and clip segments to 24-hour window
  const segments = useMemo(() => {
    return data
      .map((s) => {
        const a = parseISO(s.start);
        const b = parseISO(s.end);
        const startClipped = a < dayStart ? dayStart : a;
        const endClipped = b > dayEnd ? dayEnd : b;
        const minutesFromStart = Math.max(0, minutesBetween(dayStart, startClipped));
        const durationMin = Math.max(0, minutesBetween(startClipped, endClipped));
        const statusKey = normalizeStatus(s.status);
        return {
          ...s,
          start: a,
          end: b,
          startClipped,
          endClipped,
          minutesFromStart,
          durationMin,
          statusKey,
          row: FMCSA_STATUS[statusKey].row,
        };
      })
      .filter((s) => s.durationMin > 0)
      .sort((a, b) => a.minutesFromStart - b.minutesFromStart);
  }, [data, dayStartIso]);

  const minuteToX = (m: number) => LEFT_MARGIN + (m / (24 * 60)) * drawingWidth;
  const rowToY = (row: number) => TOP_MARGIN + (row - 1) * ROW_HEIGHT;

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats: Record<StatusKey, number> = {
      OFF_DUTY: 0,
      SLEEPER: 0,
      DRIVING: 0,
      ON_DUTY: 0,
    };
    
    segments.forEach((seg) => {
      stats[seg.statusKey] += seg.durationMin;
    });
    
    return stats;
  }, [segments]);

  const formatDuration = (minutes: number): string => {
    const totalMinutes = Math.floor(minutes);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    // Since we're working with minutes, seconds are always 00
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
  };

  // Hour tick marks with custom labels
  const getHourLabel = (hour: number): string => {
    if (hour === 0) return "M";
    if (hour === 12) return "N";
    if (hour > 12) return String(hour - 12);
    return String(hour);
  };

  const hourTicks = Array.from({ length: 25 }, (_, i) => i);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Header */}
        {header.driverName && (
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {header.driverName} • {header.recordDate || dayStartIso.slice(0, 10)}
            </Text>
            {header.carrierName && (
              <Text style={styles.subHeaderText}>
                {header.carrierName} {header.usdot ? `• DOT ${header.usdot}` : ""}
              </Text>
            )}
          </View>
        )}

        {/* Chart */}
        <Svg width={chartWidth} height={TOTAL_HEIGHT}>
          {/* Row backgrounds */}
          {Object.values(FMCSA_STATUS).map((status) => {
            const y = rowToY(status.row);
            return (
              <Rect
                key={`bg-${status.key}`}
                x={LEFT_MARGIN}
                y={y}
                width={drawingWidth}
                height={ROW_HEIGHT}
                fill={status.color}
                opacity={0.5}
              />
            );
          })}

          {/* Main chart background */}
          <Rect x={LEFT_MARGIN} y={TOP_MARGIN} width={drawingWidth} height={CHART_HEIGHT} fill="#FFFFFF" stroke="#E5E7EB" strokeWidth={1} />

          {/* Row dividers and labels */}
          {Object.values(FMCSA_STATUS).map((status) => {
            const y = rowToY(status.row);
            return (
              <React.Fragment key={status.key}>
                <SvgLine x1={LEFT_MARGIN} y1={y} x2={LEFT_MARGIN + drawingWidth} y2={y} stroke="#E5E7EB" strokeWidth={1} />
                {/* Status text label */}
                <SvgText x={10} y={y + ROW_HEIGHT / 2 + 4} textAnchor="start" fontSize="13" fill="#374151" fontWeight="700">
                  {status.shortLabel}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Bottom border */}
          <SvgLine
            x1={LEFT_MARGIN}
            y1={TOP_MARGIN + CHART_HEIGHT}
            x2={LEFT_MARGIN + drawingWidth}
            y2={TOP_MARGIN + CHART_HEIGHT}
            stroke="#9CA3AF"
            strokeWidth={2}
          />

          {/* Hour grid lines and labels */}
          {hourTicks.map((hour) => {
            const x = minuteToX(hour * 60);
            const isMajor = hour % 1 === 0;
            const label = getHourLabel(hour);
            return (
              <React.Fragment key={hour}>
                <SvgLine
                  x1={x}
                  y1={TOP_MARGIN}
                  x2={x}
                  y2={TOP_MARGIN + CHART_HEIGHT}
                  stroke={isMajor ? "#D1D5DB" : "#F3F4F6"}
                  strokeWidth={isMajor ? 1 : 0.5}
                />
                {isMajor && (
                  <SvgText x={x} y={TOP_MARGIN - 8} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">
                    {label}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}

          {/* Status segments with step lines */}
          {segments.map((seg, i) => {
            const x1 = minuteToX(seg.minutesFromStart);
            const x2 = minuteToX(seg.minutesFromStart + seg.durationMin);
            const y = rowToY(seg.row) + ROW_HEIGHT / 2;
            const status = FMCSA_STATUS[seg.statusKey];
            const prevSeg = segments[i - 1];
            const nextSeg = segments[i + 1];

            return (
              <React.Fragment key={`seg-${i}`}>
                {/* Horizontal line for this status - thicker and clearer */}
                <SvgLine
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="#1F2937"
                  strokeWidth={3}
                  strokeLinecap="round"
                />

                {/* Vertical line connecting to previous status */}
                {prevSeg && (
                  <SvgLine
                    x1={x1}
                    y1={rowToY(prevSeg.row) + ROW_HEIGHT / 2}
                    x2={x1}
                    y2={y}
                    stroke="#1F2937"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                )}

                {/* Start point marker - larger */}
                <Rect
                  x={x1 - 3}
                  y={y - 3}
                  width={6}
                  height={6}
                  fill="#1F2937"
                  rx={1}
                />

                {/* End point marker (if last segment or next segment is different) */}
                {(!nextSeg || nextSeg.row !== seg.row) && (
                  <Rect
                    x={x2 - 3}
                    y={y - 3}
                    width={6}
                    height={6}
                    fill="#1F2937"
                    rx={1}
                  />
                )}

                {/* Add annotation for special statuses */}
                {seg.note && (
                  <SvgText
                    x={(x1 + x2) / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#374151"
                    fontWeight="600"
                  >
                    {seg.note}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Legend */}
        <View style={styles.legend}>
          {Object.values(FMCSA_STATUS).map((status) => (
            <View key={status.key} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: status.iconColor }]} />
              <Text style={styles.legendText}>{status.shortLabel}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  chartContainer: {
    padding: 2, // Very minimal padding
    backgroundColor: THEME_LIGHT,
  },
  header: {
    marginBottom: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  subHeaderText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
});
