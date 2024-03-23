// Function to get fingerprint details
function _data() {
    // Accessing browser navigator object
    const navigator = window.navigator;

    // Accessing browser location object
    const location = window.location;

    // Object to store fingerprint details
    const fingerprint = {
        // Browser properties
        appCodeName: navigator.appCodeName ?? '',
        appName: navigator.appName ?? '',
        appVersion: navigator.appVersion ?? '',
        language: navigator.language ?? '',
        platform: navigator.platform ?? '',
        userAgent: navigator.userAgent ?? '',
        product: navigator.product ?? '',
        productSub: navigator.productSub ?? '',

        // Location properties
        host: location.host ?? '',

        // Timezone
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    };

    return fingerprint;
}

function getFingerprint() {
    return _data()
}

function getFingerprintToken() {
    return btoa(JSON.stringify(_data()))
}