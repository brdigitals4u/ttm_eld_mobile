import React, { useRef } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
} from 'react-native-svg';

type SemiCircularGaugeProps = {
  size?: number;
  value?: number;
  max?: number;
  strokeWidth?: number;
  progressColor?: string;
  bgColor?: string;
};

export function SemiCircularGauge({
  size = 120,
  value = 0,
  max = 100,
  strokeWidth = 12,
  progressColor = '#0071ce',
  bgColor = '#E5E7EB',
}: SemiCircularGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  
  // Full circle: 360 degrees, starting from top (-90) going clockwise
  const startAngle = -90;
  const sweepAngle = 360;
  
  // Calculate progress as used time (max - value) / max
  // When value (remaining) is high, used is low, so progress is low
  // When value (remaining) is low, used is high, so progress is high
  const used = Math.max(0, (max ?? 100) - (value ?? 0));
  const clamped = Math.max(0, Math.min(used, max ?? 100));
  const ratio = clamped / (max ?? 100);
  const targetAngle = startAngle + sweepAngle * ratio;

  const polarToCartesian = (cx_: number, cy_: number, r: number, angleDeg: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180.0;
    return { x: cx_ + r * Math.cos(a), y: cy_ + r * Math.sin(a) };
  };

  const describeArc = (cx_: number, cy_: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(cx_, cy_, r, startA);
    const end = polarToCartesian(cx_, cy_, r, endA);
    const diff = endA - startA;
    const largeArcFlag = Math.abs(diff) > 180 ? '1' : '0';
    const sweepFlag = diff > 0 ? '1' : '0';
    
    // For full circle (360 degrees), draw two arcs
    if (Math.abs(diff) >= 360) {
      const mid = polarToCartesian(cx_, cy_, r, startA + 180);
      return `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${mid.x} ${mid.y} A ${r} ${r} 0 1 1 ${start.x} ${start.y}`;
    }
    
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
  };

  const gradIdRef = useRef(`semiGauge-${Math.random().toString(36).substr(2, 9)}`);
  const gradId = gradIdRef.current;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" x2="100%" y1="0%" y2="0%">
            <Stop offset="0%" stopColor={progressColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={progressColor} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Path
          d={describeArc(cx, cy, radius, startAngle, startAngle + 360)}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />

        {/* Progress arc */}
        {ratio > 0 && (
          <Path
            d={describeArc(cx, cy, radius, startAngle, targetAngle)}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Start cap circle */}
        {ratio > 0 && (() => {
          const startCap = polarToCartesian(cx, cy, radius, startAngle);
          return <Circle cx={startCap.x} cy={startCap.y} r={strokeWidth / 2} fill={progressColor} />;
        })()}

        {/* End cap circle */}
        {ratio > 0 && (() => {
          const endCap = polarToCartesian(cx, cy, radius, targetAngle);
          return <Circle cx={endCap.x} cy={endCap.y} r={strokeWidth / 2} fill={progressColor} />;
        })()}
      </Svg>
    </View>
  );
}

