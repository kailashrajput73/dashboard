// ============================================================================
// API BASE URL — central config for the entire mobile app
// ============================================================================
// CONFIG:
//   Change API_BASE_URL below to point the app at the correct backend.
//
//   1) EXPO cloud preview (default):
//        Uses process.env.EXPO_PUBLIC_BACKEND_URL which resolves to your
//        Emergent preview domain. All /api/* requests are proxied to the
//        mirror FastAPI backend running in this pod.
//
//   2) Teammate's laptop backend (Android Emulator):
//        API_BASE_URL = "http://10.0.2.2:8000"
//        (10.0.2.2 means this computer from the Android Emulator.)
//
//   3) Teammate's backend from a physical phone on same WiFi (Expo Go):
//        API_BASE_URL = "http://<teammate-laptop-lan-ip>:8000"
//        (Find LAN IP: macOS -> `ipconfig getifaddr en0`, Windows -> `ipconfig`)
//
//   4) Deployed URL later:
//        API_BASE_URL = "https://quotation.yourdomain.com"
//
// All API calls are made with fetch() against `${API_BASE_URL}/api/...`, so
// switching backends is a single-line change.
//
// MANUAL STEP (teammate side, one-time):
//   * Backend must be running:  `uvicorn server:app --host 0.0.0.0 --port 8000`
//   * MongoDB must be reachable from the backend
//   * CORS must allow_origins=["*"] (or the mobile origin) for cross-device use
// ============================================================================
const USE_CLOUD_PREVIEW = true;
const CLOUD_PREVIEW_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://python-api-6aft.onrender.com";

// Flip this to `false` to force API_BASE_URL to LOCAL_BACKEND_URL below when
// running Expo Go on your laptop against teammate's local FastAPI server.

// Android Emulator uses 10.0.2.2 to reach the host computer.
// Examples:
//   "http://10.0.2.2:8000"             (Android Emulator)
//   "http://localhost:8000"            (web or iOS simulator on same laptop)
//   "http://192.168.1.42:8000"        (physical phone via Expo Go on same WiFi)
const LOCAL_BACKEND_URL = "http://10.0.2.2:8001";

export const API_BASE_URL: string = USE_CLOUD_PREVIEW && CLOUD_PREVIEW_URL
  ? CLOUD_PREVIEW_URL
  : LOCAL_BACKEND_URL;

// All backend routes are prefixed with /api (matches teammate's contract).
export const API_PREFIX = "/api";
