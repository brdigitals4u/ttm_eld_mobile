import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAnalytics } from '@/src/hooks/useAnalytics';

interface AnalyticsScreenProps {
  screenName: string;
  children?: React.ReactNode;
}

/**
 * Example wrapper component that automatically tracks screen views
 * and provides easy access to analytics functions
 */
export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ 
  screenName, 
  children 
}) => {
  const { trackScreenView, trackUserAction } = useAnalytics();

  useEffect(() => {
    // Track screen view when component mounts
    trackScreenView(screenName, `screen_${screenName}`);
  }, [screenName, trackScreenView]);

  const handleButtonPress = (buttonName: string) => {
    trackUserAction('button_press', buttonName, {
      screen: screenName,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      {/* Example usage - you can remove this in actual implementation */}
      {__DEV__ && (
        <View style={{ position: 'absolute', bottom: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 5 }}>
          <Text style={{ color: 'white', fontSize: 12, marginBottom: 5 }}>
            Analytics Debug: {screenName}
          </Text>
          <TouchableOpacity 
            onPress={() => handleButtonPress('test_button')}
            style={{ backgroundColor: 'blue', padding: 5, borderRadius: 3, marginTop: 5 }}
          >
            <Text style={{ color: 'white', fontSize: 10 }}>Test Analytics</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/**
 * HOC (Higher Order Component) for wrapping screens with analytics
 */
export const withAnalytics = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string
) => {
  return (props: P) => {
    const { trackScreenView } = useAnalytics();

    useEffect(() => {
      trackScreenView(screenName, `screen_${screenName}`);
    }, [trackScreenView]);

    return <WrappedComponent {...props} />;
  };
};
