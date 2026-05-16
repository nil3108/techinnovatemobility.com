/**
 * ================================================================
 * CNG FLOW - GOOGLE APPS SCRIPT BACKEND API
 * ================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Go to https://script.google.com → New project
 * 2. Name it "CNG Flow Backend API"
 * 3. Delete all default code and paste this entire script
 * 4. Click Save (Ctrl+S)
 * 5. Select "setupSheets" from the dropdown and click Run
 * 6. Grant permissions when asked
 * 7. Deploy → New deployment → Web app → Anyone can access
 * 8. Copy the deployment URL and paste it in the CNG Flow app
 * 
 * ================================================================
 */

// ==================== CONFIGURATION ====================
// Spreadsheet ID is stored in script properties after first run
function getSpreadsheetId() {
  return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
}

function setSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
}

// Get spreadsheet - creates new one if not exists
function getSpreadsheet() {
  var id = getSpreadsheetId();
  
  // Try existing spreadsheet first
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      Logger.log('Existing spreadsheet not found, creating new one...');
    }
  }
  
  // Create new spreadsheet
  var ss = SpreadsheetApp.create("CNG Flow Database");
  setSpreadsheetId(ss.getId());
  
  Logger.log('========================================');
  Logger.log('NEW SPREADSHEET CREATED!');
  Logger.log('URL: ' + ss.getUrl());
  Logger.log('ID: ' + ss.getId());
  Logger.log('========================================');
  
  return ss;
}

// Helper to get sheet by name
function getSheet(name) {
  var ss = getSpreadsheet();
  return ss.getSheetByName(name);
}

var DRIVE_FOLDER_NAME = "CNG Flow Media";

// ==================== WEB APP HANDLERS ====================
function doGet(e) {
  // Support JSONP callback for CORS bypass
  var callback = e.parameter.callback;
  
  var action = e.parameter.action;
  var response;
  
  switch(action) {
    case 'getDrivers':
      response = getDrivers();
      break;
    case 'getVehicles':
      response = getVehicles();
      break;
    case 'getFills':
      response = getFills();
      break;
    case 'getAlerts':
      response = getAlerts();
      break;
    case 'getDashboardStats':
      response = getDashboardStats();
      break;
    case 'authenticateDriver':
      response = authenticateDriver({ code: e.parameter.code });
      break;
    default:
      response = { success: false, message: 'Unknown action: ' + action };
  }
  
  // If JSONP callback is provided, wrap response in callback
  if (callback) {
    var output = ContentService.createTextOutput(callback + '(' + JSON.stringify(response) + ')');
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return output;
  }
  
  // Otherwise return JSON
  var jsonOutput = ContentService.createTextOutput(JSON.stringify(response));
  jsonOutput.setMimeType(ContentService.MimeType.JSON);
  return jsonOutput;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var response;
    
    switch(action) {
      case 'addDriver':
        response = addDriver(data);
        break;
      case 'addVehicle':
        response = addVehicle(data);
        break;
      case 'addFill':
        response = addFill(data);
        break;
      case 'addAlert':
        response = addAlert(data);
        break;
      case 'uploadMedia':
        response = uploadMedia(data);
        break;
      case 'updateVehicleOdometer':
        response = updateVehicleOdometer(data);
        break;
      case 'deleteDriver':
        response = deleteDriver(data);
        break;
      case 'deleteVehicle':
        response = deleteVehicle(data);
        break;
      default:
        response = { success: false, message: 'Unknown action: ' + action };
    }
    
    var output = ContentService.createTextOutput(JSON.stringify(response));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
    
  } catch (error) {
    var errorOutput = ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: 'Server error: ' + error.toString() 
    }));
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    return errorOutput;
  }
}

// ==================== DRIVER OPERATIONS ====================
function getDrivers(e) {
  var sheet = getSheet('Drivers');
  if (!sheet) return createJSONResponse({ success: false, message: 'Drivers sheet not found' });
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var drivers = [];
  
  // Get ownerId from request if available
  var ownerId = e && e.parameter ? e.parameter.ownerId : null;
  
  for (var i = 1; i < data.length; i++) {
    var driver = {};
    for (var j = 0; j < headers.length; j++) {
      driver[headers[j]] = data[i][j];
    }
    // Filter by ownerId if provided (owner-specific data)
    if (!ownerId || driver.ownerId === ownerId || driver.ownerId === undefined || driver.ownerId === '') {
      drivers.push(driver);
    }
  }
  
  return createJSONResponse({ success: true, drivers: drivers });
}

function authenticateDriver(data) {
  var code = data.code;
  var result = getDrivers();
  
  if (!result.success) return result;
  
  var driver = null;
  for (var i = 0; i < result.drivers.length; i++) {
    if (result.drivers[i].code && 
        result.drivers[i].code.toUpperCase() === code.toUpperCase()) {
      driver = result.drivers[i];
      break;
    }
  }
  
  if (driver) {
    return { success: true, driver: driver };
  } else {
    return { success: false, message: 'Invalid driver code' };
  }
}

function addDriver(data) {
  var sheet = getSheet('Drivers');
  if (!sheet) {
    var ss = getSpreadsheet();
    sheet = ss.insertSheet('Drivers');
    sheet.appendRow(['id', 'name', 'code', 'assignedVehicleId', 'status', 'createdAt', 'ownerId']);
    sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#4CAF50').setFontColor('white');
  }
  
  var id = 'drv-' + new Date().getTime();
  var timestamp = new Date().toISOString();
  
  sheet.appendRow([
    id,
    data.name,
    data.code.toUpperCase(),
    data.assignedVehicleId || '',
    'Active',
    timestamp,
    data.ownerId || ''
  ]);
  
  return createJSONResponse({ 
    success: true, 
    message: 'Driver added successfully',
    driver: {
      id: id,
      name: data.name,
      code: data.code.toUpperCase(),
      assignedVehicleId: data.assignedVehicleId || '',
      status: 'Active',
      ownerId: data.ownerId || ''
    }
  });
}

// ==================== VEHICLE OPERATIONS ====================
function getVehicles(e) {
  var sheet = getSheet('Vehicles');
  if (!sheet) return createJSONResponse({ success: false, message: 'Vehicles sheet not found' });
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var vehicles = [];
  
  // Get ownerId from request if available
  var ownerId = e && e.parameter ? e.parameter.ownerId : null;
  
  for (var i = 1; i < data.length; i++) {
    var vehicle = {};
    for (var j = 0; j < headers.length; j++) {
      vehicle[headers[j]] = data[i][j];
    }
    // Filter by ownerId if provided (owner-specific data)
    if (!ownerId || vehicle.ownerId === ownerId || vehicle.ownerId === undefined || vehicle.ownerId === '') {
      vehicles.push(vehicle);
    }
  }
  
  return createJSONResponse({ success: true, vehicles: vehicles });
}

function addVehicle(data) {
  var sheet = getSheet('Vehicles');
  if (!sheet) {
    var ss = getSpreadsheet();
    sheet = ss.insertSheet('Vehicles');
    sheet.appendRow(['id', 'plateNumber', 'model', 'initialOdo', 'currentOdo', 'fuelCapacity', 'status', 'createdAt', 'ownerId']);
    sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#2196F3').setFontColor('white');
  }
  
  var id = 'veh-' + new Date().getTime();
  var timestamp = new Date().toISOString();
  
  sheet.appendRow([
    id,
    data.plateNumber.toUpperCase(),
    data.model,
    parseInt(data.initialOdo) || 0,
    parseInt(data.initialOdo) || 0,
    parseInt(data.fuelCapacity) || 12,
    'Active',
    timestamp,
    data.ownerId || ''
  ]);
  
  return createJSONResponse({ 
    success: true, 
    message: 'Vehicle added successfully',
    vehicle: {
      id: id,
      plateNumber: data.plateNumber.toUpperCase(),
      model: data.model,
      initialOdo: parseInt(data.initialOdo) || 0,
      currentOdo: parseInt(data.initialOdo) || 0,
      fuelCapacity: parseInt(data.fuelCapacity) || 12,
      status: 'Active',
      ownerId: data.ownerId || ''
    }
  });
}

function deleteDriver(data) {
  var sheet = getSheet('Drivers');
  if (!sheet) return createJSONResponse({ success: false, message: 'Drivers sheet not found' });
  var dataRange = sheet.getDataRange().getValues();
  for (var i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return createJSONResponse({ success: true, message: 'Driver deleted' });
    }
  }
  return createJSONResponse({ success: false, message: 'Driver not found' });
}

function deleteVehicle(data) {
  var sheet = getSheet('Vehicles');
  if (!sheet) return createJSONResponse({ success: false, message: 'Vehicles sheet not found' });
  var dataRange = sheet.getDataRange().getValues();
  for (var i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return createJSONResponse({ success: true, message: 'Vehicle deleted' });
    }
  }
  return createJSONResponse({ success: false, message: 'Vehicle not found' });
}

function updateVehicleOdometer(data) {
  var sheet = getSheet('Vehicles');
  if (!sheet) return { success: false, message: 'Vehicles sheet not found' };
  
  var allData = sheet.getDataRange().getValues();
  
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.vehicleId) {
      sheet.getRange(i + 1, 5).setValue(parseInt(data.currentOdo));
      return { success: true, message: 'Vehicle odometer updated' };
    }
  }
  
  return { success: false, message: 'Vehicle not found' };
}

// ==================== FILL OPERATIONS ====================
function getFills(e) {
  var sheet = getSheet('Fills');
  if (!sheet) return createJSONResponse({ success: false, message: 'Fills sheet not found' });
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var fills = [];
  
  // Get ownerId from request if available
  var ownerId = e && e.parameter ? e.parameter.ownerId : null;
  
  for (var i = 1; i < data.length; i++) {
    var fill = {};
    for (var j = 0; j < headers.length; j++) {
      fill[headers[j]] = data[i][j];
    }
    // Filter by ownerId if provided (owner-specific data)
    if (!ownerId || fill.ownerId === ownerId || fill.ownerId === undefined || fill.ownerId === '') {
      fills.push(fill);
    }
  }
  
  fills.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  return createJSONResponse({ success: true, fills: fills });
}

function addFill(data) {
  var sheet = getSheet('Fills');
  if (!sheet) {
    var ss = getSpreadsheet();
    sheet = ss.insertSheet('Fills');
    sheet.appendRow(['id', 'vehicleId', 'vehiclePlate', 'driverId', 'driverName', 'timestamp', 'station', 'kgsFilled', 'ratePerKg', 'totalAmount', 'videoUrl', 'pumpPhotoUrl', 'receiptPhotoUrl', 'receiptLat', 'receiptLng', 'receiptAddress', 'odometerPhotoUrl', 'odometerLat', 'odometerLng', 'odometerAddress', 'odometerValue', 'distanceDifferenceMeters', 'isLocationMismatched', 'isFuelDropAlert', 'fuelDropPercentage', 'ownerId']);
    sheet.getRange('A1:Z1').setFontWeight('bold').setBackground('#FF9800').setFontColor('white');
  }
  
  var id = 'fill-' + new Date().getTime();
  var timestamp = new Date().toISOString();
  
  sheet.appendRow([
    id,
    data.vehicleId || '',
    data.vehiclePlate || '',
    data.driverId || '',
    data.driverName || '',
    timestamp,
    data.station || '',
    parseFloat(data.kgsFilled) || 0,
    parseFloat(data.ratePerKg) || 0,
    parseFloat(data.totalAmount) || 0,
    data.videoUrl || '',
    data.pumpPhotoUrl || '',
    data.receiptPhotoUrl || '',
    parseFloat(data.receiptLat) || 0,
    parseFloat(data.receiptLng) || 0,
    data.receiptAddress || '',
    data.odometerPhotoUrl || '',
    parseFloat(data.odometerLat) || 0,
    parseFloat(data.odometerLng) || 0,
    data.odometerAddress || '',
    parseInt(data.odometerValue) || 0,
    parseInt(data.distanceDifferenceMeters) || 0,
    data.isLocationMismatched ? 'true' : 'false',
    data.isFuelDropAlert ? 'true' : 'false',
    data.fuelDropPercentage || 0,
    data.ownerId || ''
  ]);
  
  // Update vehicle odometer
  if (data.vehicleId && data.odometerValue) {
    updateVehicleOdometer({
      vehicleId: data.vehicleId,
      currentOdo: data.odometerValue
    });
  }
  
  // Create alerts if needed
  if (data.isLocationMismatched) {
    addAlert({
      event: 'LOCATION MISMATCH: ' + data.driverName + ' submitted fill for ' + data.vehiclePlate + ' with ' + data.distanceDifferenceMeters + 'm distance gap.',
      user: 'GPS Validator',
      type: 'critical'
    });
  }
  
  if (data.isFuelDropAlert) {
    addAlert({
      event: 'FUEL DROP ALERT: Vehicle ' + data.vehiclePlate + ' shows ' + data.fuelDropPercentage + '% fuel drop!',
      user: 'Fuel Monitor',
      type: 'critical'
    });
  }
  
  return createJSONResponse({ 
    success: true, 
    message: 'Fill record added successfully',
    fillId: id,
    timestamp: timestamp,
    ownerId: data.ownerId || ''
  });
}

// ==================== ALERT OPERATIONS ====================
function getAlerts(e) {
  var sheet = getSheet('Alerts');
  if (!sheet) return createJSONResponse({ success: false, message: 'Alerts sheet not found' });
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var alerts = [];
  
  // Get ownerId from request if available
  var ownerId = e && e.parameter ? e.parameter.ownerId : null;
  
  for (var i = 1; i < data.length; i++) {
    var alert = {};
    for (var j = 0; j < headers.length; j++) {
      alert[headers[j]] = data[i][j];
    }
    // Filter by ownerId if provided (owner-specific data)
    if (!ownerId || alert.ownerId === ownerId || alert.ownerId === undefined || alert.ownerId === '') {
      alerts.push(alert);
    }
  }
  
  alerts.sort(function(a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  return createJSONResponse({ success: true, alerts: alerts });
}

function addAlert(data) {
  var sheet = getSheet('Alerts');
  if (!sheet) {
    var ss = getSpreadsheet();
    sheet = ss.insertSheet('Alerts');
    sheet.appendRow(['id', 'timestamp', 'event', 'user', 'type', 'ownerId']);
    sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#F44336').setFontColor('white');
  }
  
  var id = 'alert-' + new Date().getTime();
  var timestamp = new Date().toISOString();
  
  sheet.appendRow([
    id,
    timestamp,
    data.event,
    data.user || 'System',
    data.type || 'info',
    data.ownerId || ''
  ]);
  
  return createJSONResponse({ success: true, message: 'Alert added' });
}

// ==================== MEDIA UPLOAD TO GOOGLE DRIVE ====================
function doPost(e) {
  Logger.log('========================================');
  Logger.log('DO POST CALLED');
  Logger.log('========================================');
  Logger.log('Event parameter exists: ' + (e ? 'YES' : 'NO'));
  
  if (e && e.postData) {
    Logger.log('postData exists: YES');
    Logger.log('postData.contents length: ' + (e.postData.contents ? e.postData.contents.length : 0));
    Logger.log('postData.type: ' + (e.postData.type || 'undefined'));
    
    try {
      var rawData = e.postData.contents;
      Logger.log('Raw data (first 200 chars): ' + rawData.substring(0, 200));
      
      var data = JSON.parse(rawData);
      Logger.log('Parsed successfully!');
      Logger.log('action: ' + (data.action || 'MISSING'));
      
      // Route to appropriate handler
      Logger.log('Routing action: ' + data.action);
      
      if (data.action === 'uploadMedia') {
        return handleUploadMedia(data);
      } else if (data.action === 'registerOwner') {
        return registerOwner(data);
      } else if (data.action === 'authenticateOwner') {
        return authenticateOwner(data);
      } else if (data.action === 'addDriver') {
        return addDriver(data);
      } else if (data.action === 'addVehicle') {
        return addVehicle(data);
      } else if (data.action === 'addFill') {
        return addFill(data);
      } else if (data.action === 'addAlert') {
        return addAlert(data);
      } else if (data.action === 'getDrivers') {
        return getDrivers(e);
      } else if (data.action === 'getVehicles') {
        return getVehicles(e);
      } else if (data.action === 'getFills') {
        return getFills(e);
      } else if (data.action === 'getAlerts') {
        return getAlerts(e);
      } else if (data.action === 'getDashboardStats') {
        return getDashboardStats();
      } else if (data.action === 'updateVehicleOdometer') {
        return updateVehicleOdometer(data);
      } else {
        Logger.log('Unknown action: ' + data.action);
        return createJSONResponse({
          success: false,
          message: 'Unknown action: ' + data.action,
          availableActions: ['uploadMedia', 'registerOwner', 'authenticateOwner', 'addDriver', 'addVehicle', 'addFill', 'addAlert', 'getDrivers', 'getVehicles', 'getFills', 'getAlerts', 'getDashboardStats', 'updateVehicleOdometer', 'deleteDriver', 'deleteVehicle']
        });
      }
    } catch (parseError) {
      Logger.log('Parse error: ' + parseError.toString());
      return createJSONResponse({
        success: false,
        message: 'Failed to parse JSON: ' + parseError.toString()
      });
    }
  } else {
    Logger.log('postData exists: NO');
    return createJSONResponse({
      success: false,
      message: 'No postData received',
      debug: 'Event: ' + JSON.stringify(e)
    });
  }
}

// Handle the actual upload
function handleUploadMedia(data) {
  try {
    Logger.log('========================================');
    Logger.log('HANDLE UPLOAD MEDIA');
    Logger.log('========================================');
    
    // Log all received fields
    Logger.log('--- Received Data ---');
    Logger.log('fileName: ' + (data.fileName || 'MISSING'));
    Logger.log('vehiclePlate: ' + (data.vehiclePlate || 'MISSING'));
    Logger.log('fillDate: ' + (data.fillDate || 'MISSING'));
    Logger.log('mimeType: ' + (data.mimeType || 'MISSING'));
    Logger.log('base64Data length: ' + (data.base64Data ? data.base64Data.length : 0));
    Logger.log('---------------------');
    
    // Validate required fields
    if (!data.base64Data) {
      return createJSONResponse({
        success: false,
        message: 'Missing base64Data',
        debug: 'base64Data is required'
      });
    }
    
    if (!data.fileName) {
      data.fileName = 'upload_' + new Date().getTime();
      Logger.log('Auto-generated fileName: ' + data.fileName);
    }
    
    // Get or create the main folder
    var mainFolder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    Logger.log('Main folder: ' + mainFolder.getName() + ' (ID: ' + mainFolder.getId() + ')');
    
    // ALWAYS organize by Vehicle Plate Number
    var vehicleFolder = mainFolder;
    var safePlate = 'Unassigned';
    if (data.vehiclePlate && String(data.vehiclePlate).trim() !== '') {
      safePlate = String(data.vehiclePlate).replace(/[^a-zA-Z0-9-_]/g, '_');
      Logger.log('Vehicle plate sanitized: ' + safePlate);
      vehicleFolder = getOrCreateSubFolder(mainFolder, safePlate);
      Logger.log('Vehicle folder created/found. ID: ' + vehicleFolder.getId() + ', Name: ' + vehicleFolder.getName());
    }
    
    // ALWAYS organize by Date
    var dateFolder = vehicleFolder;
    var safeDate = new Date().toISOString().split('T')[0]; // Default to today
    if (data.fillDate && String(data.fillDate).trim() !== '') {
      safeDate = String(data.fillDate);
      Logger.log('Using fillDate: ' + safeDate);
      dateFolder = getOrCreateSubFolder(vehicleFolder, safeDate);
      Logger.log('Date folder created/found. ID: ' + dateFolder.getId() + ', Name: ' + dateFolder.getName());
    }
    
    // Decode base64 data
    Logger.log('Decoding base64 data (' + data.base64Data.length + ' chars)...');
    var decoded = Utilities.base64Decode(data.base64Data);
    var mimeType = data.mimeType || 'image/jpeg';
    var blob = Utilities.newBlob(decoded, mimeType, data.fileName);
    Logger.log('Blob created: ' + blob.getName() + ' (' + blob.getBytes().length + ' bytes)');
    
    // Upload to Drive
    Logger.log('Creating file in folder: ' + dateFolder.getName());
    var file = dateFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get shareable link
    var fileUrl = 'https://drive.google.com/uc?id=' + file.getId();
    
    Logger.log('========================================');
    Logger.log('UPLOAD COMPLETE');
    Logger.log('File: ' + file.getName());
    Logger.log('File ID: ' + file.getId());
    Logger.log('URL: ' + fileUrl);
    Logger.log('Path: CNG Flow Media / ' + safePlate + ' / ' + safeDate);
    Logger.log('========================================');
    
    return createJSONResponse({
      success: true,
      message: 'Media uploaded successfully',
      fileUrl: fileUrl,
      fileId: file.getId(),
      fileName: data.fileName,
      folderPath: 'CNG Flow Media/' + safePlate + '/' + safeDate,
      vehicleFolderName: safePlate,
      dateFolderName: safeDate,
      debug: 'Upload successful'
    });
    
  } catch (error) {
    Logger.log('========================================');
    Logger.log('UPLOAD ERROR');
    Logger.log('Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    Logger.log('========================================');
    
    return createJSONResponse({
      success: false,
      message: 'Upload failed: ' + error.toString(),
      debug: error.stack
    });
  }
}

// Helper function to create JSON response
function createJSONResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function getOrCreateSubFolder(parentFolder, subFolderName) {
  var folders = parentFolder.getFoldersByName(subFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subFolderName);
}

// ==================== OWNER REGISTRATION ====================
function registerOwner(data) {
  try {
    Logger.log('Registering owner: ' + data.email);
    
    var sheet = getSheet('Owners');
    if (!sheet) {
      // Create Owners sheet if it doesn't exist
      var ss = getSpreadsheet();
      sheet = ss.insertSheet('Owners');
      sheet.appendRow(['id', 'firstName', 'middleName', 'lastName', 'email', 'phone', 'businessName', 'password', 'status', 'createdAt']);
      sheet.getRange('A1:J1').setFontWeight('bold').setBackground('#EE2726').setFontColor('white');
      Logger.log('Owners sheet created');
    }
    
    // Check if email already exists
    var allData = sheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][4] === data.email) {
        return createJSONResponse({ success: false, message: 'Email already registered' });
      }
    }
    
    var id = 'owner-' + new Date().getTime();
    var timestamp = new Date().toISOString();
    
    sheet.appendRow([
      id,
      data.firstName || '',
      data.middleName || '',
      data.lastName || '',
      data.email || '',
      data.phone || '',
      data.businessName || '',
      data.password || '',
      'Active',
      timestamp
    ]);
    
    Logger.log('Owner registered successfully: ' + id);
    
    return createJSONResponse({
      success: true,
      message: 'Owner registered successfully',
      owner: {
        id: id,
        firstName: data.firstName,
        email: data.email
      }
    });
    
  } catch (error) {
    Logger.log('Registration error: ' + error.toString());
    return createJSONResponse({
      success: false,
      message: 'Registration failed: ' + error.toString()
    });
  }
}

function authenticateOwner(data) {
  try {
    var sheet = getSheet('Owners');
    if (!sheet) {
      // Fallback to hardcoded admin for first setup
      if (data.email === 'admin@cng.com' && data.password === 'admin123') {
        return createJSONResponse({
          success: true,
          owner: {
            id: 'admin-001',
            firstName: 'Admin',
            email: data.email
          }
        });
      }
      return createJSONResponse({ success: false, message: 'Owners sheet not configured' });
    }
    
    var allData = sheet.getDataRange().getValues();
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][4] === data.email && allData[i][7] === data.password) {
        return createJSONResponse({
          success: true,
          owner: {
            id: allData[i][0],
            firstName: allData[i][1],
            middleName: allData[i][2],
            lastName: allData[i][3],
            email: allData[i][4],
            phone: allData[i][5],
            businessName: allData[i][6],
            status: allData[i][8]
          }
        });
      }
    }
    
    return createJSONResponse({ success: false, message: 'Invalid email or password' });
    
  } catch (error) {
    return createJSONResponse({ success: false, message: 'Authentication failed: ' + error.toString() });
  }
}

// ==================== DASHBOARD STATS ====================
function getDashboardStats() {
  var drivers = getDrivers();
  var vehicles = getVehicles();
  var fills = getFills();
  var alerts = getAlerts();
  
  var totalSpent = 0;
  var totalKgs = 0;
  var totalRate = 0;
  
  if (fills.success) {
    for (var i = 0; i < fills.fills.length; i++) {
      totalSpent += parseFloat(fills.fills[i].totalAmount) || 0;
      totalKgs += parseFloat(fills.fills[i].kgsFilled) || 0;
      totalRate += parseFloat(fills.fills[i].ratePerKg) || 0;
    }
  }
  
  var criticalAlerts = 0;
  if (alerts.success) {
    for (var i = 0; i < alerts.alerts.length; i++) {
      if (alerts.alerts[i].type === 'critical') criticalAlerts++;
    }
  }
  
  return {
    success: true,
    stats: {
      totalVehicles: vehicles.success ? vehicles.vehicles.length : 0,
      totalDrivers: drivers.success ? drivers.drivers.length : 0,
      totalFills: fills.success ? fills.fills.length : 0,
      totalAlerts: alerts.success ? alerts.alerts.length : 0,
      criticalAlerts: criticalAlerts,
      totalSpent: totalSpent,
      totalKgs: totalKgs,
      avgFuelRate: fills.success && fills.fills.length > 0 
        ? totalRate / fills.fills.length 
        : 0
    }
  };
}

// ==================== INITIAL SETUP ====================
function setupSheets() {
  var ss = getSpreadsheet();
  
  Logger.log('Setting up sheets in: ' + ss.getUrl());
  
  // Create Drivers sheet
  var driversSheet = ss.getSheetByName('Drivers');
  if (!driversSheet) {
    driversSheet = ss.insertSheet('Drivers');
    driversSheet.appendRow(['id', 'name', 'code', 'assignedVehicleId', 'status', 'createdAt']);
    driversSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#4CAF50').setFontColor('white');
    Logger.log('Created Drivers sheet');
  }
  
  // Create Vehicles sheet
  var vehiclesSheet = ss.getSheetByName('Vehicles');
  if (!vehiclesSheet) {
    vehiclesSheet = ss.insertSheet('Vehicles');
    vehiclesSheet.appendRow(['id', 'plateNumber', 'model', 'initialOdo', 'currentOdo', 'fuelCapacity', 'status', 'createdAt']);
    vehiclesSheet.getRange('A1:H1').setFontWeight('bold').setBackground('#2196F3').setFontColor('white');
    Logger.log('Created Vehicles sheet');
  }
  
  // Create Fills sheet
  var fillsSheet = ss.getSheetByName('Fills');
  if (!fillsSheet) {
    fillsSheet = ss.insertSheet('Fills');
    fillsSheet.appendRow([
      'id', 'vehicleId', 'vehiclePlate', 'driverId', 'driverName', 'timestamp', 'station',
      'kgsFilled', 'ratePerKg', 'totalAmount', 'videoUrl', 'pumpPhotoUrl', 'receiptPhotoUrl',
      'receiptLat', 'receiptLng', 'receiptAddress', 'odometerPhotoUrl', 'odometerLat', 'odometerLng',
      'odometerAddress', 'odometerValue', 'distanceDifferenceMeters', 'isLocationMismatched',
      'isFuelDropAlert', 'fuelDropPercentage'
    ]);
    fillsSheet.getRange('A1:Y1').setFontWeight('bold').setBackground('#FF9800').setFontColor('white');
    Logger.log('Created Fills sheet');
  }
  
  // Create Alerts sheet
  var alertsSheet = ss.getSheetByName('Alerts');
  if (!alertsSheet) {
    alertsSheet = ss.insertSheet('Alerts');
    alertsSheet.appendRow(['id', 'timestamp', 'event', 'user', 'type']);
    alertsSheet.getRange('A1:E1').setFontWeight('bold').setBackground('#F44336').setFontColor('white');
    Logger.log('Created Alerts sheet');
  }
  
  Logger.log('========================================');
  Logger.log('SETUP COMPLETE!');
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('========================================');
  Logger.log('');
  Logger.log('IMPORTANT: Copy this ID and save it:');
  Logger.log(ss.getId());
  
  return ss.getUrl();
}

// ==================== UTILITY FUNCTIONS ====================
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

// Function to test the connection
function testConnection() {
  var result = getDashboardStats();
  Logger.log('Connection test result: ' + JSON.stringify(result));
  return result;
}
