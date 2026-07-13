/**
 * WINESTOCKER - Core Application Logic
 * Single Page Application optimized for iOS Safari using Vanilla JS & Functional Programming.
 */

// Hardcoded Google OAuth 2.0 Client ID (replace with your actual Google Client ID)
const GOOGLE_CLIENT_ID = '614000804759-jp0nilf67fvbpm6902uj0l9p3bndjfba.apps.googleusercontent.com';
// Hardcoded Google Spreadsheet ID (replace with your actual Spreadsheet ID)
const GOOGLE_SPREADSHEET_ID = '1ZnFStdDi8hayuwOJq0tVxTMQCMTkYP0E5VU5Ytprkzs';
const AUTH_STORAGE_KEY = 'winestocker.google-auth';

// Google access tokens are short-lived. Persisting the expiry lets us reuse a valid
// token after a browser refresh without attempting to use a token that has expired.
const saveStoredAuth = (token, expiresInSeconds) => {
  try {
    const expiresAt = Date.now() + (Number(expiresInSeconds) || 3600) * 1000;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
    return expiresAt;
  } catch (err) {
    console.warn('Could not save authentication in browser storage:', err);
    return null;
  }
};

const getStoredAuth = () => {
  try {
    const storedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (storedAuth?.token && storedAuth.expiresAt > Date.now()) return storedAuth;
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not read stored authentication:', err);
  }
  return null;
};

const clearStoredAuth = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not clear stored authentication:', err);
  }
};

// --- 1. Global State Management ---

/**
 * Creates the initial application state.
 * Implements strict immutability.
 */
const createInitialState = () => Object.freeze({
  auth: Object.freeze({
    accessToken: null,
    expiresAt: null,
    clientId: GOOGLE_CLIENT_ID,
    spreadsheetId: GOOGLE_SPREADSHEET_ID
  }),
  view: 'LOGIN', // 'LOGIN' | 'DASHBOARD' | 'SCANNER' | 'OCR' | 'CONFIRM'
  scanMode: 'IN', // 'IN' | 'OUT'
  scannedBarcode: '',
  selectedStockId: '', // Existing stock row selected directly from the dashboard
  activeOcrField: 'domain', // 'domain' | 'appellation' | 'vintage'
  ocrResult: Object.freeze({
    imageUrl: null,
    imageWidth: 0,
    imageHeight: 0,
    textBlocks: Object.freeze([]) // Array of { text, bbox: { x0, y0, x1, y1 } }
  }),
  formData: Object.freeze({
    domain: '',
    appellation: '',
    vintage: '',
    quantity: 1
  }),
  inventory: Object.freeze([]), // Array of { id, wine_name, vintage, quantity, updated_at }
  bottleCache: Object.freeze([]), // Array of { barcode, domain, appellation, vintage }
  loading: false,
  loadingMessage: '',
  error: null,
  successMessage: null,
  searchTerm: ''
});

/**
 * Pure state reducer mapping actions to new state representations.
 */
const stateReducer = (state, action) => {
  console.log('[Reducer Action]:', action.type, action);
  
  switch (action.type) {
    case 'SET_LOADING':
      return Object.freeze({ 
        ...state, 
        loading: action.loading, 
        loadingMessage: action.message || '' 
      });
      
    case 'SET_ERROR':
      return Object.freeze({ 
        ...state, 
        error: action.error, 
        loading: false 
      });
      
    case 'CLEAR_ERROR':
      return Object.freeze({ ...state, error: null });
      
    case 'SET_SUCCESS':
      return Object.freeze({ ...state, successMessage: action.message });
      
    case 'CLEAR_SUCCESS':
      return Object.freeze({ ...state, successMessage: null });
      
    case 'SET_VIEW':
      return Object.freeze({ ...state, view: action.view, error: null, successMessage: null });
      
    case 'SET_SCAN_MODE':
      return Object.freeze({ ...state, scanMode: action.scanMode });
      

      
    case 'SET_ACCESS_TOKEN':
      return Object.freeze({
        ...state,
        auth: Object.freeze({
          ...state.auth,
          accessToken: action.token,
          expiresAt: action.expiresAt || null
        })
      });
      
    case 'SET_DATA':
      return Object.freeze({
        ...state,
        inventory: Object.freeze(action.inventory),
        bottleCache: Object.freeze(action.bottleCache),
        loading: false
      });
      
    case 'START_SCAN':
      return Object.freeze({
        ...state,
        view: 'OCR',
        scannedBarcode: '',
        selectedStockId: '',
        ocrResult: Object.freeze({
          imageUrl: null,
          imageWidth: 0,
          imageHeight: 0,
          textBlocks: Object.freeze([])
        }),
        formData: Object.freeze({
          domain: '',
          appellation: '',
          vintage: '',
          quantity: 1
        })
      });
      
    case 'BARCODE_SCANNED':
      return Object.freeze({
        ...state,
        scannedBarcode: action.barcode,
        selectedStockId: ''
      });

    case 'SELECT_EXISTING_WINE':
      return Object.freeze({
        ...state,
        view: 'CONFIRM',
        scanMode: 'OUT',
        scannedBarcode: '',
        selectedStockId: action.item.id,
        formData: Object.freeze(action.formData)
      });
      
    case 'SET_ACTIVE_OCR_FIELD':
      return Object.freeze({
        ...state,
        activeOcrField: action.field
      });
      
    case 'OCR_IMAGE_LOADED':
      return Object.freeze({
        ...state,
        ocrResult: Object.freeze({
          ...state.ocrResult,
          imageUrl: action.imageUrl,
          imageWidth: action.width,
          imageHeight: action.height,
          textBlocks: Object.freeze([])
        })
      });
      
    case 'OCR_SUCCESS':
      return Object.freeze({
        ...state,
        ocrResult: Object.freeze({
          ...state.ocrResult,
          textBlocks: Object.freeze(action.textBlocks)
        })
      });
      
    case 'SET_FORM_DATA':
      return Object.freeze({
        ...state,
        formData: Object.freeze({
          ...state.formData,
          ...action.data
        })
      });
      
    case 'SET_SEARCH_TERM':
      return Object.freeze({
        ...state,
        searchTerm: action.searchTerm
      });
      
    case 'LOGOUT':
      return Object.freeze({
        ...state,
        auth: Object.freeze({
          accessToken: null,
          expiresAt: null,
          clientId: GOOGLE_CLIENT_ID,
          spreadsheetId: GOOGLE_SPREADSHEET_ID
        }),
        view: 'LOGIN',
        inventory: Object.freeze([]),
        bottleCache: Object.freeze([])
      });
      
    default:
      return state;
  }
};

// --- 2. Side-Effects & Event Manager ---

// Keep non-serializable, mutable UI handles (like camera scan instances) out of the state tree
const effectManager = {
  scannerInstance: null,
  activeVideoTrack: null,
  ocrStream: null,        // MediaStream for OCR live preview
  gsiClient: null
};

/**
 * Dispatches action and re-renders the DOM view.
 */
let currentState = createInitialState();
const dispatch = (action) => {
  currentState = stateReducer(currentState, action);
  render(currentState);
};

// --- 3. Google API Integrations ---

/**
 * Initialise standard Google Identity Services client.
 */
const initGoogleAuth = (state) => {
  if (effectManager.gsiClient) return;
  if (!state.auth.clientId) return;
  
  if (typeof google === 'undefined') {
    console.error('Google Client Identity SDK not loaded.');
    return;
  }
  
  effectManager.gsiClient = google.accounts.oauth2.initTokenClient({
    client_id: state.auth.clientId,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        const expiresAt = saveStoredAuth(tokenResponse.access_token, tokenResponse.expires_in);
        dispatch({ type: 'SET_ACCESS_TOKEN', token: tokenResponse.access_token, expiresAt });
        fetchSpreadsheetData();
      } else {
        dispatch({ type: 'SET_ERROR', error: 'Authentication failed. Please check credentials.' });
      }
    }
  });
};

/**
 * Triggers Google Login popup.
 */
const loginWithGoogle = () => {
  if (!effectManager.gsiClient) {
    initGoogleAuth(currentState);
  }
  if (effectManager.gsiClient) {
    effectManager.gsiClient.requestAccessToken();
  } else {
    dispatch({ type: 'SET_ERROR', error: 'OAuth client not initialized. Ensure Client ID is correct.' });
  }
};

/**
 * Fetch spreadsheet rows via REST Google Sheets API.
 */
const fetchSpreadsheetData = async () => {
  const { accessToken, spreadsheetId } = currentState.auth;
  if (!accessToken || !spreadsheetId) return;
  
  dispatch({ type: 'SET_LOADING', loading: true, message: 'Syncing cellars...' });
  
  try {
    // 1. Fetch current inventory stock status
    const stockRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/stock_status!A:E`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!stockRes.ok) {
      if (stockRes.status === 401) {
        clearStoredAuth();
        dispatch({ type: 'LOGOUT' });
        dispatch({ type: 'SET_ERROR', error: 'Your Google session has expired. Please sign in again.' });
        return;
      }
      if (stockRes.status === 400) {
        const errorData = await stockRes.json();
        if (errorData.error && errorData.error.message.includes('Unable to parse range')) {
          // Sheets not set up yet — auto-initialize silently then retry
          await initializeSpreadsheetDb();
          return; // initializeSpreadsheetDb calls fetchSpreadsheetData on success
        }
      }
      throw new Error(`Stock API error: ${stockRes.statusText}`);
    }
    const stockData = await stockRes.json();
    
    // 2. Fetch barcode metadata mapping cache
    const cacheRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/bottle_cache!A:D`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!cacheRes.ok) throw new Error(`Cache API error: ${cacheRes.statusText}`);
    const cacheData = await cacheRes.json();
    
    const parsedStock = parseSheetRows(stockData.values || []);
    const parsedCache = parseSheetRows(cacheData.values || []);
    
    dispatch({
      type: 'SET_DATA',
      inventory: parsedStock,
      bottleCache: parsedCache
    });
    
    dispatch({ type: 'SET_VIEW', view: 'DASHBOARD' });
  } catch (err) {
    console.error(err);
    dispatch({ type: 'SET_ERROR', error: `Database Sync failed: ${err.message}` });
  }
};

/**
 * Creates missing database tabs and appends the standard headers.
 */
const initializeSpreadsheetDb = async () => {
  const { accessToken, spreadsheetId } = currentState.auth;
  if (!accessToken || !spreadsheetId) return;
  
  dispatch({ type: 'SET_LOADING', loading: true, message: 'Checking sheet tables...' });
  dispatch({ type: 'CLEAR_ERROR' });
  
  try {
    // 1. Fetch spreadsheet metadata to check available tabs
    const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!metadataRes.ok) throw new Error('Could not connect to Google Spreadsheet.');
    const metadata = await metadataRes.json();
    const existingTitles = metadata.sheets.map(s => s.properties.title);
    
    const requiredSheets = ['stock_status', 'bottle_cache', 'events'];
    const missingSheets = requiredSheets.filter(title => !existingTitles.includes(title));
    
    if (missingSheets.length > 0) {
      dispatch({ type: 'SET_LOADING', loading: true, message: 'Creating sheets...' });
      const requests = missingSheets.map(title => ({
        addSheet: { properties: { title } }
      }));
      
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
      
      if (!createRes.ok) throw new Error('Failed to create missing sheet tabs.');
    }
    
    // 2. Set headers on all required sheets
    dispatch({ type: 'SET_LOADING', loading: true, message: 'Formatting headers...' });
    const headersData = [
      {
        range: 'stock_status!A1:E1',
        values: [['id', 'wine_name', 'vintage', 'quantity', 'updated_at']]
      },
      {
        range: 'bottle_cache!A1:D1',
        values: [['barcode', 'domain', 'appellation', 'vintage']]
      },
      {
        range: 'events!A1:D1',
        values: [['timestamp', 'event_type', 'barcode', 'quantity']]
      }
    ];
    
    const writeHeadersRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: headersData
        })
      }
    );
    
    if (!writeHeadersRes.ok) throw new Error('Failed to write header columns.');
    
    // Silently proceed to fetch data now that sheets are ready
    await fetchSpreadsheetData();
  } catch (err) {
    console.error(err);
    dispatch({ type: 'SET_ERROR', error: `Database setup failed: ${err.message}` });
  }
};

/**
 * Parses Google Sheets values arrays into structured arrays of objects using headers.
 */
const parseSheetRows = (values) => {
  if (values.length < 1) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return Object.freeze(obj);
  });
};

/**
 * Resolves scanned barcode against local cache or Open Food Facts.
 */
const resolveBarcode = async (barcode) => {
  dispatch({ type: 'SET_LOADING', loading: true, message: 'Searching cellars...' });
  
  // 1. Check local bottleCache loaded from Sheets
  const cachedMatch = currentState.bottleCache.find(b => b.barcode === barcode);
  if (cachedMatch) {
    dispatch({ type: 'SET_LOADING', loading: false });
    dispatch({
      type: 'SET_FORM_DATA',
      data: {
        domain: cachedMatch.domain,
        appellation: cachedMatch.appellation,
        vintage: cachedMatch.vintage,
        quantity: 1
      }
    });
    dispatch({ type: 'SET_VIEW', view: 'CONFIRM' });
    return;
  }
  
  // 2. Query Open Food Facts API
  try {
    dispatch({ type: 'SET_LOADING', loading: true, message: 'Searching OpenFoodFacts...' });
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await res.json();
    const offDetails = parseOpenFoodFactsResponse(data);
    
    if (offDetails) {
      dispatch({ type: 'SET_LOADING', loading: false });
      dispatch({
        type: 'SET_FORM_DATA',
        data: {
          ...offDetails,
          quantity: 1
        }
      });
      dispatch({ type: 'SET_VIEW', view: 'CONFIRM' });
      return;
    }
  } catch (err) {
    console.warn('Open Food Facts lookup failed:', err);
  }
  
  // 3. Fallback to OCR capture screen if completely unresolved
  dispatch({ type: 'SET_LOADING', loading: false });
  dispatch({
    type: 'SET_FORM_DATA',
    data: { domain: '', appellation: '', vintage: '', quantity: 1 }
  });
  dispatch({ type: 'SET_VIEW', view: 'OCR' });
};

/**
 * Extracts domain, appellation, and vintage from OpenFoodFacts product info.
 */
const parseOpenFoodFactsResponse = (data) => {
  if (data.status !== 1 || !data.product) return null;
  const brand = data.product.brands || '';
  const name = data.product.product_name || '';
  
  // Look for 4 consecutive numbers for vintage (e.g. 2018)
  const vintageMatch = name.match(/\b(19\d{2}|20\d{2})\b/);
  const vintage = vintageMatch ? vintageMatch[0] : '';
  
  let appellation = name;
  if (brand) appellation = appellation.replace(new RegExp(brand, 'gi'), '');
  if (vintage) appellation = appellation.replace(new RegExp(vintage, 'g'), '');
  
  // Clean punctuation and spacing
  appellation = appellation.trim().replace(/^[-–—,\s]+|[-–—,\s]+$/g, '');
  
  return {
    domain: brand.trim(),
    appellation: appellation,
    vintage: vintage
  };
};

// --- 4. Camera & Barcode Scanner ---

/**
 * Starts html5-qrcode barcode scan interface.
 */
const startBarcodeScanner = () => {
  if (effectManager.scannerInstance) return;
  
  const elementId = "reader";
  if (!document.getElementById(elementId)) return;
  
  effectManager.scannerInstance = new Html5Qrcode(elementId);
  effectManager.scannerInstance.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: (width, height) => {
        const size = Math.min(width, height) * 0.65;
        return { width: size, height: size };
      }
    },
    (decodedText) => {
      console.log('[Barcode Scanned]:', decodedText);
      stopBarcodeScanner();
      dispatch({ type: 'BARCODE_SCANNED', barcode: decodedText });
      resolveBarcode(decodedText);
    },
    (errorMessage) => {
      // Verbose scanning logging ignored to avoid noise
    }
  ).catch(err => {
    console.error('Failed to start scanner:', err);
    dispatch({ type: 'SET_ERROR', error: `Camera startup failed: ${err.message}` });
  });
};

/**
 * Stops html5-qrcode scanning. Returns a Promise that resolves when fully stopped.
 */
const stopBarcodeScanner = () => {
  if (effectManager.scannerInstance) {
    const p = effectManager.scannerInstance.stop().then(() => {
      effectManager.scannerInstance = null;
    }).catch(err => {
      console.warn('Error shutting down camera scanner:', err);
      effectManager.scannerInstance = null;
    });
    return p;
  }
  return Promise.resolve();
};

// --- 5. Optical Character Recognition (OCR) ---

/**
 * Starts the live camera stream in the OCR preview video element.
 */
const startOcrCamera = async () => {
  const video = document.getElementById('ocr-video-preview');
  if (!video || effectManager.ocrStream) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    effectManager.ocrStream = stream;
    video.srcObject = stream;
    video.play();
  } catch (err) {
    console.warn('Could not start OCR camera:', err);
    dispatch({ type: 'SET_ERROR', error: `Camera access denied: ${err.message}` });
  }
};

/**
 * Stops the OCR live camera stream and cleans up.
 */
const stopOcrCamera = () => {
  if (effectManager.ocrStream) {
    effectManager.ocrStream.getTracks().forEach(t => t.stop());
    effectManager.ocrStream = null;
  }
  const video = document.getElementById('ocr-video-preview');
  if (video) video.srcObject = null;
};

/**
 * Captures a frame from the live OCR video preview and triggers Tesseract.
 */
const captureOcrFrame = () => {
  const video = document.getElementById('ocr-video-preview');
  if (!video || !video.videoWidth) {
    dispatch({ type: 'SET_ERROR', error: 'Camera not ready — please wait a moment.' });
    return;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  
  const imageUrl = canvas.toDataURL('image/jpeg', 0.92);
  stopOcrCamera();
  
  const img = new Image();
  img.onload = () => {
    dispatch({
      type: 'OCR_IMAGE_LOADED',
      imageUrl,
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    // Pass the data URL directly to Tesseract
    runTesseractOcr(imageUrl);
  };
  img.src = imageUrl;
};

/**
 * Receives an uploaded file and triggers Tesseract.js (file-upload fallback).
 */
const processOcrImage = (file) => {
  if (!file) return;
  stopOcrCamera();
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
      dispatch({
        type: 'OCR_IMAGE_LOADED',
        imageUrl,
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      runTesseractOcr(imageUrl);
    };
    img.src = imageUrl;
  };
  reader.readAsDataURL(file);
};

/**
 * Performs character extraction using Tesseract CDN.
 * Accepts a URL string (data URL) or a File/Blob.
 */
const runTesseractOcr = async (source) => {
  dispatch({ type: 'SET_LOADING', loading: true, message: 'Analyzing label text...' });
  
  try {
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract library not loaded. Check internet connection.');
    }
    
    const { data } = await Tesseract.recognize(source, 'fra+eng', {
      logger: m => {
        if (m.status === 'recognizing') {
          const progress = Math.round(m.progress * 100);
          const loaderMessage = document.getElementById('loader-message');
          if (loaderMessage) loaderMessage.innerText = `Reading text (${progress}%)`;
        }
      }
    });
    
    const textBlocks = data.words.map(w => ({
      text: w.text,
      bbox: w.bbox // { x0, y0, x1, y1 }
    }));
    
    dispatch({ type: 'SET_LOADING', loading: false });
    dispatch({ type: 'OCR_SUCCESS', textBlocks });
  } catch (err) {
    console.error(err);
    dispatch({ type: 'SET_ERROR', error: `OCR extraction failed: ${err.message}` });
  }
};

// --- 6. Commit Event Transaction (Event Sourcing) ---

/**
 * Performs double entry update on Google Sheets (appends events ledger, recalculates/upserts stock status).
 */
const commitTransaction = async () => {
  const { accessToken, spreadsheetId } = currentState.auth;
  const { scannedBarcode, selectedStockId, scanMode, formData, bottleCache, inventory } = currentState;
  
  if (!accessToken || !spreadsheetId) return;
  
  dispatch({ type: 'SET_LOADING', loading: true, message: 'Recording transactions...' });
  
  const timestamp = new Date().toISOString();
  const quantityScanned = formData.quantity;
  const wineName = `${formData.domain} ${formData.appellation}`.trim();
  const vintage = formData.vintage;
  const barcode = selectedStockId || scannedBarcode || `MANUAL-${Date.now()}`;
  
  try {
    // 1. Ledger Entry: Append Event to events sheet
    const eventRow = [timestamp, scanMode, barcode, quantityScanned];
    const eventAppendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/events!A:D:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [eventRow] })
      }
    );
    
    if (!eventAppendRes.ok) throw new Error('Could not write to Events Ledger.');
    
    // 2. Cache Entry: If we scanned barcode and it wasn't in cache, append to bottle_cache
    const isBarcodeCached = bottleCache.some(b => b.barcode === barcode);
    if (scannedBarcode && !selectedStockId && !isBarcodeCached) {
      const cacheRow = [barcode, formData.domain, formData.appellation, vintage];
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/bottle_cache!A:D:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [cacheRow] })
        }
      );
    }
    
    // 3. Compute State Change: Get current stock matching barcode ID in stock_status
    // Retrieve complete state first to check index
    const fetchStockRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/stock_status!A:E`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const currentStockData = await fetchStockRes.json();
    const stockRows = currentStockData.values || [];
    
    // Search for existing index row (skipping header)
    const existingIndex = stockRows.findIndex((row, idx) => idx > 0 && row[0] === barcode);
    
    let targetQuantity = quantityScanned;
    if (existingIndex !== -1) {
      const currentQty = parseInt(stockRows[existingIndex][3]) || 0;
      targetQuantity = scanMode === 'IN' ? currentQty + quantityScanned : currentQty - quantityScanned;
      if (targetQuantity < 0) targetQuantity = 0;
    }
    
    if (existingIndex !== -1) {
      // Update cell in row
      const updateRow = [barcode, wineName, vintage, targetQuantity, timestamp];
      const updateRange = `stock_status!A${existingIndex + 1}:E${existingIndex + 1}`;
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [updateRow] })
        }
      );
      if (!updateRes.ok) throw new Error('Could not update inventory.');
    } else {
      // Append new stock row
      const newStockRow = [barcode, wineName, vintage, targetQuantity, timestamp];
      const insertRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/stock_status!A:E:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [newStockRow] })
        }
      );
      if (!insertRes.ok) throw new Error('Could not insert inventory.');
    }
    
    // 4. Force state update & dashboard refresh
    dispatch({ type: 'SET_SUCCESS', message: 'Inventory update completed successfully!' });
    await fetchSpreadsheetData();
  } catch (err) {
    console.error(err);
    dispatch({ type: 'SET_ERROR', error: `Transaction failed: ${err.message}` });
  }
};

// --- 7. Pure Functional UI Renderers ---

const renderHeader = (state) => {
  if (state.view === 'LOGIN') return '';
  return `
    <header class="app-header">
      <div class="app-logo">Winestocker</div>
      <div style="display: flex; gap: 8px;">
        <button id="nav-dashboard-btn" class="icon-btn" title="Dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
        </button>
        <button id="nav-logout-btn" class="icon-btn" title="Logout" style="color: var(--color-error)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </header>
  `;
};

const renderLoadingIndicator = (state) => {
  if (!state.loading) return '';
  return `
    <div class="glass-panel loader-container">
      <div class="loader-spinner"></div>
      <div id="loader-message" style="font-weight: 500; font-size: 0.95rem; color: var(--color-accent-gold);">${state.loadingMessage || 'Syncing...'}</div>
    </div>
  `;
};

const renderErrorBanner = (state) => {
  if (!state.error) return '';
  return `
    <div class="error-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <div style="flex: 1;">${state.error}</div>
      <button id="dismiss-error-btn" class="icon-btn" style="color: white; padding: 2px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `;
};

const renderSuccessBanner = (state) => {
  if (!state.successMessage) return '';
  return `
    <div class="glass-panel" style="border-left: 3px solid var(--color-success); background: rgba(46,204,113,0.08); padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
      <div style="color: #a3e4d7; font-size: 0.9rem;">${state.successMessage}</div>
      <button id="dismiss-success-btn" class="icon-btn" style="padding: 2px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `;
};

const renderActiveView = (state) => {
  // If loading and view is login, show loading over or hide details
  switch (state.view) {
    case 'LOGIN':
      return `
        <div class="glass-panel" style="text-align: center;">
          <div class="login-logo">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-gold)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 22H2M8 22V7a4 4 0 0 1 8 0v15M12 22V12M12 7V5M10 5h4" />
            </svg>
          </div>
          <h1>WINESTOCKER</h1>
          <p style="letter-spacing: 1.5px; font-size: 0.75rem; color: var(--color-accent-gold); text-transform: uppercase; margin-bottom: 30px;">Sommelier Inventory System</p>
          
          <button id="login-submit-btn" class="btn btn-primary" style="margin-top: 24px;">
            <span>Login with Google</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          </button>
        </div>
      `;
      
    case 'DASHBOARD': {
      // Calculate Stats
      const totalBottles = state.inventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
      const uniqueWines = state.inventory.filter(item => (parseInt(item.quantity) || 0) > 0).length;
      
      // Filter inventory by search term
      const filteredInventory = state.inventory.filter(item => {
        const query = state.searchTerm.toLowerCase();
        return (item.wine_name || '').toLowerCase().includes(query) ||
               (item.vintage || '').toLowerCase().includes(query);
      });
      
      return `
        ${renderSuccessBanner(state)}
        <div class="glass-panel">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; text-align: center;">
            <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-accent-gold);">${totalBottles}</div>
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-secondary);">Total Bottles</div>
            </div>
            <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-accent-gold);">${uniqueWines}</div>
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-secondary);">Unique Wines</div>
            </div>
          </div>
          
          <h2>Cellar Inventory</h2>
          
          <div class="input-group">
            <input type="text" id="dashboard-search-input" placeholder="Search wine name or vintage..." value="${state.searchTerm}">
          </div>
          
          <div class="inventory-list">
            ${filteredInventory.length > 0 ? filteredInventory.map(item => `
              <div class="inventory-item">
                <div class="wine-info">
                  <div class="wine-title">${item.wine_name || 'Unknown Wine'}</div>
                  <div class="wine-vintage">${item.vintage ? `${item.vintage} Vintage` : 'NV'}</div>
                </div>
                <div class="inventory-actions">
                  <div class="wine-qty">${item.quantity}</div>
                  ${(parseInt(item.quantity) || 0) > 0 ? `
                    <button class="stock-out-item-btn" data-stock-id="${item.id}" type="button">Stock Out</button>
                  ` : ''}
                </div>
              </div>
            `).join('') : `
              <div style="text-align: center; padding: 40px 0; color: var(--color-text-secondary); font-size: 0.95rem;">
                No wines found matching scan/search criteria.
              </div>
            `}
          </div>
          
          <div class="fab-container">
            <button id="dashboard-in-btn" class="btn btn-burgundy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Stock In</span>
            </button>
            <button id="dashboard-out-btn" class="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Stock Out</span>
            </button>
          </div>
        </div>
      `;
    }
      
    case 'SCANNER':
      return `
        <div class="glass-panel" style="display: flex; flex-direction: column; gap: 16px;">
          <h2>Scan Bottle Barcode</h2>
          <p>Align the barcode inside the camera targeting box.</p>
          
          <div class="scanner-container">
            <div id="reader"></div>
            <div class="scanner-overlay">
              <div class="scanner-target">
                <div class="scanner-laser"></div>
              </div>
            </div>
          </div>
          
          <div class="manual-barcode-entry">
            <input type="text" id="manual-barcode-input" placeholder="Type barcode manually...">
            <button id="manual-barcode-submit" class="btn btn-secondary" style="width: auto; padding: 0 16px;">Go</button>
          </div>
          
          <button id="scanner-ocr-fallback-btn" class="btn btn-secondary" style="margin-top: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            <span>Scan Label (OCR)</span>
          </button>
          
          <button id="scanner-cancel-btn" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      `;
      
    case 'OCR':
      return `
        <div class="glass-panel" style="display: flex; flex-direction: column; gap: 8px;">
          <h2>Label OCR fallback</h2>
          
          ${!state.ocrResult.imageUrl ? `
            <p>Barcode not found. Point the camera at the wine label, then tap <strong>Capture</strong>.</p>
            
            <!-- Live camera preview for desktop + mobile -->
            <div style="position: relative; width: 100%; background: #000; border-radius: 12px; overflow: hidden; border: 2px solid rgba(214,175,55,0.3); margin: 12px 0;">
              <video id="ocr-video-preview" autoplay playsinline muted style="width: 100%; display: block; max-height: 240px; object-fit: cover;"></video>
              <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--color-accent-gold); animation: scan 2s linear infinite; box-shadow: 0 0 8px var(--color-accent-gold);"></div>
            </div>
            
            <button id="ocr-capture-btn" class="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M20 7h-3.2L15 5H9L7.2 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"></path></svg>
              <span>Capture Label</span>
            </button>
            
            <!-- File upload fallback -->
            <label class="btn btn-secondary" style="margin-top: 10px; position: relative; overflow: hidden; cursor: pointer; display: flex;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Upload Photo</span>
              <input type="file" id="ocr-file-input" accept="image/*" style="position: absolute; top: 0; left: 0; opacity: 0; width: 100%; height: 100%; cursor: pointer;">
            </label>
            
            <button id="ocr-cancel-btn" class="btn btn-secondary">Back to Dashboard</button>
          ` : `
            <div class="ocr-tagger-instruction">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-gold)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>Choose a field, then tap matching text in image.</span>
            </div>
            
            <div class="ocr-field-selector-grid">
              <button class="field-select-btn ${state.activeOcrField === 'domain' ? 'active' : ''}" data-field="domain">Domain</button>
              <button class="field-select-btn ${state.activeOcrField === 'appellation' ? 'active' : ''}" data-field="appellation">Appell.</button>
              <button class="field-select-btn ${state.activeOcrField === 'vintage' ? 'active' : ''}" data-field="vintage">Vintage</button>
            </div>
            
            <div class="ocr-interactive-wrapper" id="ocr-wrapper">
              <img id="ocr-img" class="ocr-captured-image" src="${state.ocrResult.imageUrl}">
              <div id="ocr-blocks-overlay" class="ocr-overlay-canvas"></div>
            </div>
            
            <div class="input-group">
              <div class="ocr-input-heading">
                <label class="input-label ${state.activeOcrField === 'domain' ? 'ocr-target-active' : ''}">Domain / Estate</label>
                <button class="ocr-clear-field-btn" data-field="domain" type="button">Clear</button>
              </div>
              <input type="text" id="input-domain" class="${state.activeOcrField === 'domain' ? 'ocr-target-active' : ''}" value="${state.formData.domain}" placeholder="e.g. Domaine de la Romanée-Conti">
            </div>
            
            <div class="input-group">
              <div class="ocr-input-heading">
                <label class="input-label ${state.activeOcrField === 'appellation' ? 'ocr-target-active' : ''}">Appellation</label>
                <button class="ocr-clear-field-btn" data-field="appellation" type="button">Clear</button>
              </div>
              <input type="text" id="input-appellation" class="${state.activeOcrField === 'appellation' ? 'ocr-target-active' : ''}" value="${state.formData.appellation}" placeholder="e.g. Vosne-Romanée">
            </div>
            
            <div class="input-group">
              <div class="ocr-input-heading">
                <label class="input-label ${state.activeOcrField === 'vintage' ? 'ocr-target-active' : ''}">Vintage</label>
                <button class="ocr-clear-field-btn" data-field="vintage" type="button">Clear</button>
              </div>
              <input type="text" id="input-vintage" class="${state.activeOcrField === 'vintage' ? 'ocr-target-active' : ''}" value="${state.formData.vintage}" placeholder="e.g. 2015">
            </div>
            
            <div class="btn-group">
              <button id="ocr-retake-btn" class="btn btn-secondary">Retake</button>
              <button id="ocr-submit-btn" class="btn btn-success">Confirm</button>
            </div>
          `}
        </div>
      `;
      
    case 'CONFIRM':
      return `
        <div class="glass-panel" style="text-align: center;">
          <h2 style="margin-bottom: 24px;">Confirm Stock ${state.scanMode}</h2>
          
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-accent-gold); margin-bottom: 4px;">Estate / Winery</div>
            <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: white; margin-bottom: 12px;">${state.formData.domain || 'N/A'}</div>
            
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-accent-gold); margin-bottom: 4px;">Appellation</div>
            <div style="font-size: 1.1rem; color: var(--color-text-primary); margin-bottom: 12px;">${state.formData.appellation || 'N/A'}</div>
            
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-accent-gold); margin-bottom: 4px;">Vintage</div>
            <div style="font-size: 1.1rem; font-weight: 500; color: white;">${state.formData.vintage || 'Non-Vintage'}</div>
            
            ${state.scannedBarcode ? `<div style="font-size: 0.7rem; color: var(--color-text-secondary); margin-top: 14px; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 8px;">Barcode: ${state.scannedBarcode}</div>` : ''}
          </div>
          
          <div class="input-label" style="text-align: center;">Select Quantity</div>
          <div class="quantity-control">
            <button id="qty-decrement-btn" class="qty-btn">-</button>
            <div id="qty-display" class="qty-display">${state.formData.quantity}</div>
            <button id="qty-increment-btn" class="qty-btn">+</button>
          </div>
          
          <div class="btn-group" style="margin-top: 30px;">
            <button id="confirm-cancel-btn" class="btn btn-secondary">Cancel</button>
            <button id="confirm-commit-btn" class="btn ${state.scanMode === 'IN' ? 'btn-burgundy' : 'btn-primary'}">
              Commit ${state.scanMode === 'IN' ? 'In' : 'Out'}
            </button>
          </div>
        </div>
      `;
      
    default:
      return '';
  }
};

/**
 * Handles DOM layout mapping and binding element values to core state.
 */
const render = (state) => {
  const app = document.getElementById('app');
  if (!app) return;
  
  app.innerHTML = `
    ${renderHeader(state)}
    ${renderErrorBanner(state)}
    ${renderLoadingIndicator(state)}
    <main id="main-view" style="display: ${state.loading ? 'none' : 'block'};">
      ${renderActiveView(state)}
    </main>
  `;
  
  bindEventListeners(state);
  runEffects(state);
};

// --- 8. DOM Event Listeners Mapping ---

/**
 * Maps static DOM events to action dispatches.
 */
const bindEventListeners = (state) => {
  // Navigation
  const navDashboard = document.getElementById('nav-dashboard-btn');
  if (navDashboard) navDashboard.addEventListener('click', () => dispatch({ type: 'SET_VIEW', view: 'DASHBOARD' }));
  
  const navLogout = document.getElementById('nav-logout-btn');
  if (navLogout) navLogout.addEventListener('click', () => {
    clearStoredAuth();
    dispatch({ type: 'LOGOUT' });
  });

  // Error/Success Dismissal
  const dismissError = document.getElementById('dismiss-error-btn');
  if (dismissError) dismissError.addEventListener('click', () => dispatch({ type: 'CLEAR_ERROR' }));
  
  const dismissSuccess = document.getElementById('dismiss-success-btn');
  if (dismissSuccess) dismissSuccess.addEventListener('click', () => dispatch({ type: 'CLEAR_SUCCESS' }));


  // Views bindings
  switch (state.view) {
    case 'LOGIN': {
      const loginBtn = document.getElementById('login-submit-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          loginWithGoogle();
        });
      }
      break;
    }
      
    case 'DASHBOARD': {
      const inBtn = document.getElementById('dashboard-in-btn');
      if (inBtn) {
        inBtn.addEventListener('click', () => {
          dispatch({ type: 'SET_SCAN_MODE', scanMode: 'IN' });
          dispatch({ type: 'START_SCAN' });
        });
      }
      
      const outBtn = document.getElementById('dashboard-out-btn');
      if (outBtn) {
        outBtn.addEventListener('click', () => {
          dispatch({ type: 'SET_SCAN_MODE', scanMode: 'OUT' });
          dispatch({ type: 'START_SCAN' });
        });
      }
      
      const searchInput = document.getElementById('dashboard-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          dispatch({ type: 'SET_SEARCH_TERM', searchTerm: e.target.value });
        });
        // Refocus workaround for rendering loop on typing
        searchInput.addEventListener('blur', (e) => {
          // Allow click handlers to resolve before losing keyboard focus
        });
      }

      const stockOutButtons = document.querySelectorAll('.stock-out-item-btn');
      stockOutButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const item = state.inventory.find(stockItem => stockItem.id === btn.dataset.stockId);
          if (!item) return;

          const cachedBottle = state.bottleCache.find(bottle => bottle.barcode === item.id);
          dispatch({
            type: 'SELECT_EXISTING_WINE',
            item,
            formData: {
              domain: cachedBottle?.domain || '',
              appellation: cachedBottle?.appellation || item.wine_name || '',
              vintage: cachedBottle?.vintage || item.vintage || '',
              quantity: 1
            }
          });
        });
      });
      break;
    }
      
    case 'SCANNER': {
      const cancelScan = document.getElementById('scanner-cancel-btn');
      if (cancelScan) {
        cancelScan.addEventListener('click', () => {
          stopBarcodeScanner();
          dispatch({ type: 'SET_VIEW', view: 'DASHBOARD' });
        });
      }
      
      const ocrFallback = document.getElementById('scanner-ocr-fallback-btn');
      if (ocrFallback) {
        ocrFallback.addEventListener('click', () => {
          stopBarcodeScanner();
          dispatch({ type: 'SET_VIEW', view: 'OCR' });
        });
      }
      
      const manualSubmit = document.getElementById('manual-barcode-submit');
      const manualInput = document.getElementById('manual-barcode-input');
      if (manualSubmit && manualInput) {
        manualSubmit.addEventListener('click', () => {
          const barcode = manualInput.value.trim();
          if (barcode) {
            stopBarcodeScanner();
            dispatch({ type: 'BARCODE_SCANNED', barcode });
            resolveBarcode(barcode);
          }
        });
      }
      break;
    }
      
    case 'OCR': {
      const cancelOcr = document.getElementById('ocr-cancel-btn');
      if (cancelOcr) cancelOcr.addEventListener('click', () => {
        stopOcrCamera();
        dispatch({ type: 'SET_VIEW', view: 'DASHBOARD' });
      });
      
      // Live capture button
      const captureBtn = document.getElementById('ocr-capture-btn');
      if (captureBtn) captureBtn.addEventListener('click', () => captureOcrFrame());
      
      // File upload fallback
      const fileInput = document.getElementById('ocr-file-input');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          processOcrImage(file);
        });
      }
      
      // Select active OCR target inputs
      const fields = document.querySelectorAll('.field-select-btn');
      fields.forEach(btn => {
        btn.addEventListener('click', (e) => {
          dispatch({ type: 'SET_ACTIVE_OCR_FIELD', field: e.target.dataset.field });
        });
      });
      
      // Bind inline keyboard updates to form data
      const inputDomain = document.getElementById('input-domain');
      const inputAppellation = document.getElementById('input-appellation');
      const inputVintage = document.getElementById('input-vintage');
      
      // Do not re-render while typing. Replacing a focused input closes the keyboard
      // on iOS Safari, even when focus is immediately restored. The native input
      // already displays the new value; update only application state until another
      // user action naturally re-renders this view.
      const updateOcrTextField = (event, field) => {
        currentState = stateReducer(currentState, {
          type: 'SET_FORM_DATA',
          data: { [field]: event.target.value }
        });
      };

      if (inputDomain) inputDomain.addEventListener('input', (e) => updateOcrTextField(e, 'domain'));
      if (inputAppellation) inputAppellation.addEventListener('input', (e) => updateOcrTextField(e, 'appellation'));
      if (inputVintage) inputVintage.addEventListener('input', (e) => updateOcrTextField(e, 'vintage'));

      const clearFieldButtons = document.querySelectorAll('.ocr-clear-field-btn');
      clearFieldButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          dispatch({ type: 'SET_FORM_DATA', data: { [btn.dataset.field]: '' } });
        });
      });
      
      const retakeBtn = document.getElementById('ocr-retake-btn');
      if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
          dispatch({
            type: 'OCR_IMAGE_LOADED',
            imageUrl: null,
            width: 0,
            height: 0,
            textBlocks: []
          });
        });
      }
      
      const submitOcr = document.getElementById('ocr-submit-btn');
      if (submitOcr) {
        submitOcr.addEventListener('click', () => {
          dispatch({ type: 'SET_VIEW', view: 'CONFIRM' });
        });
      }
      break;
    }
      
    case 'CONFIRM': {
      const decBtn = document.getElementById('qty-decrement-btn');
      if (decBtn) {
        decBtn.addEventListener('click', () => {
          const newQty = Math.max(1, state.formData.quantity - 1);
          dispatch({ type: 'SET_FORM_DATA', data: { quantity: newQty } });
        });
      }
      
      const incBtn = document.getElementById('qty-increment-btn');
      if (incBtn) {
        incBtn.addEventListener('click', () => {
          dispatch({ type: 'SET_FORM_DATA', data: { quantity: state.formData.quantity + 1 } });
        });
      }
      
      const cancelBtn = document.getElementById('confirm-cancel-btn');
      if (cancelBtn) cancelBtn.addEventListener('click', () => dispatch({ type: 'SET_VIEW', view: 'DASHBOARD' }));
      
      const commitBtn = document.getElementById('confirm-commit-btn');
      if (commitBtn) {
        commitBtn.addEventListener('click', () => {
          commitTransaction();
        });
      }
      break;
    }
  }
};

// --- 9. Non-Pure State Effects Runner ---

/**
 * Handles side-effects based on target changes in current state.
 */
const runEffects = (state) => {
  // Scanner lifecycle: start if SCANNER view, else stop and chain OCR start if needed
  if (state.view === 'SCANNER') {
    setTimeout(() => startBarcodeScanner(), 100);
  } else {
    // Always await scanner fully stopping before allowing camera reuse
    stopBarcodeScanner().then(() => {
      if (state.view === 'OCR' && !state.ocrResult.imageUrl) {
        startOcrCamera();
      }
    });
  }
  
  // Stop OCR camera when leaving the OCR view
  if (state.view !== 'OCR') {
    stopOcrCamera();
  }
  
  // Re-draw OCR image text bounding boxes if image exists
  if (state.view === 'OCR' && state.ocrResult.imageUrl) {
    // Delay slightly to let the image render to get coordinates matching width/height
    setTimeout(() => {
      drawOcrBoundingBoxes(state);
    }, 150);
  }
  
  // Keep focus on search input if typing
  if (state.view === 'DASHBOARD' && state.searchTerm) {
    const input = document.getElementById('dashboard-search-input');
    if (input) {
      input.focus();
      // Move cursor to end of text
      const val = input.value;
      input.value = '';
      input.value = val;
    }
  }
};

/**
 * Computes bounding boxes positions mapping captured dimensions to actual viewport dimensions.
 */
const drawOcrBoundingBoxes = (state) => {
  const imgElement = document.getElementById('ocr-img');
  const overlayElement = document.getElementById('ocr-blocks-overlay');
  
  if (!imgElement || !overlayElement || !state.ocrResult.imageUrl) return;
  
  const displayWidth = imgElement.clientWidth;
  const displayHeight = imgElement.clientHeight;
  const originalWidth = state.ocrResult.imageWidth || displayWidth;
  const originalHeight = state.ocrResult.imageHeight || displayHeight;
  
  const scaleX = displayWidth / originalWidth;
  const scaleY = displayHeight / originalHeight;
  
  overlayElement.innerHTML = '';
  
  state.ocrResult.textBlocks.forEach((block) => {
    const { bbox } = block;
    if (!bbox) return;
    
    // Scale bbox coordinates
    const left = bbox.x0 * scaleX;
    const top = bbox.y0 * scaleY;
    const width = (bbox.x1 - bbox.x0) * scaleX;
    const height = (bbox.y1 - bbox.y0) * scaleY;
    
    // Create button overlay
    const overlayBtn = document.createElement('button');
    overlayBtn.className = 'ocr-text-block-btn';
    overlayBtn.style.left = `${left}px`;
    overlayBtn.style.top = `${top}px`;
    overlayBtn.style.width = `${width}px`;
    overlayBtn.style.height = `${height}px`;
    overlayBtn.setAttribute('type', 'button');
    overlayBtn.title = block.text;
    
    // Handle tap events
    overlayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const { activeOcrField, formData } = currentState;
      let text = block.text.trim();
      
      // Clean up punctuation typical for OCR glitches
      text = text.replace(/^[.·,:;\-_|/~\\]+|[.·,:;\-_|/~\\]+$/g, '').trim();
      
      if (!text) return;
      
      const currentVal = formData[activeOcrField] || '';
      
      // For vintage, only append if it is numeric-like or override
      let newVal = '';
      if (activeOcrField === 'vintage') {
        const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
        newVal = yearMatch ? yearMatch[0] : text;
      } else {
        newVal = currentVal ? `${currentVal} ${text}` : text;
      }
      
      dispatch({
        type: 'SET_FORM_DATA',
        data: { [activeOcrField]: newVal }
      });
      
      // Spark visual indicator feedback on box
      overlayBtn.style.background = 'rgba(46, 204, 113, 0.6)';
      setTimeout(() => {
        overlayBtn.style.background = '';
      }, 300);
    });
    
    overlayElement.appendChild(overlayBtn);
  });
};

// --- 10. Initialization Bootstrapper ---

/**
 * Bootstrap entry point.
 */
document.addEventListener('DOMContentLoaded', () => {
  // If we already have stored OAuth details, auto-init auth callbacks
  if (currentState.auth.clientId) {
    // Delay initialization slightly to ensure GIS scripts load complete
    setTimeout(() => {
      initGoogleAuth(currentState);
    }, 500);
  }
  
  // Initial render loop kick-off
  render(currentState);

  // Reuse a still-valid Google token after page reloads. Google access tokens expire,
  // so expired entries are discarded and the normal login button remains available.
  const storedAuth = getStoredAuth();
  if (storedAuth) {
    dispatch({ type: 'SET_ACCESS_TOKEN', token: storedAuth.token, expiresAt: storedAuth.expiresAt });
    fetchSpreadsheetData();
  }
});
