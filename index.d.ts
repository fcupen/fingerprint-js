/*!
 * BrowserFingerprint v2.1.0 — TypeScript definitions
 */

export interface FingerprintSignals {
  /** Schema version — matches BrowserFingerprint.VERSION */
  _v: string;

  /**
   * Present only when running in a non-browser environment
   * (Node.js, SSR, Web Workers, Jest, etc.)
   */
  _env?: "non-browser";

  // ── Navigator ──────────────────────────────────────────────────────────────

  /** Full user-agent string */
  userAgent: string;
  /** Primary language (e.g. "en-US") */
  language: string;
  /** Comma-separated list of preferred languages */
  languages: string;
  /** OS platform string (e.g. "Win32", "MacIntel", "Linux x86_64") */
  platform: string;
  /** Browser vendor string (e.g. "Google Inc.", "Apple Computer, Inc.", "") */
  vendor: string;
  /** Logical CPU core count */
  hardwareConcurrency: number;
  /** Approximate device RAM in GB (Chromium only, 0 elsewhere) */
  deviceMemory: number;
  /** Maximum number of simultaneous touch points */
  maxTouchPoints: number;
  /** 1 if cookies are enabled, 0 otherwise */
  cookieEnabled: number;
  /** 1 if the built-in PDF viewer is enabled, 0 otherwise (Chromium 94+) */
  pdfViewerEnabled: number;
  /** 1 if the browser is driven by automation (Selenium, Puppeteer, etc.) */
  webdriver: number;

  // ── User-Agent Client Hints (always present, empty on non-Chromium) ────────

  /** Comma-separated brand/version pairs (e.g. "Chromium/124,Google Chrome/124") */
  uaBrands: string;
  /** 1 if mobile, 0 otherwise */
  uaMobile: number;
  /** Platform from Client Hints (e.g. "Windows", "macOS") */
  uaPlatform: string;

  // ── Screen & Display ───────────────────────────────────────────────────────

  /** Larger of screen.width / screen.height (rotation-invariant) */
  screenMax: number;
  /** Smaller of screen.width / screen.height (rotation-invariant) */
  screenMin: number;
  /** Screen colour depth in bits */
  colorDepth: number;
  /** Larger of screen.availWidth / screen.availHeight */
  screenAvailMax: number;
  /** Smaller of screen.availWidth / screen.availHeight */
  screenAvailMin: number;

  // ── Timezone & Locale ──────────────────────────────────────────────────────

  /** IANA timezone name (e.g. "America/New_York") — DST-safe */
  timezone: string;
  /** Resolved locale from Intl.DateTimeFormat (e.g. "en-US") */
  locale: string;

  // ── WebGL ──────────────────────────────────────────────────────────────────

  /** 1 if any WebGL context was obtained, 0 otherwise */
  hasWebGL: number;
  /** 1 if a WebGL2 context was obtained, 0 otherwise */
  hasWebGL2: number;
  /** GPU vendor string (unmasked when available) */
  webglVendor: string;
  /** GPU renderer string (unmasked when available) */
  webglRenderer: string;
  /** WebGL version string */
  webglVersion: string;
  /** GLSL version string */
  glslVersion: string;
  /** Maximum texture dimension in pixels */
  webglMaxTextureSize: number;
  /** Maximum viewport dimensions (e.g. "32767x32767") */
  webglMaxViewportDims: string;
  /** Maximum renderbuffer dimension in pixels */
  webglMaxRenderbufferSize: number;
  /** Maximum number of vertex attributes */
  webglMaxVertexAttribs: number;
  /** Maximum number of varying vectors */
  webglMaxVaryingVectors: number;
  /** Maximum number of fragment uniform vectors */
  webglMaxFragmentUniformVectors: number;
  /** 1 if antialiasing is enabled on the context, 0 otherwise */
  webglAntialiasing: number;
  /** FNV-1a hash of the sorted, comma-joined supported-extensions list */
  webglExtensionsHash: string;
  /** Semicolon-delimited shader precision format entries */
  webglShaderPrecision: string;

  // ── Canvas & Fonts ─────────────────────────────────────────────────────────

  /** Comma-separated list of detected installed fonts */
  fonts: string;
  /** FNV-1a hash of the canvas 2D rendering data URL */
  canvasHash: string;

  // ── Math Engine ────────────────────────────────────────────────────────────

  /** Comma-separated results of transcendental math operations */
  mathFingerprint: string;

  // ── Browser Feature Flags ──────────────────────────────────────────────────

  /** 1 if Web Workers are supported */
  hasWorker: number;
  /** 1 if SharedWorker is supported */
  hasSharedWorker: number;
  /** 1 if WebAssembly is supported */
  hasWasm: number;
  /** 1 if the Notifications API is available */
  hasNotifications: number;
  /** 1 if Service Workers are supported */
  hasServiceWorker: number;
  /** 1 if IndexedDB is available */
  hasIndexedDB: number;
  /** 1 if localStorage is available */
  hasLocalStorage: number;
  /** 1 if sessionStorage is available */
  hasSessionStorage: number;
}

export interface BrowserFingerprint {
  /** Library version — matches the `_v` field embedded in every fingerprint. */
  readonly VERSION: string;

  /**
   * Returns a shallow copy of the collected signals object.
   * Results are cached after the first call.
   */
  getFingerprint(): FingerprintSignals;

  /**
   * Returns a deterministic SHA-256 fingerprint token (64 hex chars).
   *
   * Falls back to FNV-1a 64-bit (16 hex chars) when `crypto.subtle`
   * is unavailable (e.g. non-HTTPS pages or older browsers).
   *
   * Same device + same browser configuration → same token.
   */
  getFingerprintToken(): Promise<string>;

  /**
   * Synchronous variant using FNV-1a 64-bit (16 hex chars).
   *
   * Use this only when you cannot `await` the async version.
   * The output is deterministic but has a smaller hash space than SHA-256.
   * Birthday-bound collision threshold ≈ 4.3 × 10⁹.
   */
  getFingerprintTokenSync(): string;

  /**
   * Clears the internal signals cache so the next call to any method
   * re-collects all signals from scratch.
   */
  clearCache(): void;
}

declare const BrowserFingerprint: BrowserFingerprint;
export default BrowserFingerprint;
