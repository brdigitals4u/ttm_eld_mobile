// HOSGaugeRN.tsx
import React, { useRef } from 'react';
import { View, useColorScheme } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';

type HOSGaugeProps = {
  size?: number;
  value?: number;
  max?: number;
  unit?: string;
  sweepAngle?: number;
  startAngle?: number;
  strokeWidth?: number;
  progressColor?: string;
  bgColor?: string;
  centerFill?: string;
  tickColor?: string;
  labelColor?: string;
  numberColor?: string;
  valueFormatter?: (value: number) => string;
};

export function HOSGaugeRN({
  size = 320,
  value = 28,
  max = 100,
  unit = 'Mph',
  sweepAngle = 250,
  startAngle = -125,
  strokeWidth = 18,
  progressColor: progressColorProp,
  bgColor: bgColorProp,
  centerFill: centerFillProp,
  tickColor: tickColorProp,
  labelColor: labelColorProp,
  numberColor: numberColorProp,
  valueFormatter,
}: HOSGaugeProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const defaultTheme = {
    light: {
      progressColor: '#ff66ff',
      bgColor: '#E5E7EB',
      centerFill: '#2D3142',
      tickColor: '#1F2937',
      labelColor: '#6B7280',
      numberColor: '#111827',
    },
    dark: {
      progressColor: '#ff66ff',
      bgColor: '#4B5563',
      centerFill: '#2D3142',
      tickColor: '#374151',
      labelColor: '#9CA3AF',
      numberColor: '#F3F4F6',
    },
  };

  const themeSet = isDark ? defaultTheme.dark : defaultTheme.light;
  const progressColor = progressColorProp ?? themeSet.progressColor;
  const bgColor = bgColorProp ?? themeSet.bgColor;
  const centerFill = centerFillProp ?? themeSet.centerFill;
  const tickColor = tickColorProp ?? themeSet.tickColor;
  const labelColor = labelColorProp ?? themeSet.labelColor;
  const numberColor = numberColorProp ?? themeSet.numberColor;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size - strokeWidth) / 2 - 8;
  const innerR = outerR - 36;
  const centerR = innerR - 36;

  const clamped = Math.max(0, Math.min(value ?? 0, max ?? 100));
  const ratio = clamped / (max ?? 100);
  const targetAngle = startAngle + sweepAngle * ratio;

  const polarToCartesian = (cx_: number, cy_: number, r: number, angleDeg: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180.0;
    return { x: cx_ + r * Math.cos(a), y: cy_ + r * Math.sin(a) };
  };

  const describeArc = (cx_: number, cy_: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(cx_, cy_, r, endA);
    const end = polarToCartesian(cx_, cy_, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  // Generate tick marks (20 ticks evenly distributed)
  const ticks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const tickCount = 20;
  for (let i = 0; i < tickCount; i++) {
    const tAngle = startAngle + (sweepAngle * i) / (tickCount - 1);
    const outer = polarToCartesian(cx, cy, innerR + 8, tAngle);
    const inner = polarToCartesian(cx, cy, innerR - 8, tAngle);
    ticks.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y });
  }

  // Scale labels: 0, 10, 20, 30, 50, 75, 100
  const scaleLabels = [
    { value: 0, angle: startAngle },
    { value: 10, angle: startAngle + sweepAngle * 0.1 },
    { value: 20, angle: startAngle + sweepAngle * 0.2 },
    { value: 30, angle: startAngle + sweepAngle * 0.3 },
    { value: 50, angle: startAngle + sweepAngle * 0.5 },
    { value: 75, angle: startAngle + sweepAngle * 0.75 },
    { value: 100, angle: startAngle + sweepAngle },
  ];

  // Needle
  const needleLength = centerR + (innerR - centerR) * 0.8;
  const needleBase = 8;
  
  const needleEndPos = polarToCartesian(cx, cy, needleLength, targetAngle);
  const needleLeft = polarToCartesian(cx, cy, needleBase, targetAngle - 90);
  const needleRight = polarToCartesian(cx, cy, needleBase, targetAngle + 90);

  const gradIdRef = useRef(`gProgress-${Math.random().toString(36).substr(2, 9)}`);
  const gradId = gradIdRef.current;

  return (
    <View style={{ width: size, height: size, minWidth: size, minHeight: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" x2="100%" y1="0%" y2="0%">
            <Stop offset="0%" stopColor={progressColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={progressColor} stopOpacity="0.8" />
          </LinearGradient>
        </Defs>

        {/* Background arc */}
        <Path
          d={describeArc(cx, cy, outerR, startAngle, startAngle + sweepAngle)}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {/* Progress arc */}
        <Path
          d={describeArc(cx, cy, outerR, startAngle, targetAngle)}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {/* Start cap circle */}
        {(() => {
          const startCap = polarToCartesian(cx, cy, outerR, startAngle);
          return <Circle cx={startCap.x} cy={startCap.y} r={strokeWidth / 2} fill={progressColor} />;
        })()}

        {/* End cap circle */}
        {(() => {
          const endCap = polarToCartesian(cx, cy, outerR, targetAngle);
          return <Circle cx={endCap.x} cy={endCap.y} r={strokeWidth / 2} fill={progressColor} />;
        })()}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={tickColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}

        {/* Scale labels around the gauge */}
        {scaleLabels.map((label, i) => {
          const labelRadius = outerR + strokeWidth + 22;
          const pos = polarToCartesian(cx, cy, labelRadius, label.angle);
          return (
            <SvgText
              key={`label-${i}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              fontSize={20}
              fontWeight="600"
              fill={numberColor}
              dy="7"
            >
              {label.value}
            </SvgText>
          );
        })}

        {/* Needle */}
        <Path
          d={`M ${needleLeft.x} ${needleLeft.y} L ${needleEndPos.x} ${needleEndPos.y} L ${needleRight.x} ${needleRight.y} Z`}
          fill={progressColor}
        />

        {/* Center circle (dark) */}
        <Circle cx={cx} cy={cy} r={centerR} fill={centerFill} />

        {/* Center value */}
        <SvgText
          x={cx}
          y={cy}
          textAnchor="middle"
          fontSize={centerR * 0.48}
          fontWeight="700"
          fill={numberColor}
          dy="10"
        >
          {valueFormatter ? valueFormatter(clamped) : Math.round(clamped)}
        </SvgText>

        {/* Unit label below gauge */}
        <SvgText
          x={cx}
          y={cy + outerR + strokeWidth + 48}
          textAnchor="middle"
          fontSize={22}
          fontWeight="400"
          fill={labelColor}
        >
          {unit}
        </SvgText>
      </Svg>
    </View>
  );
}