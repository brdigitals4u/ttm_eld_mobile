import { useEffect } from 'react';
import { router } from 'expo-router';

export default function UniversalPairingTab() {
  useEffect(() => {
    // Redirect to the universal pairing screen
    router.replace('/(app)/universal-pairing');
  }, []);

  return null;
} 