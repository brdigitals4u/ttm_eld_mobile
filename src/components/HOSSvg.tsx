import React, { useEffect } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '@/constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HOSCircleProps {
  size?: number;       // Overall size of the component
  progress?: number;   // 0 to 100
  strokeWidth?: number;
  text: string;
}

const HOSCircle: React.FC<HOSCircleProps> = ({
  size = 200,          // Default size
  progress = 75,
  strokeWidth = 9,
  text,
}) => {
  const radius = (size / 2) * 0.45; // radius based on size
  const circumference = radius * Math.PI * 2;
  const strokeOffset = useSharedValue(circumference);

  const animatedCircleProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: withTiming(strokeOffset.value, { duration: 1500 }),
    };
  });

  const percentage = useDerivedValue(() => {
    return ((circumference - strokeOffset.value) / circumference) * 100;
  });

  useEffect(() => {
    const offset = circumference - (progress / 100) * circumference;
    strokeOffset.value = offset;
  }, [progress]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Animated.Text style={[styles.text, { fontSize: size * 0.14 }]}>
          {text}
        </Animated.Text>
        <Svg height={size} width={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#2091ed" />
              <Stop offset="50%" stopColor="#0f5792" />
              <Stop offset="100%" stopColor="#0071ce" />
            </LinearGradient>
          </Defs>
          {/* Background Circle */}
          <Circle
            cx="50"
            cy="50"
            r="45"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Progress Circle */}
          <AnimatedCircle
            animatedProps={animatedCircleProps}
            cx="50"
            cy="50"
            r="45"
            stroke="url(#grad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference}`}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: COLORS.primary,
    fontWeight: 'bold',
    position: 'absolute',
  },
});

export default HOSCircle;