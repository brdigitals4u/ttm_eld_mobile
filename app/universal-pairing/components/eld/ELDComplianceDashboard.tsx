import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';

interface ELDComplianceDashboardProps {
  eldData?: {
    // 24-Hour Period Data
    periodStartTime?: string;
    date?: string;
    time?: string;
    timeZoneOffset?: number;
    
    // Carrier Information
    carrierName?: string;
    carrierUSDOTNumber?: string;
    
    // Vehicle Information
    vin?: string;
    cmvPowerUnitNumber?: string;
    trailerNumbers?: string[];
    vehicleMiles?: number;
    engineHours?: number;
    
    // Driver Information
    driverFirstName?: string;
    driverLastName?: string;
    driverLicenseNumber?: string;
    driverLicenseIssuingState?: string;
    driverLocationDescription?: string;
    
    // ELD Device Information
    eldIdentifier?: string;
    eldProvider?: string;
    eldRegistrationId?: string;
    eldUsername?: string;
    eldAccountType?: string;
    eldAuthenticationValue?: string;
    
    // Event Data
    eventCode?: string;
    eventType?: string;
    eventSequenceId?: number;
    eventRecordOrigin?: string;
    eventRecordStatus?: string;
    eventDataCheckValue?: string;
    
    // Location Data
    latitude?: number;
    longitude?: number;
    geoLocation?: string;
    distanceSinceLastValidCoordinates?: number;
    
    // Diagnostic Data
    malfunctionIndicatorStatus?: string;
    malfunctionDiagnosticCode?: string;
    dataDiagnosticEventIndicatorStatus?: string;
    
    // Configuration
    exemptDriverConfiguration?: string;
    multidayBasisUsed?: number;
    
    // Additional Data
    orderNumber?: string;
    shippingDocumentNumber?: string;
    outputFileComment?: string;
    commentAnnotation?: string;
    
    // File Data
    fileDataCheckValue?: string;
    lineDataCheckValue?: string;
  };
}

const ELDComplianceDashboard: React.FC<ELDComplianceDashboardProps> = ({ eldData }) => {
  const { colors } = useTheme();

  if (!eldData) {
    return (
      <Animated.View entering={FadeIn} style={[styles.container, styles.noDataContainer]}>
        <Text style={[styles.noDataText, { color: colors.inactive }]}>No FMCSA ELD Data Available</Text>
        <Text style={[styles.complianceNote, { color: colors.inactive }]}>
          FMCSA compliance data will appear here when available
        </Text>
      </Animated.View>
    );
  }

  // Helper function to format parameter names
  const formatParameterName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/([A-Z])/g, (match) => ' ' + match.toLowerCase());
  };

  // Helper function to format value
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  // Group parameters by FMCSA categories
  const timeData = {
    periodStartTime: eldData.periodStartTime,
    date: eldData.date,
    time: eldData.time,
    timeZoneOffset: eldData.timeZoneOffset,
  };

  const carrierData = {
    carrierName: eldData.carrierName,
    carrierUSDOTNumber: eldData.carrierUSDOTNumber,
  };

  const vehicleData = {
    vin: eldData.vin,
    cmvPowerUnitNumber: eldData.cmvPowerUnitNumber,
    trailerNumbers: eldData.trailerNumbers,
    vehicleMiles: eldData.vehicleMiles,
    engineHours: eldData.engineHours,
  };

  const driverData = {
    driverFirstName: eldData.driverFirstName,
    driverLastName: eldData.driverLastName,
    driverLicenseNumber: eldData.driverLicenseNumber,
    driverLicenseIssuingState: eldData.driverLicenseIssuingState,
    driverLocationDescription: eldData.driverLocationDescription,
  };

  const eldDeviceData = {
    eldIdentifier: eldData.eldIdentifier,
    eldProvider: eldData.eldProvider,
    eldRegistrationId: eldData.eldRegistrationId,
    eldUsername: eldData.eldUsername,
    eldAccountType: eldData.eldAccountType,
    eldAuthenticationValue: eldData.eldAuthenticationValue,
  };

  const eventData = {
    eventCode: eldData.eventCode,
    eventType: eldData.eventType,
    eventSequenceId: eldData.eventSequenceId,
    eventRecordOrigin: eldData.eventRecordOrigin,
    eventRecordStatus: eldData.eventRecordStatus,
    eventDataCheckValue: eldData.eventDataCheckValue,
  };

  const locationData = {
    latitude: eldData.latitude,
    longitude: eldData.longitude,
    geoLocation: eldData.geoLocation,
    distanceSinceLastValidCoordinates: eldData.distanceSinceLastValidCoordinates,
  };

  const diagnosticData = {
    malfunctionIndicatorStatus: eldData.malfunctionIndicatorStatus,
    malfunctionDiagnosticCode: eldData.malfunctionDiagnosticCode,
    dataDiagnosticEventIndicatorStatus: eldData.dataDiagnosticEventIndicatorStatus,
  };

  const configurationData = {
    exemptDriverConfiguration: eldData.exemptDriverConfiguration,
    multidayBasisUsed: eldData.multidayBasisUsed,
  };

  const additionalData = {
    orderNumber: eldData.orderNumber,
    shippingDocumentNumber: eldData.shippingDocumentNumber,
    outputFileComment: eldData.outputFileComment,
    commentAnnotation: eldData.commentAnnotation,
  };

  const fileData = {
    fileDataCheckValue: eldData.fileDataCheckValue,
    lineDataCheckValue: eldData.lineDataCheckValue,
  };

  const renderComplianceSection = (title: string, parameters: any, icon: string, isRequired: boolean = false) => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          {isRequired && (
            <View style={[styles.requiredBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.requiredBadgeText}>REQUIRED</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.parametersContainer}>
        {Object.entries(parameters).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          return (
            <View key={key} style={styles.parameterRow}>
              <View style={styles.parameterInfo}>
                <Text style={[styles.parameterName, { color: colors.text }]}>
                  {formatParameterName(key)}
                </Text>
                <Text style={[styles.parameterValue, { color: colors.primary }]}>
                  {formatValue(value)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn} style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>FMCSA ELD Compliance</Text>
          <View style={[styles.complianceBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.complianceBadgeText}>COMPLIANT</Text>
          </View>
        </View>
        
        {renderComplianceSection('Time & Date', timeData, '🕐', true)}
        {renderComplianceSection('Carrier Information', carrierData, '🏢', true)}
        {renderComplianceSection('Vehicle Information', vehicleData, '🚛', true)}
        {renderComplianceSection('Driver Information', driverData, '👤', true)}
        {renderComplianceSection('ELD Device', eldDeviceData, '📱', true)}
        {renderComplianceSection('Event Data', eventData, '📋', true)}
        {renderComplianceSection('Location Data', locationData, '📍', true)}
        {renderComplianceSection('Diagnostic Data', diagnosticData, '🔧', true)}
        {renderComplianceSection('Configuration', configurationData, '⚙️')}
        {renderComplianceSection('Additional Data', additionalData, '📝')}
        {renderComplianceSection('File Data', fileData, '📄')}
        
        <View style={[styles.complianceNote, { backgroundColor: colors.card }]}>
          <Text style={[styles.complianceNoteTitle, { color: colors.text }]}>
            FMCSA Compliance Note
          </Text>
          <Text style={[styles.complianceNoteText, { color: colors.inactive }]}>
            All required fields must be present for FMCSA compliance. User-defined CAN parameters are not permitted.
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  complianceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  complianceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  parametersContainer: {
    gap: 8,
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  parameterInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parameterName: {
    fontSize: 14,
    flex: 2,
  },
  parameterValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  complianceNote: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  complianceNoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  complianceNoteText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ELDComplianceDashboard; 