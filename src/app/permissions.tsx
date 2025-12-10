/**
 * Permissions Screen
 *
 * Interactive permissions request screen that appears after splash screen
 * but before beta agreement screen. Uses react-native-reanimated for smooth animations.
 * Once all permissions are granted, navigates to the next screen.
 */

import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { View, StyleSheet, TouchableOpacity, StatusBar } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { Camera, Image as ImageIcon, Bluetooth, MapPin, CheckCircle } from "lucide-react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated"

import { Header } from "@/components/Header"
import { SafeAreaContainer } from "@/components/SafeAreaContainer"
import { Text } from "@/components/Text"
import { usePermissions } from "@/contexts/permissions-context"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import {
  requestCorePermissions,
  checkCorePermissions,
  PermissionResult,
  requestMediaLibraryPermission,
  requestCameraPermission,
  requestBluetoothPermission,
} from "@/utils/permissions"
import { settingsStorage } from "@/utils/storage"

interface PermissionItem {
  id: "camera" | "mediaLibrary" | "bluetooth" | "location"
  name: string
  description: string
  icon: typeof Camera
  color: string
}

// Location permission is handled separately in LocationConsent screen
// Only include camera, gallery, and bluetooth here
const PERMISSIONS: PermissionItem[] = [
  {
    id: "camera",
    name: "Camera",
    description: "Take photos for fuel receipts and inspections",
    icon: Camera,
    color: "#3B82F6",
  },
  {
    id: "mediaLibrary",
    name: "Gallery",
    description: "Access photos for receipts and documents",
    icon: ImageIcon,
    color: "#8B5CF6",
  },
  {
    id: "bluetooth",
    name: "Bluetooth",
    description: "Connect to ELD devices for vehicle diagnostics",
    icon: Bluetooth,
    color: "#10B981",
  },
]

export default function PermissionsScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { requestPermissions } = usePermissions()
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Record<string, PermissionResult>>({})
  const [isRequesting, setIsRequesting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allGranted, setAllGranted] = useState(false)
  const [_hasSeenPermissionsBefore, setHasSeenPermissionsBefore] = useState(false)
  const hasSeenPermissionsRef = useRef(false)
  const [locationDeclined, setLocationDeclined] = useState(false)
  const [locationAccepted, setLocationAccepted] = useState(false)

  // Animation values
  const progress = useSharedValue(0)
  const cardScale = useSharedValue(1)
  const cardOpacity = useSharedValue(1)
  const checkmarkScale = useSharedValue(0)
  const buttonScale = useSharedValue(1)

  // REMOVED: Automatic permission request on screen focus
  // Permissions should only be requested when user explicitly taps a button
  // Check if location was declined or accepted
  useEffect(() => {
    const checkLocationStatus = async () => {
      if (user?.id) {
        const declined = await settingsStorage.getLocationDisclosureDeclined(user.id)
        const accepted = await settingsStorage.getLocationDisclosureAccepted(user.id)
        setLocationDeclined(declined)
        setLocationAccepted(accepted)
      }
    }
    checkLocationStatus()
  }, [user?.id])

  // Check initial permissions
  useEffect(() => {
    checkInitialPermissions()
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadFlag = async () => {
      try {
        const seen = await settingsStorage.getHasSeenPermissions()
        if (isMounted) {
          setHasSeenPermissionsBefore(seen)
          hasSeenPermissionsRef.current = seen
        }
      } catch (error) {
        console.error("Error loading permissions flag:", error)
      }
    }
    loadFlag()
    return () => {
      isMounted = false
    }
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
      console.error("Error checking permissions:", error)
    }
  }

  const updateProgress = useCallback(
    (perms: Record<string, PermissionResult>) => {
      const grantedCount = Object.values(perms).filter((p) => p.granted).length
      const totalCount = PERMISSIONS.length
      const newProgress = grantedCount / totalCount

      progress.value = withSpring(newProgress, {
        damping: 15,
        stiffness: 100,
      })

      if (grantedCount === totalCount && !allGranted) {
        setAllGranted(true)
        checkmarkScale.value = withSequence(
          withSpring(1.2, { damping: 10 }),
          withSpring(1, { damping: 10 }),
        )
        if (hasSeenPermissionsRef.current) {
          setTimeout(() => {
            handleAllGranted()
          }, 1500)
        }
      }
    },
    [allGranted, progress, checkmarkScale],
  )

  const handleAllGranted = useCallback(async () => {
    await settingsStorage.setHasSeenPermissions(true)
    hasSeenPermissionsRef.current = true
    setHasSeenPermissionsBefore(true)
    router.replace("/device-scan")
  }, [])

  const requestPermission = useCallback(
    async (permissionId: PermissionItem["id"]) => {
      if (isRequesting) return

      setIsRequesting(true)
      const permission = PERMISSIONS.find((p) => p.id === permissionId)
      if (!permission) return

      try {
        // Animate card press
        cardScale.value = withSequence(
          withTiming(0.95, { duration: 100 }),
          withSpring(1, { damping: 10 }),
        )

        // Map permission ID to PermissionResult name
        const permissionNameMap: Record<PermissionItem["id"], PermissionResult["name"]> = {
          camera: "camera",
          mediaLibrary: "mediaLibrary",
          bluetooth: "bluetooth",
          location: "location",
        }

        const permissionName = permissionNameMap[permissionId]

        // Request individual permission with proper handling
        let result: PermissionResult

        // Import individual permission request functions
        const {
          requestMediaLibraryPermission,
          requestCameraPermission,
          requestLocationPermission,
          requestBluetoothPermission,
        } = await import("@/utils/permissions")

        // Add delay before requesting to prevent system dialog conflicts
        await new Promise((resolve) => setTimeout(resolve, 500))

        switch (permissionId) {
          case "camera":
            result = await requestCameraPermission(false)
            break
          case "mediaLibrary":
            result = await requestMediaLibraryPermission(false)
            break
          case "bluetooth":
            // Bluetooth needs extra delay and retry logic
            await new Promise((resolve) => setTimeout(resolve, 300))
            result = await requestBluetoothPermission(false)
            // If not granted, wait and check again (user might be granting in system dialog)
            if (!result.granted) {
              await new Promise((resolve) => setTimeout(resolve, 1000))
              result = await requestBluetoothPermission(true) // Check status
            }
            break
          default:
            result = { name: permissionName, granted: false, error: "Unknown permission" }
        }

        const permissionsMap: Record<string, PermissionResult> = { ...permissions }
        permissionsMap[permissionName] = result

        // Animate success for the requested permission
        if (result.granted) {
          cardOpacity.value = withTiming(0.7, { duration: 200 })
          setTimeout(() => {
            cardOpacity.value = withSpring(1, { damping: 10 })
          }, 300)
        }

        setPermissions(permissionsMap)
        updateProgress(permissionsMap)

        // Move to next permission if not granted
        if (!result.granted) {
          const currentIdx = PERMISSIONS.findIndex((p) => p.id === permissionId)
          if (currentIdx < PERMISSIONS.length - 1) {
            setCurrentIndex(currentIdx + 1)
          }
        } else {
          // Move to next ungranted permission
          const nextUngranted = PERMISSIONS.findIndex(
            (p, idx) => idx > currentIndex && !permissionsMap[p.id]?.granted,
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
    },
    [isRequesting, permissions, currentIndex, cardScale, cardOpacity, updateProgress],
  )

  const requestAllPermissions = useCallback(async () => {
    if (isRequesting) return

    setIsRequesting(true)
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10 }),
    )

    try {
      const permissionsMap: Record<string, PermissionResult> = {}

      // If location was accepted, request all permissions including location
      // If location was declined, only request camera, gallery, and bluetooth
      if (locationAccepted) {
        // Request all permissions including location
        const results = await requestCorePermissions({ skipIfGranted: false, parallel: false })
        results.forEach((result) => {
          permissionsMap[result.name] = result
        })
      } else {
        // Only request camera, gallery, and bluetooth (skip location)
        const [mediaLibraryResult, cameraResult, bluetoothResult] = await Promise.all([
          requestMediaLibraryPermission(false),
          requestCameraPermission(false),
          requestBluetoothPermission(false),
        ])

        permissionsMap["mediaLibrary"] = mediaLibraryResult
        permissionsMap["camera"] = cameraResult
        permissionsMap["bluetooth"] = bluetoothResult
      }

      setPermissions(permissionsMap)
      updateProgress(permissionsMap)
    } catch (error) {
      console.error("Error requesting all permissions:", error)
    } finally {
      setIsRequesting(false)
    }
  }, [isRequesting, buttonScale, updateProgress, locationAccepted])

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

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        checkmarkOverlay: {
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          position: "absolute",
          right: -4,
          top: -4,
        },
        container: {
          backgroundColor: colors.background,
          flex: 1,
        },
        content: {
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
        },
        header: {
          marginBottom: 32,
        },
        iconContainer: {
          alignItems: "center",
          borderRadius: 16,
          height: 64,
          justifyContent: "center",
          marginRight: 16,
          position: "relative",
          width: 64,
        },
        permissionCard: {
          marginBottom: 12,
        },
        permissionCardContent: {
          alignItems: "center",
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 2,
          flexDirection: "row",
          padding: 16,
        },
        permissionCardGranted: {
          backgroundColor: `${colors.tint}22`,
          borderColor: colors.tint,
        },
        permissionDescription: {
          color: colors.textDim,
          fontSize: 14,
          lineHeight: 20,
        },
        permissionInfo: {
          flex: 1,
        },
        permissionName: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 4,
        },
        permissionsList: {
          flex: 1,
          gap: 16,
        },
        primaryButton: {
          alignItems: "center",
          backgroundColor: colors.buttonPrimary,
          borderRadius: 16,
          elevation: 4,
          marginBottom: 80,
          marginTop: 24,
          paddingHorizontal: 32,
          paddingVertical: 18,
          shadowColor: `${colors.tint}66`,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        primaryButtonDisabled: {
          opacity: 0.6,
        },
        primaryButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 18,
          fontWeight: "bold",
        },
        progressBarBackground: {
          backgroundColor: colors.sectionBackground,
          borderRadius: 4,
          height: 8,
          marginBottom: 8,
          overflow: "hidden",
        },
        progressBarFill: {
          backgroundColor: colors.tint,
          borderRadius: 4,
          height: "100%",
        },
        progressContainer: {
          marginBottom: 32,
        },
        progressText: {
          color: colors.textDim,
          fontSize: 14,
          textAlign: "center",
        },
        requestButton: {
          backgroundColor: colors.buttonPrimary,
          borderRadius: 8,
          paddingHorizontal: 20,
          paddingVertical: 10,
        },
        requestButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 14,
          fontWeight: "600",
        },
        subtitle: {
          color: "#FFFFFF",
          fontSize: 16,
          lineHeight: 24,
        },
        successContainer: {
          alignItems: "center",
          marginTop: 32,
          paddingVertical: 24,
        },
        successSubtext: {
          color: colors.textDim,
          fontSize: 16,
          marginTop: 8,
        },
        successText: {
          color: colors.text,
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 16,
        },
        title: {
          color: "#FFFFFF",
          fontSize: 32,
          fontWeight: "bold",
          marginBottom: 8,
        },
      }),
    [colors],
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        animated={true}
        backgroundColor={colors.background}
        showHideTransition="fade"
        hidden={false}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <Header
        title={translate("permissions.title" as any) || "App Permissions"}
        titleMode="center"
        backgroundColor={colors.background}
        titleStyle={{ color: "#FFFFFF", fontSize: 32, fontWeight: "bold" }}
        safeAreaEdges={["top"]}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            {translate("permissions.subtitle" as any) ||
              "We need these permissions to provide the best experience"}
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
            // Note: location is not included here as it's handled separately in LocationConsent screen
            const permissionNameMap: Record<PermissionItem["id"], PermissionResult["name"]> = {
              camera: "camera",
              mediaLibrary: "mediaLibrary",
              bluetooth: "bluetooth",
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
                {isRequesting ? "Requesting..." : "Grant All Permissions"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Success State */}
        {allPermissionsGranted && (
          <>
            {!hasSeenPermissionsRef.current && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleAllGranted}>
                <Text style={styles.primaryButtonText}>
                  {translate("permissions.continueButton" as any) || "Continue to Login"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  )
}

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

const PermissionCard: React.FC<PermissionCardProps> = memo(
  ({ permission, index, currentIndex, isGranted, Icon, onPress, disabled, checkmarkStyle }) => {
    const { theme } = useAppTheme()
    const { colors } = theme
    const cardScale = useSharedValue(1)
    const cardOpacity = useSharedValue(isGranted ? 0.6 : 1)

    // Dynamic styles for PermissionCard
    const cardStyles = useMemo(
      () =>
        StyleSheet.create({
          checkmarkOverlay: {
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            position: "absolute",
            right: -4,
            top: -4,
          },
          iconContainer: {
            alignItems: "center",
            borderRadius: 16,
            height: 64,
            justifyContent: "center",
            marginRight: 16,
            position: "relative",
            width: 64,
          },
          permissionCard: {
            marginBottom: 12,
          },
          permissionCardContent: {
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            borderRadius: 16,
            borderWidth: 2,
            flexDirection: "row",
            padding: 16,
          },
          permissionCardGranted: {
            backgroundColor: `${colors.tint}22`,
            borderColor: colors.tint,
          },
          permissionDescription: {
            color: colors.textDim,
            fontSize: 14,
            lineHeight: 20,
          },
          permissionInfo: {
            flex: 1,
          },
          permissionName: {
            color: colors.text,
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 4,
          },
          requestButton: {
            backgroundColor: colors.buttonPrimary,
            borderRadius: 8,
            paddingHorizontal: 20,
            paddingVertical: 10,
          },
          requestButtonText: {
            color: colors.buttonPrimaryText,
            fontSize: 14,
            fontWeight: "600",
          },
        }),
      [colors],
    )

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
      <Animated.View style={[cardStyles.permissionCard, cardAnimatedStyle]}>
        <TouchableOpacity
          style={[cardStyles.permissionCardContent, isGranted && cardStyles.permissionCardGranted]}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View style={[cardStyles.iconContainer, { backgroundColor: `${permission.color}15` }]}>
            <Icon size={32} color={permission.color} />
            {isGranted && (
              <Animated.View style={[cardStyles.checkmarkOverlay, checkmarkStyle]}>
                <CheckCircle size={20} color={permission.color} fill={permission.color} />
              </Animated.View>
            )}
          </View>
          <View style={cardStyles.permissionInfo}>
            <Text style={cardStyles.permissionName}>{permission.name}</Text>
            <Text style={cardStyles.permissionDescription}>{permission.description}</Text>
          </View>
          {!isGranted && (
            <View style={cardStyles.requestButton}>
              <Text style={cardStyles.requestButtonText}>Grant</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    )
  },
)

PermissionCard.displayName = "PermissionCard"
