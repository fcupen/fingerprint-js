# BrowserFingerprint v2.1.0

A lightweight, dependency-free browser fingerprinting library that generates **deterministic, collision-resistant tokens**. The same browser and hardware environment always produces the same token.

---

## What's New in v2.1.0

| Area | v1 | v2.1 |
|---|---|---|
| Token algorithm | `btoa` (Base64, reversible) | SHA-256 via Web Crypto API (irreversible) |
| Sync token | N/A | FNV-1a 64-bit (16 hex chars, birthday bound ~4.3 billion) |
| Signals | 9 (5 deprecated/useless) | 35+ (high-entropy, hardware-level) |
| Error handling | None | `safe()` wrapper on every signal |
| Module support | Global scope only | UMD (script tag + CommonJS + AMD) |
| API | Sync only | Async (SHA-256) + Sync fallback (FNV-1a) |
| Canvas fingerprint | ❌ | ✅ |
| WebGL GPU info | ❌ | ✅ vendor, renderer, shader precision, extensions |
| Font detection | ❌ | ✅ 24-font probe via `measureText` |
| Math fingerprint | ❌ | ✅ engine-level floating-point differences |
| Hardware signals | ❌ | ✅ CPU cores, RAM, touch points |
| Key ordering | Insertion order (non-deterministic) | Recursive sorted keys (guaranteed determinism) |
| Schema version | ❌ | ✅ `_v` field for migration tracking |
| Signal caching | ❌ | ✅ single collection per session, `clearCache()` to reset |
| WebGL cleanup | ❌ | ✅ context released via `WEBGL_lose_context` |
| Screen rotation | ❌ breaks fingerprint | ✅ orientation-invariant via `max/min` normalization |

---

## Features

- **Deterministic** — same device + browser = same token, every time.
- **High-entropy signals** — canvas rendering, WebGL GPU, font detection, math engine, and more.
- **SHA-256 token** — 64-char hex string via the native Web Crypto API (async).
- **FNV-1a 64-bit sync fallback** — 16-char hex string when `async/await` is not an option.
- **Zero dependencies** — pure browser APIs, no external packages.
- **Error-safe** — every signal is wrapped in a `try/catch`; a single blocked API never breaks the whole fingerprint.
- **UMD module** — works as a `<script>` tag, `require()` in CommonJS, or `define()` in AMD.
- **Rotation-invariant** — screen dimensions are normalized with `Math.max/min` so mobile orientation changes don't alter the fingerprint.
- **Cached** — signals are collected once and reused within the same page session; WebGL contexts are released after collection.

---

## Installation

### Via `<script>` tag

```html
<script src="path/to/index.js"></script>
<script>
  // Async (recommended)
  BrowserFingerprint.getFingerprintToken().then(function (token) {
    console.log(token);
  });

  // Sync fallback
  console.log(BrowserFingerprint.getFingerprintTokenSync());
</script>
```

### Via CommonJS / Node-compatible bundler

```js
const BrowserFingerprint = require('./index');
```

### Via AMD (RequireJS)

```js
require(['path/to/index'], function (BrowserFingerprint) {
  // ...
});
```

> **Note:** This library requires a browser environment (`window`, `document`, `navigator`). In non-browser contexts (Node.js, SSR, Web Workers), it returns a minimal object with `{ _v, _env: "non-browser" }` instead of crashing.

---

## Usage

### Get the raw signals object

```js
const signals = BrowserFingerprint.getFingerprint();
console.log(signals);
```

### Get a SHA-256 token (recommended)

```js
const token = await BrowserFingerprint.getFingerprintToken();
console.log(token);
// → "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

### Get a synchronous token (fallback)

```js
const token = BrowserFingerprint.getFingerprintTokenSync();
console.log(token);
// → "a1b2c3d4e5f6a7b8"
```

> The synchronous token uses FNV-1a 64-bit (16 hex chars). It has a birthday-bound collision threshold of ~4.3 billion, which is sufficient for most production use cases. For maximum collision resistance, prefer the async SHA-256 variant.

### Clear the signal cache

```js
// Force fresh signal collection on the next call
BrowserFingerprint.clearCache();
```

---

## API Reference

| Method | Returns | Description |
|---|---|---|
| `getFingerprint()` | `Object` | Returns a shallow copy of the collected signals object. |
| `getFingerprintToken()` | `Promise<string>` | SHA-256 hex string (64 chars). Falls back to FNV-1a 64-bit if `crypto.subtle` is unavailable. |
| `getFingerprintTokenSync()` | `string` | FNV-1a 64-bit hex string (16 chars). Always synchronous. |
| `clearCache()` | `void` | Discards the cached signals so the next call re-collects everything. |
| `VERSION` | `string` | Library version (e.g. `"2.1.0"`). |

---

## Signals Collected

### Navigator

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `userAgent` | `navigator.userAgent` | Medium | Changes on browser update |
| `language` | `navigator.language` | Low | High |
| `languages` | `navigator.languages` | Low–Medium | User can reorder |
| `platform` | `navigator.platform` | Low | High (deprecated but present) |
| `vendor` | `navigator.vendor` | Medium | High — distinguishes Chrome/Firefox/Safari |
| `hardwareConcurrency` | `navigator.hardwareConcurrency` | Medium | High |
| `deviceMemory` | `navigator.deviceMemory` | Low–Medium | High (Chromium only) |
| `maxTouchPoints` | `navigator.maxTouchPoints` | Low | High |
| `cookieEnabled` | `navigator.cookieEnabled` | Low | User can toggle |
| `pdfViewerEnabled` | `navigator.pdfViewerEnabled` | Low | High (Chromium 94+) |
| `webdriver` | `navigator.webdriver` | Low | High — detects automation (Selenium, Puppeteer) |

### User-Agent Client Hints (Chromium only)

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `uaBrands` | `navigator.userAgentData.brands` | Medium | Changes on browser update |
| `uaMobile` | `navigator.userAgentData.mobile` | Low | High |
| `uaPlatform` | `navigator.userAgentData.platform` | Low | High |

> These keys are **always present** in the signals object (with empty/default values on non-Chromium browsers) to ensure a consistent JSON schema across all browsers.

### Screen & Display

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `screenMax` | `Math.max(screen.width, screen.height)` | Medium | High (rotation-invariant) |
| `screenMin` | `Math.min(screen.width, screen.height)` | Medium | High (rotation-invariant) |
| `colorDepth` | `screen.colorDepth` | Low | High |
| `screenAvailMax` | `Math.max(screen.availWidth, screen.availHeight)` | Medium | High (reveals taskbar/dock) |
| `screenAvailMin` | `Math.min(screen.availWidth, screen.availHeight)` | Medium | High |

### Timezone & Locale

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `timezone` | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Medium | High (IANA name, DST-safe) |
| `locale` | `Intl.DateTimeFormat().resolvedOptions().locale` | Medium | High |

> **Note:** `timezoneOffset` (from `Date.getTimezoneOffset()`) was intentionally excluded because it changes with Daylight Saving Time transitions, breaking determinism twice per year. The IANA timezone name is stable and sufficient.

### WebGL (GPU)

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `webglVendor` | `UNMASKED_VENDOR_WEBGL` | **High** | High |
| `webglRenderer` | `UNMASKED_RENDERER_WEBGL` | **High** | High (changes on driver update) |
| `webglVersion` | `gl.VERSION` | Low | High |
| `glslVersion` | `gl.SHADING_LANGUAGE_VERSION` | Low | High |
| `webglMaxTextureSize` | `gl.MAX_TEXTURE_SIZE` | Medium | High |
| `webglMaxViewportDims` | `gl.MAX_VIEWPORT_DIMS` | Medium | High |
| `webglMaxRenderbufferSize` | `gl.MAX_RENDERBUFFER_SIZE` | Medium | High |
| `webglMaxVertexAttribs` | `gl.MAX_VERTEX_ATTRIBS` | Low | High |
| `webglMaxVaryingVectors` | `gl.MAX_VARYING_VECTORS` | Low | High |
| `webglMaxFragmentUniformVectors` | `gl.MAX_FRAGMENT_UNIFORM_VECTORS` | Low | High |
| `webglAntialiasing` | `gl.getContextAttributes().antialias` | Low | High |
| `webglExtensionsHash` | `gl.getSupportedExtensions()` (FNV-1a hashed) | **High** | Medium–High |
| `webglShaderPrecision` | `gl.getShaderPrecisionFormat()` | **High** | High — varies per GPU |

> A single WebGL context is created (preferring WebGL2), all parameters are extracted, and the context is immediately released via `WEBGL_lose_context` to avoid exhausting the browser's context limit (typically 8–16).

### Canvas 2D

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `fonts` | `measureText()` width comparison across 24 fonts | **Very High** | High — reveals installed fonts per OS |
| `canvasHash` | Canvas 2D rendering (gradient + text + ellipse), FNV-1a hashed | **High** | High — driven by GPU, OS font engine, anti-aliasing |

> Font detection probes 24 carefully chosen fonts against 3 base families (`monospace`, `sans-serif`, `serif`). The detected set distinguishes Windows, macOS, and Linux configurations with high accuracy.

### Math Engine

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `mathFingerprint` | `Math.acos`, `Math.acosh`, `Math.atan`, `Math.atanh`, `Math.cbrt`, `Math.cos`, `Math.expm1`, `Math.log1p`, `Math.sin`, `Math.sqrt`, `Math.tan` | Medium–High | High — varies between JS engines (V8 vs SpiderMonkey vs JSC) |

### Browser Feature Flags

| Signal | Source | Entropy | Stability |
|---|---|---|---|
| `hasWebGL` | WebGL context creation | Low | High |
| `hasWebGL2` | WebGL2 context check | Low | High |
| `hasWorker` | `typeof Worker` | Low | High |
| `hasSharedWorker` | `typeof SharedWorker` | Low | High |
| `hasWasm` | `typeof WebAssembly` | Low | High |
| `hasNotifications` | `typeof Notification` | Low | High |
| `hasServiceWorker` | `navigator.serviceWorker` | Low | High |
| `hasIndexedDB` | `typeof indexedDB` | Low | High |
| `hasLocalStorage` | `typeof localStorage` | Low | High |
| `hasSessionStorage` | `typeof sessionStorage` | Low | High |

---

## Example Output

### `getFingerprint()`

```json
{
  "_v": "2.1.0",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...",
  "language": "en-US",
  "languages": "en-US,en",
  "platform": "Win32",
  "vendor": "Google Inc.",
  "hardwareConcurrency": 12,
  "deviceMemory": 8,
  "maxTouchPoints": 0,
  "cookieEnabled": 1,
  "pdfViewerEnabled": 1,
  "webdriver": 0,
  "uaBrands": "Chromium/124,Google Chrome/124,Not-A.Brand/99",
  "uaMobile": 0,
  "uaPlatform": "Windows",
  "screenMax": 1920,
  "screenMin": 1080,
  "colorDepth": 24,
  "screenAvailMax": 1920,
  "screenAvailMin": 1032,
  "timezone": "America/New_York",
  "locale": "en-US",
  "hasWebGL": 1,
  "hasWebGL2": 1,
  "webglVendor": "Google Inc. (NVIDIA)",
  "webglRenderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)",
  "webglVersion": "WebGL 2.0 (OpenGL ES 3.0 Chromium)",
  "glslVersion": "WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)",
  "webglMaxTextureSize": 16384,
  "webglMaxViewportDims": "32767x32767",
  "webglMaxRenderbufferSize": 16384,
  "webglMaxVertexAttribs": 16,
  "webglMaxVaryingVectors": 30,
  "webglMaxFragmentUniformVectors": 1024,
  "webglAntialiasing": 1,
  "webglExtensionsHash": "a3f1c9e2",
  "webglShaderPrecision": "127,127,23;127,127,23;127,127,23;...",
  "fonts": "Arial Black,Calibri,Cambria,Comic Sans MS,Consolas,Courier New,Georgia,Impact,Lucida Console,Palatino,Segoe UI,Tahoma,Times New Roman,Trebuchet MS,Verdana",
  "canvasHash": "b7d2e4f1",
  "mathFingerprint": "1.4474840516030247,461.2101657793691,...",
  "hasWorker": 1,
  "hasSharedWorker": 1,
  "hasWasm": 1,
  "hasNotifications": 1,
  "hasServiceWorker": 1,
  "hasIndexedDB": 1,
  "hasLocalStorage": 1,
  "hasSessionStorage": 1
}
```

### `getFingerprintToken()`

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### `getFingerprintTokenSync()`

```
a1b2c3d4e5f6a7b8
```

---

## Signals Intentionally Excluded

| Signal | Reason for exclusion |
|---|---|
| `timezoneOffset` | Changes with Daylight Saving Time — breaks determinism twice per year |
| `devicePixelRatio` | Changes with browser zoom level (`Ctrl+`/`Ctrl-`) — extremely unstable |
| `doNotTrack` | Deprecated (Firefox removed it); user can toggle freely |
| `screen.width` / `screen.height` (raw) | Swap on mobile rotation — replaced by `screenMax`/`screenMin` |
| `location.host` | Not a device signal; same for all users on a domain, different for same user across domains |
| `navigator.appCodeName` | Always `"Mozilla"` in all modern browsers — zero entropy |
| `navigator.appName` | Always `"Netscape"` — zero entropy |
| `navigator.product` | Always `"Gecko"` — zero entropy |
| `navigator.productSub` | Nearly always `"20030107"` or `"20100101"` — near-zero entropy |
| `navigator.appVersion` | Duplicates `userAgent` without the `"Mozilla/"` prefix |
| AudioContext rendering | Requires async rendering + user gesture in some browsers; too complex for marginal gain |
| `navigator.connection` | Network type changes constantly — anti-deterministic |

---

## Stability Guarantees

### What does NOT change the fingerprint

- ✅ Refreshing the page
- ✅ Rotating the device (portrait ↔ landscape)
- ✅ Changing the browser zoom level (`Ctrl+`/`Ctrl-`)
- ✅ Daylight Saving Time transitions
- ✅ Navigating to a different page / domain
- ✅ Calling `getFingerprint()` or `getFingerprintToken()` multiple times

### What DOES change the fingerprint

- ⚠️ Updating the browser (changes `userAgent`, possibly `uaBrands`)
- ⚠️ Updating GPU drivers (may change `webglRenderer`)
- ⚠️ Installing/removing fonts (changes `fonts` signal)
- ⚠️ Changing OS display scaling (changes `screenMax`/`screenMin`)
- ⚠️ Switching to a different physical monitor
- ⚠️ Upgrading the library (if the signal set changes — tracked via `_v`)

---

## Security & Privacy Considerations

- **Intended use cases**: fraud detection, session integrity, bot mitigation, and device recognition.
- **Not for cross-site tracking without consent.** Always comply with GDPR, CCPA, and applicable privacy laws.
- The fingerprint is **not 100% unique**. Users on identical hardware and browser configurations will share the same token. Treat it as a strong probabilistic hint, not a guaranteed identifier.
- Canvas, WebGL, and font fingerprinting can be **blocked or randomized** by privacy-focused browsers (Brave, Tor Browser, Firefox with `privacy.resistFingerprinting`). The library handles this gracefully — those signals degrade to their default values.
- The `_v` version field means that **upgrading the library may change tokens**. Store the version alongside the token if long-term stability across library upgrades is required.
- The `webdriver` signal detects browser automation tools (Selenium, Puppeteer, Playwright). This is useful for bot detection but can be spoofed by sophisticated attackers.

---

## Non-Browser Environments

When loaded in Node.js, SSR frameworks, Web Workers, or test runners like Jest where `window` or `document` are not available, the library **does not crash**. Instead, it returns a minimal object:

```json
{
  "_v": "2.1.0",
  "_env": "non-browser"
}
```

The resulting token will be the same for all non-browser environments. This allows the library to be safely imported in universal/isomorphic codebases without conditional requires.

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Core signals | ✅ 60+ | ✅ 57+ | ✅ 12+ | ✅ 79+ |
| `crypto.subtle` (SHA-256) | ✅ 37+ | ✅ 34+ | ✅ 10.1+ | ✅ 12+ |
| WebGL `WEBGL_debug_renderer_info` | ✅ | ⚠️ restricted | ✅ | ✅ |
| `userAgentData` (Client Hints) | ✅ 89+ | ❌ | ❌ | ✅ 89+ |
| `deviceMemory` | ✅ 63+ | ❌ | ❌ | ✅ 79+ |
| `pdfViewerEnabled` | ✅ 94+ | ❌ | ❌ | ✅ 94+ |
| Canvas `ellipse()` | ✅ 31+ | ✅ 48+ | ✅ 9+ | ✅ 13+ |
| `Math.imul` (FNV-1a hash) | ✅ 28+ | ✅ 20+ | ✅ 7+ | ✅ 12+ |

> In browsers that lack `crypto.subtle` (e.g. non-HTTPS pages), `getFingerprintToken()` automatically falls back to the synchronous FNV-1a 64-bit hash.

> **Important:** The library uses `async/await` syntax (ES2017+). Browsers that cannot parse this syntax will fail to load the entire script. If you need ES5 support, transpile with Babel or a similar tool.

---

## Caching Behavior

Signals are collected **once** on the first call to any public method and cached for the lifetime of the page. This:

- Prevents WebGL context leaks on repeated calls
- Ensures the fingerprint remains stable within a session even if a volatile signal changes
- Eliminates redundant canvas rendering and font measurement

Call `BrowserFingerprint.clearCache()` to force a fresh collection on the next API call.

---

## License

Released under the [MIT License](LICENSE).