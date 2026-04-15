/*!
 * BrowserFingerprint v2.0.0
 * Generates a deterministic, collision-resistant browser fingerprint token.
 * Same browser/device environment → same token.
 * MIT License
 */
(function (global, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    global.BrowserFingerprint = factory();
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : this,
  function () {
    "use strict";

    var VERSION = "2.0.0";

    // ─── Utility ─────────────────────────────────────────────────────────────────

    /**
     * Safely execute fn(); return fallback on any thrown error or null/undefined result.
     * @param {Function} fn
     * @param {*} fallback
     * @returns {*}
     */
    function safe(fn, fallback) {
      try {
        var result = fn();
        return result !== null && result !== undefined ? result : fallback;
      } catch (_) {
        return fallback;
      }
    }

    /**
     * Serialize an object to JSON with sorted keys for determinism across engines.
     * @param {Object} obj
     * @returns {string}
     */
    function stableStringify(obj) {
      var sortedKeys = Object.keys(obj).sort();
      return JSON.stringify(obj, sortedKeys);
    }

    // ─── Hash Functions ───────────────────────────────────────────────────────────

    /**
     * FNV-1a 32-bit hash — fast, synchronous, good distribution.
     * Output: 8-char lowercase hex string.
     * @param {string} str
     * @returns {string}
     */
    function fnv1a32(str) {
      var hash = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    }

    /**
     * SHA-256 via the Web Crypto API (async).
     * Output: 64-char lowercase hex string.
     * @param {string} str
     * @returns {Promise<string>}
     */
    async function sha256(str) {
      var encoder = new TextEncoder();
      var data = encoder.encode(str);
      var hashBuffer = await crypto.subtle.digest("SHA-256", data);
      var hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    }

    // ─── Signal Collection ────────────────────────────────────────────────────────

    /**
     * Collect all available browser and hardware signals.
     * Each signal is wrapped with safe() so a single failing API
     * never prevents the rest from being collected.
     * @returns {Object} raw signals object
     */
    function collectSignals() {
      var s = {};

      // Schema version — bump this whenever signals are added/removed
      // so stored fingerprints can be invalidated on mismatch.
      s._v = VERSION;

      // ── Navigator ────────────────────────────────────────────────────────────
      // userAgent: still the broadest differentiator despite progressive reduction
      s.userAgent = safe(function () {
        return navigator.userAgent;
      }, "");

      // Language preferences — full array gives more entropy than just the first
      s.language = safe(function () {
        return navigator.language;
      }, "");
      s.languages = safe(function () {
        return (navigator.languages || []).join(",");
      }, "");

      // Platform string (e.g. "Win32", "MacIntel", "Linux x86_64", "iPhone")
      // Deprecated in spec but still widely available and useful
      s.platform = safe(function () {
        return navigator.platform;
      }, "");

      // Hardware hints (rounded by browsers for privacy, still useful)
      s.hardwareConcurrency = safe(function () {
        return navigator.hardwareConcurrency;
      }, 0);
      s.deviceMemory = safe(function () {
        return navigator.deviceMemory;
      }, 0);
      s.maxTouchPoints = safe(function () {
        return navigator.maxTouchPoints;
      }, 0);

      // Misc navigator flags
      s.cookieEnabled = safe(function () {
        return navigator.cookieEnabled ? 1 : 0;
      }, 0);
      s.doNotTrack = safe(function () {
        return navigator.doNotTrack;
      }, "");
      s.pdfViewerEnabled = safe(function () {
        return navigator.pdfViewerEnabled ? 1 : 0;
      }, 0);

      // User-Agent Client Hints (Chromium-based browsers only)
      // These are the non-privileged, synchronous values
      if (
        safe(function () {
          return !!navigator.userAgentData;
        }, false)
      ) {
        s.uaBrands = safe(function () {
          return navigator.userAgentData.brands
            .map(function (b) {
              return b.brand + "/" + b.version;
            })
            .join(",");
        }, "");
        s.uaMobile = safe(function () {
          return navigator.userAgentData.mobile ? 1 : 0;
        }, 0);
        s.uaPlatform = safe(function () {
          return navigator.userAgentData.platform;
        }, "");
      }

      // ── Screen & Display ─────────────────────────────────────────────────────
      s.screenWidth = safe(function () {
        return screen.width;
      }, 0);
      s.screenHeight = safe(function () {
        return screen.height;
      }, 0);
      s.colorDepth = safe(function () {
        return screen.colorDepth;
      }, 0);
      s.pixelRatio = safe(function () {
        return window.devicePixelRatio;
      }, 1);

      // ── Timezone ─────────────────────────────────────────────────────────────
      s.timezone = safe(function () {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }, "");
      s.timezoneOffset = safe(function () {
        return new Date().getTimezoneOffset();
      }, 0);

      // ── WebGL — GPU vendor & renderer (strongest hardware signal) ────────────
      safe(function () {
        var canvas = document.createElement("canvas");
        var gl =
          canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) return;

        var dbg = gl.getExtension("WEBGL_debug_renderer_info");
        s.webglVendor = dbg
          ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
          : gl.getParameter(gl.VENDOR);
        s.webglRenderer = dbg
          ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        s.webglVersion = gl.getParameter(gl.VERSION);
        s.glslVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);

        // Collect a selection of numeric capability limits for extra entropy
        s.webglMaxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        s.webglMaxViewportDims = (
          gl.getParameter(gl.MAX_VIEWPORT_DIMS) || []
        ).join("x");
        s.webglMaxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      }, null);

      // ── Canvas Fingerprint ───────────────────────────────────────────────────
      // Text and shape rendering on <canvas> produces pixel-level differences
      // driven by the GPU, OS font rendering pipeline, and anti-aliasing engine.
      // We store only a compact hash of the data URL to keep the object lean.
      s.canvasHash = safe(function () {
        var c = document.createElement("canvas");
        c.width = 280;
        c.height = 60;
        var ctx = c.getContext("2d");

        // Gradient background
        var grad = ctx.createLinearGradient(0, 0, c.width, 0);
        grad.addColorStop(0, "#f64f59");
        grad.addColorStop(0.5, "#c471ed");
        grad.addColorStop(1, "#12c2e9");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, c.width, c.height);

        // Primary text — serif vs sans-serif rendering differs per OS
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial, Helvetica, sans-serif";
        ctx.fillText("BrowserFingerprint \u2665 1.0", 8, 36);

        // Secondary text — monospace and special Unicode chars
        ctx.font = '12px "Courier New", Courier, monospace';
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillText("\u0CA0_\u0CA0  Cwm fjordbank glyphs vext quiz!", 8, 54);

        // Ellipse (arc rendering differs subtly across GPUs)
        ctx.beginPath();
        ctx.ellipse(260, 30, 14, 22, Math.PI / 6, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        return fnv1a32(c.toDataURL());
      }, "");

      // ── Browser Feature Flags ────────────────────────────────────────────────
      // These contribute low individual entropy but collectively help distinguish
      // browser families, versions, and extension configurations.
      s.hasWorker = safe(function () {
        return typeof Worker !== "undefined" ? 1 : 0;
      }, 0);
      s.hasSharedWorker = safe(function () {
        return typeof SharedWorker !== "undefined" ? 1 : 0;
      }, 0);
      s.hasWebGL = safe(function () {
        var c = document.createElement("canvas");
        return c.getContext("webgl") || c.getContext("experimental-webgl")
          ? 1
          : 0;
      }, 0);
      s.hasWebGL2 = safe(function () {
        return document.createElement("canvas").getContext("webgl2") ? 1 : 0;
      }, 0);
      s.hasIndexedDB = safe(function () {
        return typeof indexedDB !== "undefined" ? 1 : 0;
      }, 0);
      s.hasLocalStorage = safe(function () {
        return typeof localStorage !== "undefined" ? 1 : 0;
      }, 0);
      s.hasSessionStorage = safe(function () {
        return typeof sessionStorage !== "undefined" ? 1 : 0;
      }, 0);
      s.hasWasm = safe(function () {
        return typeof WebAssembly !== "undefined" ? 1 : 0;
      }, 0);
      s.hasNotifications = safe(function () {
        return typeof Notification !== "undefined" ? 1 : 0;
      }, 0);
      s.hasServiceWorker = safe(function () {
        return "serviceWorker" in navigator ? 1 : 0;
      }, 0);

      return s;
    }

    // ─── Public API ───────────────────────────────────────────────────────────────

    /**
     * Returns the raw fingerprint signals as a plain object.
     * Useful for inspection, debugging, or building custom logic on top.
     *
     * @returns {Object}
     */
    function getFingerprint() {
      return collectSignals();
    }

    /**
     * Returns a deterministic SHA-256 fingerprint token (64 hex chars).
     *
     * The token is computed by:
     *   1. Collecting all signals
     *   2. Serialising them with alphabetically sorted keys (cross-engine determinism)
     *   3. Hashing the resulting string with SHA-256 via the Web Crypto API
     *
     * Falls back to an FNV-1a 32-bit hash (8 hex chars) in environments where
     * `crypto.subtle` is unavailable (e.g. non-HTTPS pages, old browsers).
     *
     * Same device + same browser configuration → same token.
     *
     * @returns {Promise<string>}
     */
    async function getFingerprintToken() {
      var payload = stableStringify(collectSignals());

      if (typeof crypto !== "undefined" && crypto && crypto.subtle) {
        try {
          return await sha256(payload);
        } catch (_) {
          // Fall through to synchronous fallback
        }
      }

      return fnv1a32(payload);
    }

    /**
     * Synchronous variant of getFingerprintToken() using FNV-1a (8 hex chars).
     *
     * Use this only when you cannot await the async version.
     * The output is deterministic but has a much smaller hash space than SHA-256,
     * so collision probability is higher for large user bases.
     *
     * @returns {string}
     */
    function getFingerprintTokenSync() {
      return fnv1a32(stableStringify(collectSignals()));
    }

    // ─── Exports ──────────────────────────────────────────────────────────────────

    return {
      /** Library version — matches the schema version embedded in every fingerprint. */
      VERSION: VERSION,

      /** Returns the raw signals object. */
      getFingerprint: getFingerprint,

      /** Returns a Promise that resolves to a SHA-256 hex string (64 chars). */
      getFingerprintToken: getFingerprintToken,

      /** Returns an FNV-1a hex string synchronously (8 chars). */
      getFingerprintTokenSync: getFingerprintTokenSync,
    };
  },
);
