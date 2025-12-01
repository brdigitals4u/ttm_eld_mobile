export interface CoDriver {
  id: string
  name: string
  email: string
  licenseNumber: string
  isActive: boolean
  addedAt: number
}

export interface CoDriverState {
  coDrivers: CoDriver[]
  activeCoDriver: CoDriver | null
  isLoading: boolean
  error: string | null
}
