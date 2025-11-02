import AsyncStorage from '@react-native-async-storage/async-storage'

const ELD_DEVICE_KEY = '@ttm_eld_device'

export interface EldDeviceInfo {
  address: string
  name: string | null
  connectedAt: string
}

/**
 * Save ELD device information to storage
 */
export const saveEldDevice = async (deviceInfo: EldDeviceInfo): Promise<void> => {
  try {
    await AsyncStorage.setItem(ELD_DEVICE_KEY, JSON.stringify(deviceInfo))
    console.log('✅ ELD device info saved:', deviceInfo)
  } catch (error) {
    console.error('❌ Failed to save ELD device info:', error)
  }
}

/**
 * Get saved ELD device information
 */
export const getEldDevice = async (): Promise<EldDeviceInfo | null> => {
  try {
    const data = await AsyncStorage.getItem(ELD_DEVICE_KEY)
    if (data) {
      const deviceInfo = JSON.parse(data) as EldDeviceInfo
      console.log('📱 Retrieved ELD device info:', deviceInfo)
      return deviceInfo
    }
    return null
  } catch (error) {
    console.error('❌ Failed to retrieve ELD device info:', error)
    return null
  }
}

/**
 * Clear saved ELD device information
 */
export const clearEldDevice = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ELD_DEVICE_KEY)
    console.log('🗑️  ELD device info cleared')
  } catch (error) {
    console.error('❌ Failed to clear ELD device info:', error)
  }
}
