import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Alert, AppState, AppStateStatus, Platform } from "react-native"

import {
  checkCorePermissions,
  ensureCorePermissions,
  openPermissionSettings,
  requestCorePermissions,
} from "@/utils/permissions"

type CorePermissionName = "bluetooth" | "mediaLibrary" | "camera" | "location"

interface PermissionStatus {
  name: CorePermissionName
  granted: boolean
  status?: string
  error?: string
}

interface PermissionsContextValue {
  permissions: PermissionStatus[]
  hasAllPermissions: boolean
  isRequesting: boolean
  requestPermissions: (options?: { skipIfGranted?: boolean }) => Promise<PermissionStatus[]>
  refreshPermissions: () => Promise<PermissionStatus[]>
  promptToEnablePermissions: () => void
  lastDeniedPermissions: CorePermissionName[]
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined)

const PLATFORM_LABEL_MAP: Record<CorePermissionName, string> = {
  bluetooth: Platform.select({ ios: "Bluetooth", android: "Nearby devices / Bluetooth" }) ?? "Bluetooth",
  mediaLibrary: Platform.select({ ios: "Photo Library", android: "Photos and media" }) ?? "Media library",
  camera: "Camera",
  location: Platform.select({ ios: "Location", android: "Location" }) ?? "Location",
}

function toPermissionStatus(result: any): PermissionStatus {
  return {
    name: result.name as CorePermissionName,
    granted: !!result.granted,
    status: result.status,
    error: result.error,
  }
}

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionStatus[]>([])
  const [isRequesting, setIsRequesting] = useState(false)
  const [initialRequestComplete, setInitialRequestComplete] = useState(false)
  const lastDeniedRef = useRef<CorePermissionName[]>([])
  const appStateRef = useRef(AppState.currentState)
  const isMountedRef = useRef(true)

  const showDeniedAlert = useCallback((denied: CorePermissionName[]) => {
    if (denied.length === 0) {
      lastDeniedRef.current = []
      return
    }

    // Avoid repeating alert if same set already notified
    const previous = lastDeniedRef.current.join(",")
    const current = denied.join(",")
    if (previous === current) {
      return
    }

    lastDeniedRef.current = denied

    const permissionLabels = denied.map((name) => PLATFORM_LABEL_MAP[name] ?? name).join(", ")
    Alert.alert(
      "Permissions Required",
      `Please enable ${permissionLabels} permission${denied.length > 1 ? "s" : ""} in Settings to continue using the app.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Open Settings",
          style: "default",
          onPress: () => {
            openPermissionSettings().catch((error) => {
              console.error("Failed to open settings:", error)
            })
          },
        },
      ],
    )
  }, [])

  const updatePermissions = useCallback(
    (results: any[]) => {
      const nextPermissions = results.map(toPermissionStatus)
      setPermissions(nextPermissions)
      const deniedPermissions = nextPermissions.filter((item) => !item.granted).map((item) => item.name)
      showDeniedAlert(deniedPermissions)
      return nextPermissions
    },
    [showDeniedAlert],
  )

  const requestPermissions = useCallback(
    async (options?: { skipIfGranted?: boolean }) => {
      setIsRequesting(true)
      try {
        const results = await requestCorePermissions({ skipIfGranted: options?.skipIfGranted ?? true })
        return updatePermissions(results)
      } catch (error) {
        console.error("Failed to request permissions:", error)
        return permissions
      } finally {
        if (isMountedRef.current) {
          setIsRequesting(false)
        }
      }
    },
    [permissions, updatePermissions],
  )

  const refreshPermissions = useCallback(async () => {
    try {
      const results = await checkCorePermissions()
      return updatePermissions(results)
    } catch (error) {
      console.error("Failed to refresh permissions:", error)
      return permissions
    }
  }, [permissions, updatePermissions])

  const promptToEnablePermissions = useCallback(() => {
    const denied = permissions.filter((item) => !item.granted).map((item) => item.name)
    if (denied.length > 0) {
      showDeniedAlert(denied)
    }
  }, [permissions, showDeniedAlert])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Initial permission request on mount
  useEffect(() => {
    if (initialRequestComplete) return

    let cancelled = false
    const init = async () => {
      try {
        const results = await ensureCorePermissions({ skipIfGranted: false })
        if (!cancelled) {
          setInitialRequestComplete(true)
        }
        // ensureCorePermissions returns boolean, need actual statuses -> refresh afterwards
        await refreshPermissions()
      } catch (error) {
        console.error("Initial permission request failed:", error)
        await refreshPermissions()
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [initialRequestComplete, refreshPermissions])

  // Re-check when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current
      appStateRef.current = nextAppState

      if (prevState.match(/inactive|background/) && nextAppState === "active") {
        refreshPermissions().catch((error) => {
          console.error("Failed to refresh permissions on app foreground:", error)
        })
      }
    }

    const subscription = AppState.addEventListener("change", handleAppStateChange)
    return () => subscription.remove()
  }, [refreshPermissions])

  const contextValue = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      hasAllPermissions: permissions.length > 0 && permissions.every((item) => item.granted),
      isRequesting,
      requestPermissions,
      refreshPermissions,
      promptToEnablePermissions,
      lastDeniedPermissions: lastDeniedRef.current,
    }),
    [permissions, isRequesting, requestPermissions, refreshPermissions, promptToEnablePermissions],
  )

  return <PermissionsContext.Provider value={contextValue}>{children}</PermissionsContext.Provider>
}

export const usePermissions = (): PermissionsContextValue => {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider")
  }
  return context
}

