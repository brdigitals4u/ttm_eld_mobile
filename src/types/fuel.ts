export interface FuelReceipt {
  id: string
  purchaseDate: number
  location: string
  gallons: number
  pricePerGallon: number
  totalAmount: number
  receiptImage?: string
  odometer?: number
  vehicleId: string
  driverId: string
  createdAt: number
}

export interface FuelState {
  receipts: FuelReceipt[]
  isLoading: boolean
  error: string | null
}
