export interface User {
  id: string;
  name: string;
  email: string;
  licenseNumber?: string;
  organizationId: string;
  organizationName: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface VehicleInfo {
  vehicleNumber: string;
  eldConnected: boolean;
  eldId?: string;
  make?: string;
  model?: string;
  year?: string;
}