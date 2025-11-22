/**
 * Permissions Screen
 * 
 * Interactive permissions request screen that appears after splash screen
 * but before beta agreement screen. Uses react-native-reanimated for smooth animations.
 * Once all permissions are granted, navigates to the next screen.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated'
import { router } from 'expo-router'
import {
  Camera,
  Image as ImageIcon,
  Bluetooth,
  MapPin,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native'
import { requestCorePermissions, checkCorePermissions, PermissionResult } from '@/utils/permissions'
import { settingsStorage } from '@/utils/storage'
import { COLORS } from '@/constants/colors'
import { translate } from '@/i18n/translate'

interface PermissionItem {
  id: 'camera' | 'mediaLibrary' | 'bluetooth' | 'location'
  name: string
  description: string
  icon: typeof Camera
  color: string
}

const PERMISSIONS: PermissionItem[] = [
  {
    id: 'camera',
    name: 'Camera',
    description: 'Take photos for fuel receipts and inspections',
    icon: Camera,
    color: '#3B82F6',
  },
  {
    id: 'mediaLibrary',
    name: 'Gallery',
    description: 'Access photos for receipts and documents',
    icon: ImageIcon,
    color: '#8B5CF6',
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth',
    description: 'Connect to ELD devices for vehicle diagnostics',
    icon: Bluetooth,
    color: '#10B981',
  },
  {
    id: 'location',
    name: 'Location',
    description: 'Track location for HOS compliance and logging',
    icon: MapPin,
    color: '#F59E0B',
  },
]

export default function PermissionsScreen() {
  const [permissions, setPermissions] = useState<Record<string, PermissionResult>>({})
  const [isRequesting, setIsRequesting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allGranted, setAllGranted] = useState(false)

  // Animation values
  const progress = useSharedValue(0)
  const cardScale = useSharedValue(1)
  const cardOpacity = useSharedValue(1)
  const checkmarkScale = useSharedValue(0)
  const buttonScale = useSharedValue(1)

  // Check initial permissions
  useEffect(() => {
    checkInitialPermissions()
  }, [])

  const checkInitialPermissions = async () => {
    try {
      const results = await checkCorePermissions()
      const permissionsMap: Record<string, PermissionResult> = {}
      results.forEach((result) => {
        permissionsMap[result.name] = result
      })
      setPermissions(permissionsMap)
      updateProgress(permissionsMap)
    } catch (error) {
      console.error('Error checking permissions:', error)
    }
  }

  const updateProgress = useCallback((perms: Record<string, PermissionResult>) => {
    const grantedCount = Object.values(perms).filter((p) => p.granted).length
    const totalCount = PERMISSIONS.length
    const newProgress = grantedCount / totalCount

    progress.value = withSpring(newProgress, {
      damping: 15,
      stiffness: 100,
    })

    if (grantedCount === totalCount && !allGranted) {
      setAllGranted(true)
      // Animate checkmark
      checkmarkScale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 10 })
      )
      // Navigate after animation
      setTimeout(() => {
        handleAllGranted()
      }, 1500)
    }
  }, [allGranted, progress, checkmarkScale])

  const handleAllGranted = async () => {
    await settingsStorage.setHasSeenPermissions(true)
    router.replace('/welcome')
  }

  const requestPermission = useCallback(async (permissionId: PermissionItem['id']) => {
    if (isRequesting) return

    setIsRequesting(true)
    const permission = PERMISSIONS.find((p) => p.id === permissionId)
    if (!permission) return

    try {
      // Animate card press
      cardScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 10 })
      )

      // Map permission ID to PermissionResult name
      const permissionNameMap: Record<PermissionItem['id'], PermissionResult['name']> = {
        camera: 'camera',
        mediaLibrary: 'mediaLibrary',
        bluetooth: 'bluetooth',
        location: 'location',
      }

      const permissionName = permissionNameMap[permissionId]

      // Request all permissions (they handle skipIfGranted internally)
      const results = await requestCorePermissions({ skipIfGranted: false, parallel: false })
      const permissionsMap: Record<string, PermissionResult> = { ...permissions }
      
      results.forEach((result) => {
        permissionsMap[result.name] = result
        
        // Animate success for the requested permission
        if (result.name === permissionName && result.granted) {
          cardOpacity.value = withTiming(0.7, { duration: 200 })
          setTimeout(() => {
            cardOpacity.value = withSpring(1, { damping: 10 })
          }, 300)
        }
      })

      setPermissions(permissionsMap)
      updateProgress(permissionsMap)

      // Move to next permission if not granted
      if (!permissionsMap[permissionName]?.granted) {
        const currentIdx = PERMISSIONS.findIndex((p) => p.id === permissionId)
        if (currentIdx < PERMISSIONS.length - 1) {
          setCurrentIndex(currentIdx + 1)
        }
      } else {
        // Move to next ungranted permission
        const nextUngranted = PERMISSIONS.findIndex(
          (p, idx) => idx > currentIndex && !permissionsMap[p.id]?.granted
        )
        if (nextUngranted !== -1) {
          setCurrentIndex(nextUngranted)
        }
      }
    } catch (error) {
      console.error(`Error requesting ${permissionId} permission:`, error)
    } finally {
      setIsRequesting(false)
    }
  }, [isRequesting, permissions, currentIndex, cardScale, cardOpacity, updateProgress])

  const requestAllPermissions = useCallback(async () => {
    if (isRequesting) return

    setIsRequesting(true)
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10 })
    )

    try {
      const results = await requestCorePermissions({ skipIfGranted: false, parallel: false })
      const permissionsMap: Record<string, PermissionResult> = {}
      
      results.forEach((result) => {
        permissionsMap[result.name] = result
      })

      setPermissions(permissionsMap)
      updateProgress(permissionsMap)
    } catch (error) {
      console.error('Error requesting all permissions:', error)
    } finally {
      setIsRequesting(false)
    }
  }, [isRequesting, buttonScale, updateProgress])

  // Animated progress bar
  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    }
  })

  // Animated button
  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    }
  })

  // Animated checkmark
  const checkmarkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkmarkScale.value }],
      opacity: checkmarkScale.value,
    }
  })

  const grantedCount = Object.values(permissions).filter((p) => p.granted).length
  const allPermissionsGranted = grantedCount === PERMISSIONS.length

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{translate('permissions.title' as any) || 'App Permissions'}</Text>
          <Text style={styles.subtitle}>
            {translate('permissions.subtitle' as any) ||
              'We need these permissions to provide the best experience'}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
          </View>
          <Text style={styles.progressText}>
            {grantedCount} of {PERMISSIONS.length} permissions granted
          </Text>
        </View>

        {/* Permissions List */}
        <View style={styles.permissionsList}>
          {PERMISSIONS.map((permission, index) => {
            // Map permission ID to PermissionResult name
            const permissionNameMap: Record<PermissionItem['id'], PermissionResult['name']> = {
              camera: 'camera',
              mediaLibrary: 'mediaLibrary',
              bluetooth: 'bluetooth',
              location: 'location',
            }
            const permissionName = permissionNameMap[permission.id]
            const permissionResult = permissions[permissionName]
            const isGranted = permissionResult?.granted || false
            const Icon = permission.icon

            return (
              <PermissionCard
                key={permission.id}
                permission={permission}
                index={index}
                currentIndex={currentIndex}
                isGranted={isGranted}
                Icon={Icon}
                onPress={() => !isGranted && requestPermission(permission.id)}
                disabled={isGranted || isRequesting}
                checkmarkStyle={checkmarkStyle}
              />
            )
          })}
        </View>

        {/* Action Button */}
        {!allPermissionsGranted && (
          <Animated.View style={buttonStyle}>
            <TouchableOpacity
              style={[styles.primaryButton, isRequesting && styles.primaryButtonDisabled]}
              onPress={requestAllPermissions}
              disabled={isRequesting}
            >
              <Text style={styles.primaryButtonText}>
                {isRequesting ? 'Requesting...' : 'Grant All Permissions'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Success State */}
        {allPermissionsGranted && (
          <Animated.View style={[styles.successContainer, checkmarkStyle]}>
            <CheckCircle size={64} color={COLORS.primary} fill={COLORS.primary} />
            <Text style={styles.successText}>All permissions granted!</Text>
            <Text style={styles.successSubtext}>Continuing to next step...</Text>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.ink700,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.ink500,
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.ink500,
    textAlign: 'center',
  },
  permissionsList: {
    flex: 1,
    gap: 16,
  },
  permissionCard: {
    marginBottom: 12,
  },
  permissionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  permissionCardGranted: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.ink700,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: COLORS.ink500,
    lineHeight: 20,
  },
  requestButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  requestButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 24,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.ink700,
    marginTop: 16,
  },
  successSubtext: {
    fontSize: 16,
    color: COLORS.ink500,
    marginTop: 8,
  },
})

// Memoized Permission Card Component for better performance
interface PermissionCardProps {
  permission: PermissionItem
  index: number
  currentIndex: number
  isGranted: boolean
  Icon: typeof Camera
  onPress: () => void
  disabled: boolean
  checkmarkStyle: any
}

const PermissionCard: React.FC<PermissionCardProps> = React.memo(({ permission, index, currentIndex, isGranted, Icon, onPress, disabled, checkmarkStyle }) => {
  const cardScale = useSharedValue(1)
  const cardOpacity = useSharedValue(isGranted ? 0.6 : 1)

  useEffect(() => {
    cardOpacity.value = withSpring(isGranted ? 0.6 : 1, { damping: 15 })
  }, [isGranted, cardOpacity])

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const isActive = index === currentIndex
    const scale = isActive ? 1.02 : cardScale.value

    return {
      transform: [{ scale }],
      opacity: cardOpacity.value,
    }
  })

  return (
    <Animated.View style={[styles.permissionCard, cardAnimatedStyle]}>
      <TouchableOpacity
        style={[
          styles.permissionCardContent,
          isGranted && styles.permissionCardGranted,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${permission.color}15` }]}>
          <Icon size={32} color={permission.color} />
          {isGranted && (
            <Animated.View style={[styles.checkmarkOverlay, checkmarkStyle]}>
              <CheckCircle size={20} color={permission.color} fill={permission.color} />
            </Animated.View>
          )}
        </View>
        <View style={styles.permissionInfo}>
          <Text style={styles.permissionName}>{permission.name}</Text>
          <Text style={styles.permissionDescription}>{permission.description}</Text>
        </View>
        {!isGranted && (
          <View style={styles.requestButton}>
            <Text style={styles.requestButtonText}>Grant</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
})

PermissionCard.displayName = 'PermissionCard'

