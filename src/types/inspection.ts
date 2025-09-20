export interface InspectionItem {
  id: string;
  category: string;
  item: string;
  isRequired: boolean;
  status: 'pass' | 'fail' | 'na' | 'pending';
  notes?: string;
}

export interface Inspection {
  id: string;
  type: 'pre-trip' | 'post-trip' | 'dot';
  vehicleId: string;
  driverId: string;
  startTime: number;
  endTime?: number;
  items: InspectionItem[];
  overallStatus: 'pass' | 'fail' | 'pending';
  signature?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface InspectionState {
  inspections: Inspection[];
  currentInspection: Inspection | null;
  isLoading: boolean;
  error: string | null;
}