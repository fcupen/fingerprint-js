# Browser Fingerprint Library

This library provides a simple way to gather fingerprint details from a web browser. It retrieves various properties related to the browser and environment and returns them as an object or a token.

## Features

- Retrieves browser properties such as `appCodeName`, `appName`, `appVersion`, `language`, `platform`, `userAgent`, `product`, and `productSub`.
- Retrieves location properties such as `host`.
- Retrieves the timezone of the user's system.

## Installation

You can include this library in your project by directly adding the provided code snippet into your JavaScript files or by linking to it externally.

```html
<script src="path/to/fingerprint-library.js"></script>
```

## Usage

### Object Format

```javascript
const fingerprint = getFingerprint();
console.log(fingerprint);
```

### Token Format

```javascript
const fingerprintToken = getFingerprintToken();
console.log(fingerprintToken);
```

### Example Output

```json
{
    "appCodeName": "Mozilla",
    "appName": "Netscape",
    "appVersion": "5.0",
    "language": "en-US",
    "platform": "MacIntel",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
    "product": "Gecko",
    "productSub": "20030107",
    "host": "www.example.com",
    "timezone": "America/New_York"
}
```

## License

This library is provided under the [MIT License](LICENSE).