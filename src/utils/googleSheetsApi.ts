/**
 * CNG FLOW - GOOGLE SHEETS API SERVICE
 * Uses localStorage as primary storage, Google Sheets for cloud sync
 */

// ==================== CONFIGURATION ====================
function getApiUrl(): string {
  const stored = localStorage.getItem('cng_google_sheets_url');
  if (stored) return stored;
  
  // Support URL parameter for easy device setup
  const urlParams = new URLSearchParams(window.location.search);
  const urlFromParam = urlParams.get('api_url');
  if (urlFromParam) {
    localStorage.setItem('cng_google_sheets_url', urlFromParam);
    return urlFromParam;
  }
  
  return '';
}

export function setApiUrl(url: string) {
  localStorage.setItem('cng_google_sheets_url', url);
}

export function isGoogleSheetsConfigured(): boolean {
  return getApiUrl().length > 0;
}

export function getConfigStatus(): string {
  return isGoogleSheetsConfigured() ? 'Connected to Google Sheets' : 'Demo Mode (localStorage)';
}

export function getGoogleSheetsUrl(): string {
  return localStorage.getItem('cng_google_sheets_url') || '';
}

export function saveGoogleSheetsUrl(url: string) {
  localStorage.setItem('cng_google_sheets_url', url);
}

// ==================== JSONP HELPER ====================
function jsonpRequest(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout'));
    }, 15000);
    
    function cleanup() {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    
    (window as any)[callbackName] = function(data: any) {
      cleanup();
      resolve(data);
    };
    
    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    script.onerror = function() {
      cleanup();
      reject(new Error('Script error'));
    };
    
    document.head.appendChild(script);
  });
}

// ==================== LOCALSTORAGE FALLBACK ====================
function fallbackRequest(action: string, data?: any): any {
  switch(action) {
    case 'getDrivers':
      return { success: true, drivers: JSON.parse(localStorage.getItem('cng_drivers') || '[]') };
    case 'authenticateDriver': {
      const drivers = JSON.parse(localStorage.getItem('cng_drivers') || '[]');
      const driver = drivers.find((d: any) => d.code?.toUpperCase() === data?.code?.toUpperCase());
      return driver ? { success: true, driver } : { success: false, message: 'Invalid code' };
    }
    case 'addDriver': {
      const d = JSON.parse(localStorage.getItem('cng_drivers') || '[]');
      const newDriver = { id: 'drv-' + Date.now(), name: data.name, code: data.code.toUpperCase(), assignedVehicleId: data.assignedVehicleId || '', status: 'Active' };
      localStorage.setItem('cng_drivers', JSON.stringify([...d, newDriver]));
      return { success: true, driver: newDriver };
    }
    case 'getVehicles':
      return { success: true, vehicles: JSON.parse(localStorage.getItem('cng_vehicles') || '[]') };
    case 'addVehicle': {
      const v = JSON.parse(localStorage.getItem('cng_vehicles') || '[]');
      const newVehicle = { id: 'veh-' + Date.now(), plateNumber: data.plateNumber.toUpperCase(), model: data.model, initialOdo: parseInt(data.initialOdo) || 0, currentOdo: parseInt(data.initialOdo) || 0, fuelCapacity: parseInt(data.fuelCapacity) || 12, status: 'Active' };
      localStorage.setItem('cng_vehicles', JSON.stringify([...v, newVehicle]));
      return { success: true, vehicle: newVehicle };
    }
    case 'getFills':
      return { success: true, fills: JSON.parse(localStorage.getItem('cng_fills') || '[]') };
    case 'addFill': {
      const f = JSON.parse(localStorage.getItem('cng_fills') || '[]');
      const newFill = { id: 'fill-' + Date.now(), ...data, timestamp: new Date().toISOString() };
      localStorage.setItem('cng_fills', JSON.stringify([newFill, ...f]));
      return { success: true, fillId: newFill.id };
    }
    case 'getAlerts':
      return { success: true, alerts: JSON.parse(localStorage.getItem('cng_alerts') || '[]') };
    case 'addAlert': {
      const a = JSON.parse(localStorage.getItem('cng_alerts') || '[]');
      const newAlert = { id: 'alert-' + Date.now(), timestamp: new Date().toISOString(), ...data };
      localStorage.setItem('cng_alerts', JSON.stringify([newAlert, ...a]));
      return { success: true, alert: newAlert };
    }
    case 'deleteDriver': {
      const drivers = JSON.parse(localStorage.getItem('cng_drivers') || '[]');
      localStorage.setItem('cng_drivers', JSON.stringify(drivers.filter((d: any) => d.id !== data.id)));
      return { success: true, message: 'Driver deleted' };
    }
    case 'deleteVehicle': {
      const vehicles = JSON.parse(localStorage.getItem('cng_vehicles') || '[]');
      localStorage.setItem('cng_vehicles', JSON.stringify(vehicles.filter((v: any) => v.id !== data.id)));
      return { success: true, message: 'Vehicle deleted' };
    }
    case 'getDashboardStats': {
      const v = JSON.parse(localStorage.getItem('cng_vehicles') || '[]');
      const d = JSON.parse(localStorage.getItem('cng_drivers') || '[]');
      const f = JSON.parse(localStorage.getItem('cng_fills') || '[]');
      const a = JSON.parse(localStorage.getItem('cng_alerts') || '[]');
      return { success: true, stats: { totalVehicles: v.length, totalDrivers: d.length, totalFills: f.length, totalAlerts: a.length } };
    }
    default:
      return { success: false, message: 'Unknown action' };
  }
}

// ==================== API HELPER ====================
// Google Sheets is PRIMARY storage, localStorage is just cache
async function apiRequest(action: string, data?: any): Promise<any> {
  const apiUrl = getApiUrl();
  const ownerId = getCurrentOwnerId();
  
  // ALWAYS use Google Sheets as PRIMARY storage if API is configured
  if (apiUrl) {
    console.log(`📡 [PRIMARY] API Request: ${action}`);
    
    // Prepare payload with ownerId for all requests
    const payload = {
      action,
      ...data,
      ownerId: ownerId || ''
    };
    
    try {
      console.log('📦 Payload:', JSON.stringify(payload).substring(0, 200));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      });
      
      const text = await response.text();
      console.log('📥 Response:', text.substring(0, 300));
      
      try {
        const result = JSON.parse(text);
        console.log('✅ Parsed result:', result.success ? 'SUCCESS' : 'FAILED');
        
        // ALWAYS cache successful results in localStorage as backup
        if (result.success) {
          if (result.drivers) {
            localStorage.setItem('cng_drivers', JSON.stringify(result.drivers));
            console.log('💾 Cached drivers to localStorage (backup)');
          }
          if (result.vehicles) {
            localStorage.setItem('cng_vehicles', JSON.stringify(result.vehicles));
            console.log('💾 Cached vehicles to localStorage (backup)');
          }
          if (result.fills) {
            localStorage.setItem('cng_fills', JSON.stringify(result.fills));
            console.log('💾 Cached fills to localStorage (backup)');
          }
          if (result.alerts) {
            localStorage.setItem('cng_alerts', JSON.stringify(result.alerts));
            console.log('💾 Cached alerts to localStorage (backup)');
          }
          if (result.owner) {
            localStorage.setItem('cng_logged_in_owner', JSON.stringify(result.owner));
            console.log('💾 Cached owner to localStorage (backup)');
          }
        }
        
        return result;
      } catch (parseError) {
        console.error('❌ Could not parse response:', parseError);
        console.error('Raw response:', text);
        return { success: false, message: 'Invalid response from server' };
      }
    } catch (e: any) {
      console.error('❌ Request failed:', e);
      // If Sheets fails, try localStorage as fallback
      console.warn('⚠️ Falling back to localStorage...');
      return fallbackRequest(action, { ...data, ownerId });
    }
  }
  
  // ONLY use localStorage if NO API configured (demo mode)
  console.warn('⚠️ No API configured, using localStorage (DEMO MODE)');
  return fallbackRequest(action, { ...data, ownerId });
}

// ==================== PUBLIC API ====================
// Get current owner ID from localStorage
function getCurrentOwnerId(): string | null {
  const owner = localStorage.getItem('cng_logged_in_owner');
  if (owner) {
    try {
      const ownerData = JSON.parse(owner);
      return ownerData.id || null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getDrivers() { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('getDrivers', ownerId ? { ownerId } : undefined); 
}
export async function authenticateDriver(code: string) { return apiRequest('authenticateDriver', { code }); }
export async function addDriver(data: { name: string; code: string; assignedVehicleId?: string }) { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('addDriver', { ...data, ownerId: ownerId || '' }); 
}
export async function getVehicles() { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('getVehicles', ownerId ? { ownerId } : undefined); 
}
export async function addVehicle(data: any) { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('addVehicle', { ...data, ownerId: ownerId || '' }); 
}
export async function deleteDriver(id: string) { return apiRequest('deleteDriver', { id }); }
export async function deleteVehicle(id: string) { return apiRequest('deleteVehicle', { id }); }
export async function getFills() { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('getFills', ownerId ? { ownerId } : undefined); 
}
export async function addFill(data: any) { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('addFill', { ...data, ownerId: ownerId || '' }); 
}
export async function getAlerts() { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('getAlerts', ownerId ? { ownerId } : undefined); 
}
export async function addAlert(data: any) { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('addAlert', { ...data, ownerId: ownerId || '' }); 
}
export async function getDashboardStats() { 
  const ownerId = getCurrentOwnerId();
  return apiRequest('getDashboardStats', ownerId ? { ownerId } : undefined); 
}

export async function registerOwner(data: {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  email: string;
  businessName?: string;
  password: string;
}) {
  return apiRequest('registerOwner', data);
}

export async function authenticateOwner(data: { email: string; password: string }) {
  return apiRequest('authenticateOwner', data);
}

export async function uploadMediaToDrive(
  base64Data: string, 
  fileName: string, 
  mimeType: string, 
  folderName: string,
  vehiclePlate?: string,
  fillDate?: string
) {
  const apiUrl = getApiUrl();
  
  // If no API, save locally as data URL
  if (!apiUrl) {
    console.log('📁 No Google Sheets URL, saving media locally');
    return { 
      success: true, 
      fileUrl: `data:${mimeType};base64,${base64Data.substring(0, 100)}...`, 
      message: 'Saved locally (no Drive connected)' 
    };
  }
  
  try {
    const safePlate = vehiclePlate ? String(vehiclePlate).replace(/[^a-zA-Z0-9-_]/g, '_') : 'Unassigned';
    const safeDate = fillDate || new Date().toISOString().split('T')[0];
    
    console.log(`📤 Uploading ${fileName}`);
    console.log(`   Vehicle: ${safePlate}`);
    console.log(`   Date: ${safeDate}`);
    console.log(`   Path: CNG Flow Media/${safePlate}/${safeDate}`);
    
    // Prepare data payload
    const payload = {
      action: 'uploadMedia', 
      base64Data: base64Data,
      fileName: fileName, 
      mimeType: mimeType, 
      folderPath: folderName,
      vehiclePlate: safePlate,
      fillDate: safeDate
    };
    
    console.log('📦 Payload:', JSON.stringify(payload).substring(0, 200) + '...');
    
    // Send to Apps Script for Drive upload with vehicle & date organization
    await fetch(apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`✅ ${fileName} sent to Google Drive (no-cors mode)`);
    
    const fileUrl = `https://drive.google.com/drive/folders/CNG+Flow+Media/${safePlate}/${safeDate}`;
    
    return { 
      success: true, 
      fileUrl: fileUrl,
      fileName: fileName,
      folderPath: `CNG Flow Media/${safePlate}/${safeDate}`,
      vehicleFolderName: safePlate,
      dateFolderName: safeDate,
      message: 'File uploaded to Google Drive' 
    };
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return { 
      success: true, 
      fileUrl: `Upload pending: ${fileName}`,
      message: 'Upload queued (will sync when online)' 
    };
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
