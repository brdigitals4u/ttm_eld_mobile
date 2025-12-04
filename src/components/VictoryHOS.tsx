// FMCSA-compliant HOS Chart
import React, { useEffect, useMemo } from "react"
import { View, StyleSheet, Dimensions, PixelRatio } from "react-native"
import Svg, { Rect, Line as SvgLine, Text as SvgText, Path, Circle } from "react-native-svg"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"

/**
 * FMCSA HOS Chart Component
 * Displays duty status changes over a 24-hour period
 * Supports: OFF_DUTY, SLEEPER, DRIVING, ON_DUTY
 */

type StatusKey = keyof typeof FMCSA_STATUS

type LogEntry = {
  start: string | Date
  end: string | Date
  status: string
  note?: string
}

type SegmentRender = {
  startMinutes: number
  endMinutes: number
  durationMin: number
  statusKey: StatusKey
  note?: string
}

interface HOSChartProps {
  data?: LogEntry[]
  dayStartIso: string
  header?: {
    recordDate?: string
    timezoneOffset?: string
    carrierName?: string
    usdot?: string
    driverName?: string
    driverId?: string
  }
  onSegmentPress?: (segment: any) => void
  onRenderPlan?: (plan: any) => void
}

function parseISO(iso: string | Date): Date {
  return iso instanceof Date ? iso : new Date(iso)
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000)
}

function normalizeStatus(status: string): StatusKey {
  const s = status.toUpperCase().replace(/[^A-Z]/g, "_")
  if (s.includes("YARD") || s.includes("ON_DUTY_DRIVING")) return "ON_DUTY"
  if (s.includes("DRIVING") || s === "DR" || s.includes("DRIVE")) return "DRIVING"
  if (s.includes("SLEEP") || s === "SB") return "SLEEPER"
  if (s.includes("PERSONAL") || s.includes("PC")) return "OFF_DUTY"
  if (s.includes("OFF") && s.includes("DUTY")) return "OFF_DUTY"
  if (s.includes("ON") && s.includes("DUTY")) return "ON_DUTY"
  return "OFF_DUTY"
}

export default function HOSChart({
  data = [],
  dayStartIso,
  header = {},
  onSegmentPress,
  onRenderPlan,
}: HOSChartProps) {
  // Get theme colors - supports both light and dark themes
  const { theme, themeContext } = useAppTheme()
  const { colors } = theme

  // FMCSA standard colors with theme
  const THEME_COLOR = colors.tint
  // Chart background: secondary primary in light mode, subtle primary shade in dark mode
  const CHART_BACKGROUND = useMemo(() => {
    if (themeContext === "dark") {
      // Use neutral30 with a subtle primary tint for better visibility
      // This creates a slight blue-gray shade that's distinguishable from cardBackground
      // neutral30 (#232732) blended with primary100 (#002366) creates a subtle scotland blue tint
      return colors.palette.neutral30 || "#232732"
    }
    return colors.palette.primary100 // secondary primary (light blue #E3F2FD in light mode)
  }, [themeContext, colors.palette.primary100, colors.palette.neutral30])

  const FMCSA_STATUS = useMemo(
    () => ({
      OFF_DUTY: {
        key: "OFF_DUTY",
        label: "OFF",
        shortLabel: "OFF",
        color: colors.sectionBackground,
        row: 1,
        iconColor: "#39FF14", // neon green
      },
      SLEEPER: {
        key: "SLEEPER",
        label: "SB",
        shortLabel: "SB",
        color: colors.cardBackground,
        row: 2,
        iconColor: colors.PRIMARY || colors.tint, // primary blue
      },
      DRIVING: {
        key: "DRIVING",
        label: "D",
        shortLabel: "D",
        color: colors.successBackground,
        row: 3,
        iconColor: "#F59E0B", // saffron
      },
      ON_DUTY: {
        key: "ON_DUTY",
        label: "ON",
        shortLabel: "ON",
        color: colors.warningBackground,
        row: 4,
        iconColor: "#FFEB3B", // yellow
      },
    }),
    [colors],
  )

  const screenWidth = Dimensions.get("window").width
  const chartWidth = screenWidth - 60 // Full screen width with minimal padding
  const ROW_HEIGHT = 40
  const CHART_HEIGHT = ROW_HEIGHT * 4
  const LEFT_MARGIN = 50 // Minimal margin for labels
  const RIGHT_MARGIN = 36 // Just small padding on right
  const TOP_MARGIN = 32 // More top padding for hour labels
  const BOTTOM_MARGIN = 12 // Minimal bottom padding
  const TOTAL_HEIGHT = CHART_HEIGHT + TOP_MARGIN + BOTTOM_MARGIN
  const drawingWidth = chartWidth - LEFT_MARGIN - RIGHT_MARGIN

  const dayStart = parseISO(dayStartIso)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        chartContainer: {
          backgroundColor: CHART_BACKGROUND,
          borderRadius: 16,
          padding: 12,
        },
        container: {
          alignItems: "center",
          backgroundColor: colors.cardBackground,
          paddingVertical: 8,
        },
        header: {
          marginBottom: 16,
        },
        headerText: {
          color: colors.text,
          fontFamily: typography.primary.bold,
          fontSize: 16,
        },
        legend: {
          alignItems: "center",
          flexDirection: "row",
          gap: 16,
          justifyContent: "center",
          marginTop: 8,
        },
        legendItem: {
          alignItems: "center",
          flexDirection: "row",
        },
        legendSwatch: {
          borderRadius: 2,
          height: 14,
          marginRight: 6,
          width: 14,
        },
        legendText: {
          color: colors.textDim,
          fontFamily: typography.primary.semiBold,
          fontSize: 12,
        },
        subHeaderText: {
          color: colors.textDim,
          fontSize: 12,
          marginTop: 4,
        },
      }),
    [colors, CHART_BACKGROUND],
  )

  // Normalize and clip segments to 24-hour window
  const segments = useMemo<SegmentRender[]>(() => {
    const mapped: SegmentRender[] = data
      .map((s) => {
        const originalStart = parseISO(s.start)
        const originalEnd = parseISO(s.end)
        const startClipped = originalStart < dayStart ? dayStart : originalStart
        const endClipped = originalEnd > dayEnd ? dayEnd : originalEnd
        const startMinutes = Math.max(0, minutesBetween(dayStart, startClipped))
        const endMinutes = Math.min(
          24 * 60,
          Math.max(startMinutes, minutesBetween(dayStart, endClipped)),
        )
        const durationMin = Math.max(0, endMinutes - startMinutes)
        const statusKey = normalizeStatus(s.status)

        return {
          startMinutes,
          endMinutes,
          durationMin,
          statusKey,
          note: s.note,
        } as SegmentRender
      })
      .filter((seg) => seg.durationMin > 0.1666) // discard sub-10-second fragments
      .sort((a, b) => a.startMinutes - b.startMinutes)

    const result: SegmentRender[] = []
    const pushSegment = (segment: SegmentRender) => {
      if (segment.durationMin <= 0) return
      const last = result[result.length - 1]
      if (
        last &&
        last.statusKey === segment.statusKey &&
        segment.startMinutes - last.endMinutes <= 1
      ) {
        last.endMinutes = Math.max(last.endMinutes, segment.endMinutes)
        last.durationMin = last.endMinutes - last.startMinutes
      } else {
        result.push({ ...segment })
      }
    }

    let cursor = 0
    let lastStatus: StatusKey = "OFF_DUTY"

    mapped.forEach((segment) => {
      if (segment.startMinutes > cursor) {
        const filler: SegmentRender = {
          startMinutes: cursor,
          endMinutes: segment.startMinutes,
          durationMin: segment.startMinutes - cursor,
          statusKey: lastStatus,
        }
        pushSegment(filler)
        cursor = segment.startMinutes
      }

      pushSegment(segment)
      cursor = segment.endMinutes
      lastStatus = segment.statusKey
    })

    if (cursor < 24 * 60) {
      pushSegment({
        startMinutes: cursor,
        endMinutes: 24 * 60,
        durationMin: 24 * 60 - cursor,
        statusKey: lastStatus,
      })
    }

    if (result.length === 0) {
      return [
        {
          startMinutes: 0,
          endMinutes: 24 * 60,
          durationMin: 24 * 60,
          statusKey: "OFF_DUTY",
        },
      ]
    }

    return result
  }, [data, dayStartIso])

  const minuteToX = (m: number) => LEFT_MARGIN + (m / (24 * 60)) * drawingWidth
  const rowToY = (row: number) => TOP_MARGIN + (row - 1) * ROW_HEIGHT

  const devicePixelRatio = typeof PixelRatio.get === "function" ? PixelRatio.get() : 1
  const minPixelWidth = Math.max(2, Math.round(3 * devicePixelRatio))

  const renderData = useMemo(() => {
    const initRow = () => ({
      pathParts: [] as string[],
      markers: [] as { x: number; y: number }[],
      markerKeys: new Set<string>(),
      tinyTicks: [] as { x: number; yTop: number; yBottom: number }[],
      tinyDots: [] as { cx: number; cy: number }[],
      started: false,
    })

    const rowsMap: Record<StatusKey, ReturnType<typeof initRow>> = {
      OFF_DUTY: initRow(),
      SLEEPER: initRow(),
      DRIVING: initRow(),
      ON_DUTY: initRow(),
    }

    const connectors: { x: number; y1: number; y2: number }[] = []

    const addMarker = (rowKey: StatusKey, x: number, y: number) => {
      const rowData = rowsMap[rowKey]
      const key = `${x.toFixed(1)}-${y.toFixed(1)}`
      if (rowData.markerKeys.has(key)) return
      rowData.markerKeys.add(key)
      rowData.markers.push({ x, y })
    }

    segments.forEach((segment, index) => {
      const rowKey = segment.statusKey
      const rowNumber = FMCSA_STATUS[rowKey].row
      const rowTop = rowToY(rowNumber)
      const yCenter = rowTop + ROW_HEIGHT / 2
      const xStart = minuteToX(segment.startMinutes)
      const xEnd = minuteToX(segment.endMinutes)
      const width = xEnd - xStart

      const rowData = rowsMap[rowKey]
      rowData.pathParts.push(
        rowData.started
          ? `M ${xStart.toFixed(2)} ${yCenter.toFixed(2)} L ${xEnd.toFixed(2)} ${yCenter.toFixed(2)}`
          : `M ${xStart.toFixed(2)} ${yCenter.toFixed(2)} L ${xEnd.toFixed(2)} ${yCenter.toFixed(2)}`,
      )
      rowData.started = true

      addMarker(rowKey, xStart, yCenter)
      addMarker(rowKey, xEnd, yCenter)

      if (width < minPixelWidth) {
        rowData.tinyTicks.push({ x: xStart, yTop: rowTop + 6, yBottom: rowTop + ROW_HEIGHT - 6 })
        if (segment.durationMin >= 10 && segment.durationMin < 30) {
          rowData.tinyDots.push({ cx: xStart, cy: yCenter })
        }
      }

      if (index > 0) {
        const prev = segments[index - 1]
        const prevRow = FMCSA_STATUS[prev.statusKey].row
        const prevCenter = rowToY(prevRow) + ROW_HEIGHT / 2
        if (prevRow !== rowNumber || Math.abs(prev.endMinutes - segment.startMinutes) > 0.01) {
          connectors.push({ x: xStart, y1: prevCenter, y2: yCenter })
        }
      }
    })

    const buildRow = (key: StatusKey) => {
      const data = rowsMap[key]
      return {
        path: data.pathParts.join(" "),
        markers: data.markers,
        tinyTicks: data.tinyTicks,
        tinyDots: data.tinyDots,
      }
    }

    return {
      rows: {
        OFF_DUTY: buildRow("OFF_DUTY"),
        SLEEPER: buildRow("SLEEPER"),
        DRIVING: buildRow("DRIVING"),
        ON_DUTY: buildRow("ON_DUTY"),
      },
      connectors,
    }
  }, [segments, minPixelWidth])

  const quarterHourTicks = useMemo(() => {
    return Array.from({ length: 24 * 4 + 1 }, (_, index) => {
      const minutes = index * 15
      const x = minuteToX(minutes)
      const isHour = minutes % 60 === 0
      const isHalf = !isHour && minutes % 30 === 0
      return { minutes, x, isHour, isHalf }
    })
  }, [drawingWidth, LEFT_MARGIN])

  const totalMinutes = useMemo(
    () => segments.reduce((sum, seg) => sum + seg.durationMin, 0),
    [segments],
  )

  const renderPlan = useMemo(() => {
    const rowsPlan = Object.entries(renderData.rows).reduce(
      (acc, [key, value]) => {
        acc[key as StatusKey] = {
          path: value.path,
          markers: value.markers.map((marker) => ({ x: marker.x, y: marker.y, size: 6 })),
          tiny: [
            ...value.tinyTicks.map((tick) => ({
              type: "tick",
              x: tick.x,
              yTop: tick.yTop,
              yBottom: tick.yBottom,
            })),
            ...value.tinyDots.map((dot) => ({ type: "dot", cx: dot.cx, cy: dot.cy, r: 3 })),
          ],
        }
        return acc
      },
      {} as Record<StatusKey, any>,
    )

    const plan = {
      meta: {
        dayStartIso,
        deviceWidth: screenWidth,
        leftMargin: LEFT_MARGIN,
        rightMargin: RIGHT_MARGIN,
        pixelsPerMinute: drawingWidth / (24 * 60),
        minPixelWidth,
      },
      rows: rowsPlan,
      connectors: renderData.connectors,
      grid: {
        quarterTicks: quarterHourTicks.map((tick) => ({
          minutes: tick.minutes,
          x: tick.x,
          isHour: tick.isHour,
          isHalf: tick.isHalf,
        })),
      },
      validation: {
        totalMinutes: Math.round(totalMinutes),
        overlap: false,
        errors: Math.abs(totalMinutes - 24 * 60) > 1 ? ["Timeline not normalized to 24 hours"] : [],
      },
    }

    return plan
  }, [
    renderData,
    quarterHourTicks,
    drawingWidth,
    minPixelWidth,
    totalMinutes,
    dayStartIso,
    screenWidth,
  ])

  useEffect(() => {
    if (onRenderPlan) {
      onRenderPlan(renderPlan)
    }
  }, [renderPlan, onRenderPlan])

  // Hour tick marks with custom labels
  const getHourLabel = (hour: number): string => {
    if (hour === 0) return "M"
    if (hour === 12) return "N"
    if (hour > 12) return String(hour - 12)
    return String(hour)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { width: chartWidth }]}>
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

        <Svg width={chartWidth} height={TOTAL_HEIGHT}>
          {Object.values(FMCSA_STATUS).map((status) => {
            const y = rowToY(status.row)
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
            )
          })}

          <Rect
            x={LEFT_MARGIN}
            y={TOP_MARGIN}
            width={drawingWidth}
            height={CHART_HEIGHT}
            fill="#FFFFFF"
            stroke="#E5E7EB"
            strokeWidth={1}
          />

          {Object.values(FMCSA_STATUS).map((status) => {
            const y = rowToY(status.row)
            return (
              <React.Fragment key={status.key}>
                <SvgLine
                  x1={LEFT_MARGIN}
                  y1={y}
                  x2={LEFT_MARGIN + drawingWidth}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                />
                <SvgText
                  x={10}
                  y={y + ROW_HEIGHT / 2 + 4}
                  textAnchor="start"
                  fontSize="13"
                  fill={colors.textDim}
                  fontWeight="700"
                >
                  {status.shortLabel}
                </SvgText>
              </React.Fragment>
            )
          })}

          <SvgLine
            x1={LEFT_MARGIN}
            y1={TOP_MARGIN + CHART_HEIGHT}
            x2={LEFT_MARGIN + drawingWidth}
            y2={TOP_MARGIN + CHART_HEIGHT}
            stroke={colors.textDim}
            strokeWidth={2}
          />

          {quarterHourTicks.map(({ minutes, x, isHour, isHalf }) => (
            <React.Fragment key={minutes}>
              <SvgLine
                x1={x}
                y1={TOP_MARGIN}
                x2={x}
                y2={
                  isHour
                    ? TOP_MARGIN + CHART_HEIGHT
                    : isHalf
                      ? TOP_MARGIN + CHART_HEIGHT * 0.85
                      : TOP_MARGIN + CHART_HEIGHT * 0.7
                }
                stroke={isHour ? colors.textDim : isHalf ? colors.palette.primary200 : colors.border}
                strokeWidth={isHour ? 1.2 : 0.6}
              />
              {isHour && (
                <SvgText
                  x={x}
                  y={TOP_MARGIN - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill={colors.textDim}
                  fontWeight="600"
                >
                  {getHourLabel(minutes / 60)}
                </SvgText>
              )}
            </React.Fragment>
          ))}

          {renderData.connectors.map((connector, index) => (
            <SvgLine
              key={`connector-${index}`}
              x1={connector.x}
              y1={connector.y1}
              x2={connector.x}
              y2={connector.y2}
              stroke="#1F2937"
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}

          {Object.entries(renderData.rows).map(([key, row]) => (
            <React.Fragment key={key}>
              {row.path.length > 0 && (
                <Path
                  d={row.path}
                  stroke="#1F2937"
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {row.markers.map((marker, markerIndex) => (
                <Rect
                  key={`marker-${key}-${markerIndex}`}
                  x={marker.x - 3}
                  y={marker.y - 3}
                  width={6}
                  height={6}
                  fill={colors.text}
                  rx={1}
                />
              ))}
              {row.tinyTicks.map((tick, tickIndex) => (
                <SvgLine
                  key={`tick-${key}-${tickIndex}`}
                  x1={tick.x}
                  y1={tick.yTop}
                  x2={tick.x}
                  y2={tick.yBottom}
                  stroke="#1F2937"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              ))}
              {row.tinyDots.map((dot, dotIndex) => (
                <Circle
                  key={`dot-${key}-${dotIndex}`}
                  cx={dot.cx}
                  cy={dot.cy}
                  r={3}
                  fill={colors.text}
                />
              ))}
            </React.Fragment>
          ))}
        </Svg>

        <View style={styles.legend}>
          {Object.values(FMCSA_STATUS).map((status) => (
            <View key={status.key} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: status.iconColor }]} />
              <Text style={styles.legendText}>{status.shortLabel}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
