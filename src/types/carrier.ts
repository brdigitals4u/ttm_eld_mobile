export interface CarrierInfo {
  id: string
  name: string
  dotNumber: string
  mcNumber?: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  phone: string
  email: string
  contactPerson: string
  timeZone: string
  cycleType: "60-7" | "70-8"
  restartHours: number
}

export interface CarrierState {
  carrierInfo: CarrierInfo | null
  isLoading: boolean
  error: string | null
}
