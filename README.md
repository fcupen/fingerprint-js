# BrowserFingerprint v2.0.0

A lightweight, dependency-free browser fingerprinting library that generates **deterministic, collision-resistant tokens**. The same browser and hardware environment always produces the same token.

---

## What's New in v2.0.0

| Area | v1 | v2 |
|---|---|---|
| Token algorithm | `btoa` (Base64, reversible) | SHA-256 via Web Crypto API (irreversible) |
| Signals | 9 (5 deprecated/useless) | 20+ (high-entropy, hardware-level) |
| Error handling | None | `safe()` wrapper on every signal |
| Module support | Global scope only | UMD (script tag + CommonJS) |
| API | Sync only | Async (SHA-256) + Sync fallback (FNV-1a) |
| Canvas fingerprint | ❌ | ✅ |
| WebGL GPU info | ❌ | ✅ |
| Hardware signals | ❌ | ✅ CPU cores, RAM, touch points, pixel ratio |
| Key ordering | Insertion order (non-deterministic) | Sorted keys (guaranteed determinism) |
| Schema version | ❌ | ✅ `_v` field for migration tracking |

---

## Features

- **Deterministic** — same device + browser = same token, every time.
- **High-entropy signals** — canvas rendering, WebGL GPU, screen, hardware, and more.
- **SHA-256 token** — 64-char hex string via the native Web Crypto API.
- **Synchronous fallback** — FNV-1a hash when async is not an option.
- **Zero dependencies** — pure browser APIs, no external packages.
- **Error-safe** — every signal is wrapped in a `try/catch`; a single blocked API never breaks the whole fingerprint.
- **UMD module** — works as a `<script>` tag or `require()`'d in CommonJS environments.

---

## Installation

### Via `<script>` tag

```html
<script src="path/to/fingerprint.js"></script>
<script>
  BrowserFingerprint.getFingerprintToken().then(token => console.log(token));
</script>
```

### Via CommonJS / Node-compatible bundler

```js
const BrowserFingerprint = require('./fingerprint');
```

> **Note:** This library requires a browser environment (`window`, `document`, `crypto`). It will not produce meaningful results in server-side (Node.js/SSR) contexts.

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
// → "a3f1c9e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8"
```

### Get a synchronous token (fallback)

```js
const token = BrowserFingerprint.getFingerprintTokenSync();
console.log(token);
// → "3d7a2f1b"
```

> The synchronous token uses FNV-1a (32-bit, 8 hex chars). It is weaker than SHA-256 but useful when you cannot use `async/await`.

---

## API Reference

### `BrowserFingerprint.getFingerprint()` → `Object`

Returns a plain object containing all collected signals. Useful for debugging, logging, or building custom logic on top of the raw data.

### `BrowserFingerprint.getFingerprintToken()` → `Promise<string>`

Returns a **64-char hex SHA-256 hash** of the serialized signals. Uses the native `crypto.subtle` Web Crypto API. Falls back to FNV-1a if `crypto.subtle` is unavailable.

### `BrowserFingerprint.getFingerprintTokenSync()` → `string`

Returns an **8-char hex FNV-1a hash** synchronously. Always available, but provides weaker collision resistance than the async SHA-256 variant.

### `BrowserFingerprint.VERSION` → `string`

The current library version string (e.g. `"2.0.0"`).

---

## Signals Collected

| Signal | Source | Entropy |
|---|---|---|
| `userAgent` | `navigator.userAgent` | Medium |
| `language` | `navigator.language` | Low |
| `languages` | `navigator.languages` | Low–Medium |
| `platform` | `navigator.platform` | Low |
| `hardwareConcurrency` | `navigator.hardwareConcurrency` | Medium |
| `deviceMemory` | `navigator.deviceMemory` | Low–Medium |
| `maxTouchPoints` | `navigator.maxTouchPoints` | Low |
| `cookieEnabled` | `navigator.cookieEnabled` | Low |
| `doNotTrack` | `navigator.doNotTrack` | Low |
| `pdfViewerEnabled` | `navigator.pdfViewerEnabled` | Low |
| `uaBrands` | `navigator.userAgentData.brands` | Medium (Chromium only) |
| `uaMobile` | `navigator.userAgentData.mobile` | Low |
| `uaPlatform` | `navigator.userAgentData.platform` | Low |
| `screenWidth` / `screenHeight` | `screen.width` / `screen.height` | Medium |
| `colorDepth` | `screen.colorDepth` | Low |
| `pixelRatio` | `window.devicePixelRatio` | Low–Medium |
| `timezone` | `Intl.DateTimeFormat` | Medium |
| `timezoneOffset` | `Date.getTimezoneOffset()` | Low |
| `webglVendor` | WebGL `UNMASKED_VENDOR_WEBGL` | **High** |
| `webglRenderer` | WebGL `UNMASKED_RENDERER_WEBGL` | **High** |
| `canvasHash` | Canvas 2D rendering (FNV-1a hashed) | **High** |
| Feature flags | Worker, WebGL, IndexedDB, Storage | Low |

---

## Example Output

### `getFingerprint()`

```json
{
  "_v": "2.0.0",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...",
  "language": "en-US",
  "languages": "en-US,en",
  "platform": "Win32",
  "hardwareConcurrency": 12,
  "deviceMemory": 8,
  "maxTouchPoints": 0,
  "cookieEnabled": 1,
  "doNotTrack": null,
  "pdfViewerEnabled": 1,
  "uaBrands": "Chromium/124,Google Chrome/124,Not-A.Brand/99",
  "uaMobile": 0,
  "uaPlatform": "Windows",
  "screenWidth": 1920,
  "screenHeight": 1080,
  "colorDepth": 24,
  "pixelRatio": 1,
  "timezone": "America/New_York",
  "timezoneOffset": 300,
  "webglVendor": "Google Inc. (NVIDIA)",
  "webglRenderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)",
  "canvasHash": "a3f1c9e2",
  "hasWorker": 1,
  "hasWebGL": 1,
  "hasIndexedDB": 1,
  "hasLocalStorage": 1,
  "hasSessionStorage": 1
}
```

### `getFingerprintToken()`

```
a3f1c9e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8
```

---

## Security & Privacy Considerations

- **This library is intended for fraud detection, session integrity, and bot mitigation** — not for tracking users across sites without consent.
- The fingerprint is **not 100% unique**. Multiple users on identical hardware/browser configurations may share the same token. Treat it as a strong hint, not a guaranteed identifier.
- Canvas and WebGL fingerprinting can be **blocked or randomized** by privacy-focused browsers (Firefox with `privacy.resistFingerprinting`, Brave, Tor Browser). The library handles this gracefully — those signals will simply be absent.
- The `_v` version field means that **upgrading the library may change tokens** for existing users, since the signal set may change. Store the version alongside the token if long-term stability is required.
- Always comply with applicable privacy laws (GDPR, CCPA, etc.) when using fingerprinting techniques.

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Core signals | ✅ 60+ | ✅ 57+ | ✅ 12+ | ✅ 79+ |
| `crypto.subtle` (SHA-256) | ✅ 37+ | ✅ 34+ | ✅ 10.1+ | ✅ 12+ |
| WebGL `WEBGL_debug_renderer_info` | ✅ | ✅ | ✅ | ✅ |
| `userAgentData` (Client Hints) | ✅ 89+ | ❌ | ❌ | ✅ 89+ |
| `deviceMemory` | ✅ 63+ | ❌ | ❌ | ✅ 79+ |

> In browsers that lack `crypto.subtle`, `getFingerprintToken()` automatically falls back to the synchronous FNV-1a hash.

---

## License

Released under the [MIT License](LICENSE).