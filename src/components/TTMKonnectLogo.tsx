import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { 
  Circle, 
  Rect, 
  Path, 
  Line, 
  Defs, 
  LinearGradient, 
  Stop,
  G,
  Text
} from 'react-native-svg';

interface TTMKonnectLogoProps {
  size?: number;
  showText?: boolean;
  style?: any;
}

export default function TTMKonnectLogo({ 
  size = 100, 
  showText = false, 
  style 
}: TTMKonnectLogoProps) {
  const scale = size / 200; // Original SVG is 200x200
  
  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
            <Stop offset="100%" stopColor="#1D4ED8" stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity={1} />
            <Stop offset="100%" stopColor="#059669" stopOpacity={1} />
          </LinearGradient>
          {/* Filter removed to prevent SVG layout errors in React Native */}
        </Defs>
        
        {/* Background circle */}
        <Circle cx={100} cy={100} r={90} fill="url(#primaryGradient)" />
        
        {/* Truck body */}
        <Rect x={40} y={80} width={80} height={40} rx={8} fill="white" opacity={0.95} />
        
        {/* Truck cabin */}
        <Rect x={100} y={70} width={30} height={50} rx={6} fill="white" opacity={0.95} />
        
        {/* Wheels */}
        <Circle cx={55} cy={130} r={8} fill="#374151" />
        <Circle cx={105} cy={130} r={8} fill="#374151" />
        
        {/* Connectivity lines */}
        <G stroke="url(#secondaryGradient)" strokeWidth={3} fill="none" opacity={0.8}>
          <Path d="M 20 60 Q 40 40 60 60" strokeLinecap="round" />
          <Path d="M 140 60 Q 160 40 180 60" strokeLinecap="round" />
          <Path d="M 20 140 Q 40 160 60 140" strokeLinecap="round" />
          <Path d="M 140 140 Q 160 160 180 140" strokeLinecap="round" />
        </G>
        
        {/* Connection dots */}
        <Circle cx={60} cy={60} r={3} fill="url(#secondaryGradient)" />
        <Circle cx={140} cy={60} r={3} fill="url(#secondaryGradient)" />
        <Circle cx={60} cy={140} r={3} fill="url(#secondaryGradient)" />
        <Circle cx={140} cy={140} r={3} fill="url(#secondaryGradient)" />
        
        {/* Central connection hub */}
        <Circle cx={100} cy={100} r={6} fill="url(#secondaryGradient)" />
        
        {/* Connection lines to hub */}
        <G stroke="url(#secondaryGradient)" strokeWidth={2} fill="none" opacity={0.6}>
          <Line x1={60} y1={60} x2={94} y2={94} />
          <Line x1={140} y1={60} x2={106} y2={94} />
          <Line x1={60} y1={140} x2={94} y2={106} />
          <Line x1={140} y1={140} x2={106} y2={106} />
        </G>
        
        {/* TTM Text */}
        {showText && (
          <Text 
            x={100} 
            y={180} 
            textAnchor="middle" 
            fontSize={14} 
            fontWeight="bold" 
            fill="#374151"
          >
            TTM
          </Text>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 