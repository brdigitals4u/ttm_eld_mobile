import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '@/components/Button';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const [email, setEmail] = useState('driver@example.com');
  const [password, setPassword] = useState('password');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(app)/(tabs)');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error);
    }
  }, [error]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }
    
    await login(email, password);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <Truck size={64} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>TruckLog ELD</Text>
        <Text style={[styles.subtitle, { color: colors.inactive }]}>
          Electronic Logging Device for Professional Drivers
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? colors.card : '#F3F4F6',
                color: colors.text,
                borderColor: isDark ? 'transparent' : '#E5E7EB',
              },
            ]}
            placeholder="Enter your email"
            placeholderTextColor={colors.inactive}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? colors.card : '#F3F4F6',
                color: colors.text,
                borderColor: isDark ? 'transparent' : '#E5E7EB',
              },
            ]}
            placeholder="Enter your password"
            placeholderTextColor={colors.inactive}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Button
          title="Log In"
          onPress={handleLogin}
          loading={isLoading}
          fullWidth
        />

        <Text style={[styles.helpText, { color: colors.inactive }]}>
          Demo credentials are pre-filled for testing purposes.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
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
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 20,
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
  helpText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});