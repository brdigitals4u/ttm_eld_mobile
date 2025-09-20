export interface Asset {
  id: string;
  type: 'truck' | 'trailer';
  number: string;
  make?: string;
  model?: string;
  year?: string;
  vin?: string;
  licensePlate?: string;
  isActive: boolean;
  assignedDriverId?: string;
  lastInspection?: number;
  nextInspectionDue?: number;
  documents: AssetDocument[];
}

export interface AssetDocument {
  id: string;
  type: 'registration' | 'insurance' | 'inspection' | 'other';
  name: string;
  url: string;
  expiryDate?: number;
  uploadedAt: number;
}

export interface AssetsState {
  assets: Asset[];
  isLoading: boolean;
  error: string | null;
}