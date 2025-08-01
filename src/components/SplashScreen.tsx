import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TTMKonnectLogo } from './TTMKonnectLogo';

interface SplashScreenProps {
  onComplete?: () => void;
}

const { width, height } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Animate the logo appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 2.5 seconds
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TTMKonnectLogo 
            size="large" 
            color="#3B82F6" 
            textColor="#1F2937"
            showText={true}
          />
        </Animated.View>
        
        {/* Optional loading indicator dots */}
        <View style={styles.loadingContainer}>
          <LoadingDots />
        </View>
      </View>
    </SafeAreaView>
  );
};

const LoadingDots: React.FC = () => {
  const dot1 = new Animated.Value(0);
  const dot2 = new Animated.Value(0);
  const dot3 = new Animated.Value(0);

  useEffect(() => {
    const animateDots = () => {
      const duration = 600;
      const stagger = 200;

      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(dot1, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      ).start();

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot2, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 0,
              duration,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, stagger);

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot3, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 0,
              duration,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, stagger * 2);
    };

    const timer = setTimeout(animateDots, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginHorizontal: 4,
  },
});
