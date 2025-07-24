import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '@/components/Button';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { VehicleInfo } from '@/types/auth';

export default function VehicleSetupScreen() {
  const { colors, isDark } = useTheme();
  const { setVehicleInfo } = useAuth();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vehicleNumber.trim()) {
      return;
    }

    setIsLoading(true);
    
    const vehicleInfo: VehicleInfo = {
      vehicleNumber: vehicleNumber.trim(),
      eldConnected: false,
    };
    
    await setVehicleInfo(vehicleInfo);
    setIsLoading(false);
  };

  const handleSkipToEldPairing = () => {
    router.push('/eld-pairing');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Truck size={48} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Vehicle Setup</Text>
          <Text style={[styles.subtitle, { color: colors.inactive }]}>
            Please enter your vehicle information
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Vehicle Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.card : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Enter vehicle number"
              placeholderTextColor={colors.inactive}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.buttonGroup}>
            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!vehicleNumber.trim()}
              fullWidth
            />
            
            <Button
              title="Skip to ELD Pairing"
              onPress={handleSkipToEldPairing}
              variant="outline"
              fullWidth
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  buttonGroup: {
    marginTop: 12,
  },
});