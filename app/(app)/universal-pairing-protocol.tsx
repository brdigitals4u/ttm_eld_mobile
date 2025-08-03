import UniversalPairingScreenProtocol from '../universal-pairing/UniversalPairingScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';


export default function  UniversalPairingProtocolTab() {
  // Show loading state while redirecting
  return (
    <SafeAreaView style={styles.container}>
         <UniversalPairingScreenProtocol />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
});
