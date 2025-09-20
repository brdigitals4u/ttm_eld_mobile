import React from 'react'
import { StyleSheet } from 'react-native'
import EnhancedFuelScreen from '@/app/fuel'

interface FuelReceipt {
  id: string
  vehicleNumber: string
  purchaseDate: string
  purchaseTime: string
  jurisdiction: string
  odometer: string
  fuelType: string
  fuelVolume: string
  fuelCost: string
  costPerGallon: string
  receipts: string[]
}

export const FuelScreen: React.FC = () => {
  
  return (<EnhancedFuelScreen />)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  receiptsList: {
    gap: 16,
  },
  receiptCard: {
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailsGrid: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  fuelInfoCard: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  costPerGallonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    padding: 4,
  },
  receiptImages: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptImageContainer: {
    width: 80,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  receiptImageText: {
    fontSize: 10,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 200,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
})
