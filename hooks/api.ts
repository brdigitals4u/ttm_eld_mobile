import { useState, useEffect } from 'react';

// Types for API responses
export interface DashboardData {
  driver: {
    name: string;
    id: string;
  };
  connectionStatus: 'connected' | 'disconnected';
  cycle: {
    type: 'USA';
    hours: number;
    days: number;
  };
  timers: {
    stopIn: number; // minutes
    driveLeft: number; // minutes
    shiftLeft: number; // minutes
    cycleLeft: number; // minutes
    cycleDays: number;
  };
  currentStatus: 'driving' | 'onDuty' | 'offDuty' | 'sleeper' | 'personalConveyance' | 'yardMoves';
  uncertifiedLogs: number;
}

export interface Vehicle {
  id: string;
  number: string;
  make: string;
  model: string;
  year: number;
}

export interface Trailer {
  id: string;
  number: string;
  type: string;
}

export interface ShippingID {
  id: string;
  number: string;
  description: string;
}

// Mock API functions
export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData: DashboardData = {
          driver: {
            name: 'Dan Smith',
            id: 'DS001'
          },
          connectionStatus: 'connected',
          cycle: {
            type: 'USA',
            hours: 70,
            days: 8
          },
          timers: {
            stopIn: 232, // 3:52
            driveLeft: 352, // 5:52
            shiftLeft: 563, // 9:23
            cycleLeft: 2701, // 45:01
            cycleDays: 6
          },
          currentStatus: 'driving',
          uncertifiedLogs: 22
        };
        
        setData(mockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, refetch: () => setLoading(true) };
};

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockVehicles: Vehicle[] = [
          { id: '1', number: '330', make: 'Freightliner', model: 'Cascadia', year: 2022 },
          { id: '2', number: '331', make: 'Peterbilt', model: '579', year: 2021 },
          { id: '3', number: '332', make: 'Kenworth', model: 'T680', year: 2023 },
        ];
        
        setVehicles(mockVehicles);
      } catch (err) {
        console.error('Failed to fetch vehicles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  return { vehicles, loading };
};

export const useTrailers = () => {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(false);

  const addTrailer = async (trailer: Omit<Trailer, 'id'>) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newTrailer: Trailer = {
        ...trailer,
        id: Date.now().toString()
      };
      setTrailers(prev => [...prev, newTrailer]);
      return newTrailer;
    } catch (err) {
      throw new Error('Failed to add trailer');
    } finally {
      setLoading(false);
    }
  };

  const removeTrailer = async (id: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setTrailers(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      throw new Error('Failed to remove trailer');
    } finally {
      setLoading(false);
    }
  };

  return { trailers, loading, addTrailer, removeTrailer };
};

export const useShippingIDs = () => {
  const [shippingIDs, setShippingIDs] = useState<ShippingID[]>([]);
  const [loading, setLoading] = useState(false);

  const addShippingID = async (shippingID: Omit<ShippingID, 'id'>) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newShippingID: ShippingID = {
        ...shippingID,
        id: Date.now().toString()
      };
      setShippingIDs(prev => [...prev, newShippingID]);
      return newShippingID;
    } catch (err) {
      throw new Error('Failed to add shipping ID');
    } finally {
      setLoading(false);
    }
  };

  const removeShippingID = async (id: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setShippingIDs(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      throw new Error('Failed to remove shipping ID');
    } finally {
      setLoading(false);
    }
  };

  return { shippingIDs, loading, addShippingID, removeShippingID };
};

export const useCertifyLogs = () => {
  const [loading, setLoading] = useState(false);

  const certifyLogs = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, this would call the API to certify logs
      return { success: true, message: 'Logs certified successfully' };
    } catch (err) {
      throw new Error('Failed to certify logs');
    } finally {
      setLoading(false);
    }
  };

  return { certifyLogs, loading };
};