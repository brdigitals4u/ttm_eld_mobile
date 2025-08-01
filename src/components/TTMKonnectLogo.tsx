import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Truck } from 'lucide-react-native';

interface TTMKonnectLogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  showText?: boolean;
}

export const TTMKonnectLogo: React.FC<TTMKonnectLogoProps> = ({
  size = 'medium',
  color = '#3B82F6',
  textColor = '#1F2937',
  showText = true,
}) => {
  const sizeConfig = {
    small: {
      iconSize: 32,
      fontSize: 18,
      spacing: 8,
    },
    medium: {
      iconSize: 48,
      fontSize: 24,
      spacing: 12,
    },
    large: {
      iconSize: 80,
      fontSize: 32,
      spacing: 16,
    },
  };

  const config = sizeConfig[size];

  return (
    <View style={[styles.container, { gap: config.spacing }]}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Truck
          size={config.iconSize}
          color="white"
          strokeWidth={2}
        />
      </View>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize: config.fontSize, color: textColor }]}>
            TTM Konnect
          </Text>
          <Text style={[styles.subtitle, { fontSize: config.fontSize * 0.5, color: textColor + '80' }]}>
            Electronic Logging Device
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
});
