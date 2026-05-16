export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  initialOdo: number;
  currentOdo: number;
  fuelCapacity: number; // In KGs
  status: 'Active' | 'In Maintenance';
}

export interface Driver {
  id: string;
  name: string;
  code: string;
  assignedVehicleId?: string;
  status: 'Active' | 'On Trip' | 'Inactive';
}

export interface CngFill {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  timestamp: string;
  station: string;
  kgsFilled: number;
  ratePerKg: number;
  totalAmount: number;
  videoUrl: string;
  pumpPhotoUrl: string;
  receiptPhotoUrl: string;
  receiptGeo: { lat: number; lng: number; address: string };
  odometerPhotoUrl: string;
  odometerGeo: { lat: number; lng: number; address: string };
  odometerValue: number;
  distanceDifferenceMeters: number; // Calculated distance
  isLocationMismatched: boolean;
  isFuelDropAlert: boolean;
  fuelDropPercentage?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  user: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

// Helper to calculate distance in meters between two coordinates using Haversine Formula
export function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}



// Function to load data from localstorage
export function loadSavedData() {
  const savedVehicles = localStorage.getItem('cng_vehicles') || '[]';
  const savedDrivers = localStorage.getItem('cng_drivers') || '[]';
  const savedFills = localStorage.getItem('cng_fills') || '[]';
  const savedLogs = localStorage.getItem('cng_logs') || '[]';

  return {
    vehicles: JSON.parse(savedVehicles),
    drivers: JSON.parse(savedDrivers),
    fills: JSON.parse(savedFills),
    logs: JSON.parse(savedLogs)
  };
}

// Save updates back to localstorage
export function saveAllData(vehicles: Vehicle[], drivers: Driver[], fills: CngFill[], logs: AuditLog[]) {
  localStorage.setItem('cng_vehicles', JSON.stringify(vehicles));
  localStorage.setItem('cng_drivers', JSON.stringify(drivers));
  localStorage.setItem('cng_fills', JSON.stringify(fills));
  localStorage.setItem('cng_logs', JSON.stringify(logs));
}
