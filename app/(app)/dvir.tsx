import { router, Stack } from 'expo-router';
import { ArrowLeft, Camera, ThumbsUp, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useTheme } from '@/context/theme-context';

type InspectionType = 'pre-trip' | 'post-trip';
type SafetyStatus = 'safe' | 'unsafe' | null;

interface PhotoSlot {
  id: string;
  label: string;
  taken: boolean;
}

export default function DVIRScreen() {
  const { colors, isDark } = useTheme();
  const [inspectionType, setInspectionType] = useState<InspectionType>('pre-trip');
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>(null);
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  
  const [vehiclePhotos, setVehiclePhotos] = useState<PhotoSlot[]>([
    { id: 'driver-side', label: 'Driver Side', taken: false },
    { id: 'front', label: 'Front', taken: false },
    { id: 'passenger-side', label: 'Passenger Side', taken: true },
    { id: 'back', label: 'Back', taken: false },
  ]);

  const [trailerPhotos, setTrailerPhotos] = useState<PhotoSlot[]>([
    { id: 'trailer-back', label: 'Trailer Back', taken: false },
    { id: 'trailer-left', label: 'Trailer Left', taken: false },
    { id: 'trailer-right', label: 'Trailer Right', taken: false },
  ]);

  const handlePhotoPress = (photoId: string, isTrailer: boolean = false) => {
    const photos = isTrailer ? trailerPhotos : vehiclePhotos;
    const setPhotos = isTrailer ? setTrailerPhotos : setVehiclePhotos;
    
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId ? { ...photo, taken: !photo.taken } : photo
    );
    setPhotos(updatedPhotos);
  };

  const handleNext = () => {
    if (safetyStatus === null) {
      Alert.alert('Required', 'Please choose a safety status before proceeding.');
      return;
    }
    
    if (safetyStatus === 'safe') {
      setShowCertifyModal(true);
    } else {
      Alert.alert('Unsafe Vehicle', 'Please address all safety issues before proceeding.');
    }
  };

  const handleCertifyAndSubmit = () => {
    setShowCertifyModal(false);
    Alert.alert(
      'DVIR Submitted',
      'Your Driver Vehicle Inspection Report has been submitted successfully.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const renderPhotoGrid = (photos: PhotoSlot[], isTrailer: boolean = false) => (
    <View style={styles.photoGrid}>
      {photos.map((photo) => (
        <TouchableOpacity
          key={photo.id}
          style={[
            styles.photoSlot,
            { borderColor: photo.taken ? colors.primary : colors.border }
          ]}
          onPress={() => handlePhotoPress(photo.id, isTrailer)}
        >
          <Camera 
            size={24} 
            color={photo.taken ? colors.primary : colors.inactive} 
          />
          <Text style={[
            styles.photoLabel,
            { color: photo.taken ? colors.primary : colors.inactive }
          ]}>
            {photo.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Create DVIR',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Inspection Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              inspectionType === 'pre-trip' && styles.toggleButtonActive,
              { borderColor: colors.primary }
            ]}
            onPress={() => setInspectionType('pre-trip')}
          >
            <Text style={[
              styles.toggleText,
              { color: inspectionType === 'pre-trip' ? colors.primary : colors.inactive }
            ]}>
              Pre-Trip
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              inspectionType === 'post-trip' && styles.toggleButtonActive,
              { borderColor: colors.primary }
            ]}
            onPress={() => setInspectionType('post-trip')}
          >
            <Text style={[
              styles.toggleText,
              { color: inspectionType === 'post-trip' ? colors.primary : colors.inactive }
            ]}>
              Post-Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Photos Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Take walkaround photos
          </Text>
          {renderPhotoGrid(vehiclePhotos)}
        </View>

        {/* Trailer Photos Section */}
        <View style={styles.section}>
          {renderPhotoGrid(trailerPhotos, true)}
        </View>

        {/* Vehicle Defects Section */}
        <Card style={styles.defectsCard}>
          <Text style={[styles.defectsTitle, { color: colors.text }]}>
            Add new vehicle defects
          </Text>
          <Text style={[styles.defectsSubtitle, { color: colors.inactive }]}>
            Any vehicle attributes not displayed are certified safe by the driver
          </Text>
          
          <TouchableOpacity 
            style={[styles.addDefectsButton, { borderColor: colors.primary }]}
            onPress={() => Alert.alert('Add Defects', 'Defects management would be implemented here')}
          >
            <Text style={[styles.addDefectsText, { color: colors.primary }]}>
              Add defects
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Trailer Defects Section */}
        <Card style={styles.defectsCard}>
          <Text style={[styles.defectsTitle, { color: colors.text }]}>
            Add new trailer defects
          </Text>
          <Text style={[styles.defectsSubtitle, { color: colors.inactive }]}>
            Any trailer attributes not displayed are certified safe by the driver
          </Text>
          
          <TouchableOpacity 
            style={[styles.addDefectsButton, { borderColor: colors.primary }]}
            onPress={() => Alert.alert('Add Defects', 'Defects management would be implemented here')}
          >
            <Text style={[styles.addDefectsText, { color: colors.primary }]}>
              Add defects
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Safety Status Section */}
        <Card style={[styles.safetyCard, { borderColor: '#FF6B6B', borderWidth: 2 }]}>
          <Text style={[styles.safetyTitle, { color: colors.text }]}>
            Choose safety status
          </Text>
          <Text style={[styles.safetyRequired, { color: '#FF6B6B' }]}>
            Required
          </Text>
          
          <View style={styles.safetyButtons}>
            <TouchableOpacity
              style={[
                styles.safetyButton,
                safetyStatus === 'safe' && styles.safetyButtonActive,
                { borderColor: colors.border }
              ]}
              onPress={() => setSafetyStatus('safe')}
            >
              <Text style={[
                styles.safetyButtonText,
                { color: safetyStatus === 'safe' ? colors.primary : colors.text }
              ]}>
                Safe to drive
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.safetyButton,
                safetyStatus === 'unsafe' && [styles.safetyButtonActive, { backgroundColor: '#FFE5E5' }],
                { borderColor: safetyStatus === 'unsafe' ? '#FF6B6B' : colors.border }
              ]}
              onPress={() => setSafetyStatus('unsafe')}
            >
              <Text style={[
                styles.safetyButtonText,
                { color: safetyStatus === 'unsafe' ? '#FF6B6B' : colors.text }
              ]}>
                Unsafe
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Button
          title="Next"
          onPress={handleNext}
          fullWidth
          style={styles.nextButton}
        />
      </ScrollView>

      {/* Certify Modal */}
      <Modal
        visible={showCertifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCertifyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCertifyModal(false)}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Certify DVIR
            </Text>
            
            <View style={styles.modalIcon}>
              <ThumbsUp size={48} color="#4CAF50" />
            </View>
            
            <Text style={[styles.modalVehicleTitle, { color: colors.text }]}>
              Safe DVIR for 330
            </Text>
            
            <Text style={[styles.modalCertifyText, { color: colors.inactive }]}>
              I certify that the Vehicle 330 is safe to drive.
            </Text>
            
            <Button
              title="Certify and Submit"
              onPress={handleCertifyAndSubmit}
              fullWidth
              style={styles.certifyButton}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  photoSlot: {
    width: '22%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center',
    marginTop: 4,
  },
  defectsCard: {
    marginBottom: 16,
  },
  defectsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  defectsSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  addDefectsButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  addDefectsText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  safetyCard: {
    marginBottom: 24,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  safetyRequired: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 16,
  },
  safetyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  safetyButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  safetyButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  safetyButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  nextButton: {
    marginBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    marginBottom: 24,
  },
  modalIcon: {
    marginBottom: 24,
  },
  modalVehicleTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  modalCertifyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  certifyButton: {
    width: '100%',
  },
});