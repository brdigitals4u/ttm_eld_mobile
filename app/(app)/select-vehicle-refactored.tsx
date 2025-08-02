import React from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VehicleSetupProvider, SetupStep } from '@/context/vehicle-setup-context';
import {
  ScanDevicesStep,
  DeviceSelectedStep,
  ConnectingStep,
  SuccessStep,
  ErrorStep,
  DataCollectionStep
} from '@/src/components/vehicle-setup-steps';

// Import our new components
import VehicleSetupHeader from '@/components/vehicle-setup/VehicleSetupHeader';
import ScanControls from '@/components/vehicle-setup/ScanControls';
import DeviceList from '@/components/vehicle-setup/DeviceList';
import PasscodeModal from '@/components/vehicle-setup/PasscodeModal';
import { useVehicleSetupLogic } from '@/components/vehicle-setup/VehicleSetupHooks';

function SelectVehicleComponent() {
  const insets = useSafeAreaInsets();
  const {
    // State
    scanProgress,
    scanTimeRemaining,
    scanAttempt,
    connectingDeviceId,
    showPasscodeModal,
    selectedDeviceForPasscode,
    currentStep,
    scannedDevices,
    isScanning,
    isConnecting,
    colors,
    
    // Actions
    startScan,
    handleConnectInitiation,
    handlePasscodeSubmit,
    setShowPasscodeModal,
  } = useVehicleSetupLogic();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case SetupStep.SCAN_DEVICES:
        return (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
            <ScanDevicesStep />
          </Animated.View>
        );
      case SetupStep.DEVICE_SELECTED:
        return (
          <Animated.View entering={SlideInUp} exiting={SlideOutDown} style={styles.stepContainer}>
            <DeviceSelectedStep />
          </Animated.View>
        );
      case SetupStep.CONNECTING:
        return (
          <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
            <ConnectingStep />
          </Animated.View>
        );
      case SetupStep.SUCCESS:
        return (
          <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
            <SuccessStep />
          </Animated.View>
        );
      case SetupStep.ERROR:
        return (
          <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
            <ErrorStep />
          </Animated.View>
        );
      case SetupStep.DATA_COLLECTION:
        return (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
            <DataCollectionStep />
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <VehicleSetupHeader colors={colors} />

          {/* Render current step */}
          {renderCurrentStep()}

          {/* Show scan controls and device list only on SCAN_DEVICES step */}
          {currentStep === SetupStep.SCAN_DEVICES && (
            <>
              {/* Scan Controls */}
              <ScanControls
                isScanning={isScanning}
                scanTimeRemaining={scanTimeRemaining}
                scanAttempt={scanAttempt}
                scanProgress={scanProgress}
                isConnecting={isConnecting}
                onStartScan={startScan}
                colors={colors}
              />
              
              {/* Device List */}
              <DeviceList
                scannedDevices={scannedDevices}
                connectingDeviceId={connectingDeviceId}
                onConnect={handleConnectInitiation}
                colors={colors}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Passcode Modal */}
      <PasscodeModal
        isVisible={showPasscodeModal}
        selectedDevice={selectedDeviceForPasscode}
        onClose={() => setShowPasscodeModal(false)}
        onSubmit={handlePasscodeSubmit}
        isSubmitting={isConnecting}
        colors={colors}
      />
    </KeyboardAvoidingView>
  );
}

export default function SelectVehicleScreen() {
  return (
    <VehicleSetupProvider>
      <SelectVehicleComponent />
    </VehicleSetupProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 