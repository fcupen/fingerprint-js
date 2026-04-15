/*!
 * BrowserFingerprint v2.1.0
 * Generates a deterministic, collision-resistant browser fingerprint token.
 * Same browser + device environment → same token.
 * MIT License
 */
(function (root, factory) {
  "use strict";
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.BrowserFingerprint = factory();
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : this,
  function () {
    "use strict";

    var VERSION = "2.1.0";

    // ─── Internal Cache ───────────────────────────────────────────────────────
    // Signals are collected once and cached for the lifetime of the page.
    // This avoids redundant canvas/WebGL context creation, prevents WebGL
    // context leaks on repeated calls, and guarantees hash stability within
    // a single page session even if a volatile signal changes mid-session.
    var _signalsCache = null;

    // ─── Utility ──────────────────────────────────────────────────────────────

    /**
     * Execute fn(); return fallback on any thrown error, null, or undefined.
     * Every signal is wrapped with this so one blocked API never breaks the rest.
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
     * Recursively-safe deterministic JSON serialization.
     * Sorts object keys at every nesting level so the output is identical
     * regardless of insertion order or JS engine enumeration quirks.
     * @param {Object} obj
     * @returns {string}
     */
    function stableStringify(obj) {
      return JSON.stringify(obj, function (_key, value) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          var sorted = {};
          Object.keys(value)
            .sort()
            .forEach(function (k) {
              sorted[k] = value[k];
            });
          return sorted;
        }
        return value;
      });
    }

    // ─── Hash Functions ───────────────────────────────────────────────────────

    /**
     * FNV-1a 32-bit — fast, deterministic, good avalanche.
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
     * Two independent FNV-1a 32-bit passes with distinct prefixes → 64-bit output.
     * Birthday-bound jumps from ~65 K (32-bit) to ~4.3 billion (64-bit).
     * Output: 16-char lowercase hex string.
     * @param {string} str
     * @returns {string}
     */
    function fnv1a64(str) {
      return fnv1a32("\x01" + str) + fnv1a32("\x02" + str);
    }

    /**
     * SHA-256 via the native Web Crypto API (async).
     * Output: 64-char lowercase hex string.
     * @param {string} str
     * @returns {Promise<string>}
     */
    async function sha256(str) {
      var data = new TextEncoder().encode(str);
      var buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    }

    // ─── Font Detection ───────────────────────────────────────────────────────
    // Chosen to distinguish Windows, macOS, and Linux installations.
    // Each font is tested against three generic baselines via measureText();
    // a width mismatch means the font is installed.

    var TEST_FONTS = [
      "Arial Black",
      "Calibri",
      "Cambria",
      "Comic Sans MS",
      "Consolas",
      "Courier New",
      "DejaVu Sans",
      "Futura",
      "Garamond",
      "Georgia",
      "Gill Sans",
      "Helvetica",
      "Helvetica Neue",
      "Impact",
      "Lucida Console",
      "Menlo",
      "Monaco",
      "Palatino",
      "Segoe UI",
      "Tahoma",
      "Times New Roman",
      "Trebuchet MS",
      "Ubuntu",
      "Verdana",
    ];

    var BASE_FONTS = ["monospace", "sans-serif", "serif"];

    // Wide + narrow + ligature-candidate + symbol chars for maximum width variance
    var FONT_TEST_STRING = "mmMwWLliI0fiflO&1";

    // ─── Signal Collection ────────────────────────────────────────────────────

    /**
     * Collect all available browser and hardware signals.
     * Results are cached after the first call — use clearCache() to force
     * a fresh collection if needed.
     * @returns {Object} plain signals object
     */
    function collectSignals() {
      if (_signalsCache) return _signalsCache;

      var s = {};

      // Schema version — bump whenever the signal set changes so consumers
      // can detect stale fingerprints and invalidate / re-collect.
      s._v = VERSION;

      // ── Environment Guard ────────────────────────────────────────────────
      // In non-browser contexts (Node / SSR / Web Workers / Jest) most APIs
      // are absent.  Return a minimal object so callers get a consistent
      // shape instead of a wall of errors.
      if (typeof window === "undefined" || typeof document === "undefined") {
        s._env = "non-browser";
        _signalsCache = s;
        return s;
      }

      // ── Navigator ────────────────────────────────────────────────────────

      s.userAgent = safe(function () {
        return navigator.userAgent;
      }, "");
      s.language = safe(function () {
        return navigator.language;
      }, "");
      s.languages = safe(function () {
        return (navigator.languages || []).join(",");
      }, "");

      // Deprecated in spec but still widely populated and useful for
      // distinguishing OS families (Win32, MacIntel, Linux x86_64, iPhone…)
      s.platform = safe(function () {
        return navigator.platform;
      }, "");

      // Browser vendor string — "Google Inc." / "" / "Apple Computer, Inc."
      s.vendor = safe(function () {
        return navigator.vendor;
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

      s.cookieEnabled = safe(function () {
        return navigator.cookieEnabled ? 1 : 0;
      }, 0);
      s.pdfViewerEnabled = safe(function () {
        return navigator.pdfViewerEnabled ? 1 : 0;
      }, 0);

      // Automation detection — true when driven by Selenium / Puppeteer / etc.
      s.webdriver = safe(function () {
        return navigator.webdriver ? 1 : 0;
      }, 0);

      // User-Agent Client Hints (Chromium-only, synchronous low-entropy values).
      // Keys are ALWAYS present with defaults so the JSON schema never varies
      // between browsers — a conditional key set would cause hash instability.
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

      // ── Screen & Display ─────────────────────────────────────────────────
      // On mobile, width/height swap on rotation.  Normalising with max/min
      // makes the fingerprint orientation-invariant.
      // NOTE: devicePixelRatio is intentionally excluded — it mutates when
      //       the user changes browser zoom (Ctrl +/-), breaking determinism.
      var sw = safe(function () {
        return screen.width;
      }, 0);
      var sh = safe(function () {
        return screen.height;
      }, 0);
      s.screenMax = Math.max(sw, sh);
      s.screenMin = Math.min(sw, sh);
      s.colorDepth = safe(function () {
        return screen.colorDepth;
      }, 0);

      // availWidth/Height exclude the OS taskbar/dock — reveals desktop config
      var saw = safe(function () {
        return screen.availWidth;
      }, 0);
      var sah = safe(function () {
        return screen.availHeight;
      }, 0);
      s.screenAvailMax = Math.max(saw, sah);
      s.screenAvailMin = Math.min(saw, sah);

      // ── Timezone ─────────────────────────────────────────────────────────
      // IANA name (e.g. "America/New_York") is stable year-round.
      // NOTE: timezoneOffset is intentionally excluded — it changes with DST,
      //       producing two different fingerprints per year on the same device.
      s.timezone = safe(function () {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }, "");
      s.locale = safe(function () {
        return Intl.DateTimeFormat().resolvedOptions().locale;
      }, "");

      // ── WebGL — single context, all signals, then release ────────────────
      // All keys are pre-initialised with defaults so the schema is fixed
      // regardless of whether the WebGL context is successfully obtained.
      // Only ONE context is created (prefer WebGL2, fallback to WebGL1) and
      // it is explicitly released via WEBGL_lose_context to avoid exhausting
      // the browser's hard limit of ~8-16 simultaneous contexts.

      s.hasWebGL = 0;
      s.hasWebGL2 = 0;
      s.webglVendor = "";
      s.webglRenderer = "";
      s.webglVersion = "";
      s.glslVersion = "";
      s.webglMaxTextureSize = 0;
      s.webglMaxViewportDims = "";
      s.webglMaxRenderbufferSize = 0;
      s.webglMaxVertexAttribs = 0;
      s.webglMaxVaryingVectors = 0;
      s.webglMaxFragmentUniformVectors = 0;
      s.webglAntialiasing = 0;
      s.webglExtensionsHash = "";
      s.webglShaderPrecision = "";

      safe(function () {
        var canvas = document.createElement("canvas");
        var gl =
          canvas.getContext("webgl2") ||
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl");
        if (!gl) return;

        s.hasWebGL = 1;
        s.hasWebGL2 =
          typeof WebGL2RenderingContext !== "undefined" &&
          gl instanceof WebGL2RenderingContext
            ? 1
            : 0;

        var dbg = gl.getExtension("WEBGL_debug_renderer_info");
        s.webglVendor =
          (dbg
            ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
            : gl.getParameter(gl.VENDOR)) || "";
        s.webglRenderer =
          (dbg
            ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER)) || "";
        s.webglVersion = gl.getParameter(gl.VERSION) || "";
        s.glslVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "";

        // Numeric capability limits — vary by GPU and driver version
        s.webglMaxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
        s.webglMaxViewportDims = (
          gl.getParameter(gl.MAX_VIEWPORT_DIMS) || []
        ).join("x");
        s.webglMaxRenderbufferSize =
          gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 0;
        s.webglMaxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) || 0;
        s.webglMaxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS) || 0;
        s.webglMaxFragmentUniformVectors =
          gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 0;
        s.webglAntialiasing = (gl.getContextAttributes() || {}).antialias
          ? 1
          : 0;

        // Supported extensions — sorted for determinism, hashed for compactness
        s.webglExtensionsHash = fnv1a32(
          (gl.getSupportedExtensions() || []).sort().join(","),
        );

        // Shader precision format — highly discriminant per GPU model
        var shaderTypes = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER];
        var precisionTypes = [
          gl.LOW_FLOAT,
          gl.MEDIUM_FLOAT,
          gl.HIGH_FLOAT,
          gl.LOW_INT,
          gl.MEDIUM_INT,
          gl.HIGH_INT,
        ];
        var precisionParts = [];
        for (var i = 0; i < shaderTypes.length; i++) {
          for (var j = 0; j < precisionTypes.length; j++) {
            var fmt = gl.getShaderPrecisionFormat(
              shaderTypes[i],
              precisionTypes[j],
            );
            if (fmt) {
              precisionParts.push(
                fmt.rangeMin + "," + fmt.rangeMax + "," + fmt.precision,
              );
            }
          }
        }
        s.webglShaderPrecision = precisionParts.join(";");

        // Release the WebGL context to free the GPU resource slot
        var loseCtx = gl.getExtension("WEBGL_lose_context");
        if (loseCtx) loseCtx.loseContext();
      }, null);

      // ── Canvas 2D — Font Detection + Rendering Fingerprint ───────────────
      // A single <canvas> and 2D context is created for both operations.
      // Font detection uses measureText() width comparisons (non-destructive),
      // then the canvas is used for a visual rendering whose toDataURL() is
      // hashed.

      s.fonts = "";
      s.canvasHash = "";

      safe(function () {
        var c = document.createElement("canvas");
        c.width = 280;
        c.height = 60;
        var ctx = c.getContext("2d");
        if (!ctx) return;

        // ── Font detection ──────────────────────────────────────────────
        // For each test font, render the test string with the test font
        // falling back to each of the 3 generic families.  If the measured
        // width differs from the generic family alone, the font is installed.
        var baseWidths = {};
        for (var i = 0; i < BASE_FONTS.length; i++) {
          ctx.font = "72px " + BASE_FONTS[i];
          baseWidths[BASE_FONTS[i]] = ctx.measureText(FONT_TEST_STRING).width;
        }

        var detected = [];
        for (var j = 0; j < TEST_FONTS.length; j++) {
          for (var k = 0; k < BASE_FONTS.length; k++) {
            ctx.font = '72px "' + TEST_FONTS[j] + '",' + BASE_FONTS[k];
            if (
              ctx.measureText(FONT_TEST_STRING).width !==
              baseWidths[BASE_FONTS[k]]
            ) {
              detected.push(TEST_FONTS[j]);
              break;
            }
          }
        }
        s.fonts = detected.join(",");

        // ── Canvas rendering fingerprint ────────────────────────────────
        // Text and shape rendering on <canvas> produces pixel-level
        // differences driven by the GPU, OS font rasteriser, and
        // anti-aliasing engine.  We hash the data URL for compactness.
        ctx.clearRect(0, 0, c.width, c.height);

        // Gradient background — exercises colour interpolation paths
        var grad = ctx.createLinearGradient(0, 0, c.width, 0);
        grad.addColorStop(0, "#f64f59");
        grad.addColorStop(0.5, "#c471ed");
        grad.addColorStop(1, "#12c2e9");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, c.width, c.height);

        // Primary text — sans-serif rendering differs by OS
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Arial, Helvetica, sans-serif";
        ctx.fillText("Cwm fjord bank glyphs vext quiz \u2665", 8, 36);

        // Secondary text — monospace + special Unicode characters
        ctx.font = '12px "Courier New", Courier, monospace';
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillText("\u0CA0_\u0CA0  The quick brown fox jumps!", 8, 54);

        // Ellipse — arc/curve rendering differs subtly across GPUs
        ctx.beginPath();
        ctx.ellipse(260, 30, 14, 22, Math.PI / 6, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        s.canvasHash = fnv1a32(c.toDataURL());
      }, null);

      // ── Math Fingerprint ─────────────────────────────────────────────────
      // Subtle differences in IEEE 754 floating-point results between
      // JS engines and underlying libm implementations.  These values are
      // computed at maximum precision and concatenated.
      s.mathFingerprint = safe(function () {
        return [
          Math.acos(0.123456789015),
          Math.acosh(1e200),
          Math.atan(2),
          Math.atanh(0.5),
          Math.cbrt(Math.PI),
          Math.cos(21 * Math.LN2),
          Math.expm1(1),
          Math.log1p(Math.PI),
          Math.sin(Math.PI),
          Math.sqrt(2),
          Math.tan(Math.PI / 6),
        ].join(",");
      }, "");

      // ── Browser Feature Flags ────────────────────────────────────────────
      // Individually low-entropy, but collectively help distinguish browser
      // families, versions, and extension configurations.
      s.hasWorker = safe(function () {
        return typeof Worker !== "undefined" ? 1 : 0;
      }, 0);
      s.hasSharedWorker = safe(function () {
        return typeof SharedWorker !== "undefined" ? 1 : 0;
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
      s.hasIndexedDB = safe(function () {
        return typeof indexedDB !== "undefined" ? 1 : 0;
      }, 0);
      s.hasLocalStorage = safe(function () {
        return typeof localStorage !== "undefined" ? 1 : 0;
      }, 0);
      s.hasSessionStorage = safe(function () {
        return typeof sessionStorage !== "undefined" ? 1 : 0;
      }, 0);

      // ── Done ─────────────────────────────────────────────────────────────
      _signalsCache = s;
      return s;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Returns the raw fingerprint signals as a plain object.
     * The returned object is a shallow copy of the internal cache, so
     * mutating it will not affect subsequent calls.
     *
     * @returns {Object}
     */
    function getFingerprint() {
      return Object.assign({}, collectSignals());
    }

    /**
     * Returns a deterministic SHA-256 fingerprint token (64 hex chars).
     *
     * Pipeline:
     *   1. Collect all signals (cached after first call)
     *   2. Serialize with recursively sorted keys for cross-engine determinism
     *   3. Hash the string with SHA-256 via the native Web Crypto API
     *
     * Falls back to FNV-1a 64-bit (16 hex chars) in environments where
     * crypto.subtle is unavailable (non-HTTPS pages, older browsers).
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

      return fnv1a64(payload);
    }

    /**
     * Synchronous variant using FNV-1a 64-bit (16 hex chars).
     *
     * Use this only when you cannot await the async version.
     * The output is deterministic but has a smaller hash space than SHA-256,
     * so collision probability is higher for very large user bases.
     * Birthday bound ≈ 4.3 × 10⁹ (vs ~65 K for 32-bit).
     *
     * @returns {string}
     */
    function getFingerprintTokenSync() {
      return fnv1a64(stableStringify(collectSignals()));
    }

    /**
     * Clear the internal signals cache.
     * The next call to any public method will trigger a fresh collection.
     * Useful after significant environment changes (e.g. hot-plugging a
     * monitor) or in long-lived SPAs where a periodic refresh is desired.
     */
    function clearCache() {
      _signalsCache = null;
    }

    // ─── Exports ──────────────────────────────────────────────────────────────

    return {
      /** Library version — matches the _v field embedded in every fingerprint. */
      VERSION: VERSION,

      /** Returns a shallow copy of the raw signals object. */
      getFingerprint: getFingerprint,

      /** Returns a Promise<string> — SHA-256 hex (64 chars) or FNV-1a 64-bit fallback (16 chars). */
      getFingerprintToken: getFingerprintToken,

      /** Returns a string — FNV-1a 64-bit hex (16 chars), always synchronous. */
      getFingerprintTokenSync: getFingerprintTokenSync,

      /** Clears the internal cache so the next call re-collects all signals. */
      clearCache: clearCache,
    };
  },
);
