# browser-launcher
Spawns CloakBrowser/CFT, passes `--fingerprint-*` / `--proxy-server` / `--user-data-dir` / `--load-extension` flags, runs the local SOCKS5 bridge (remote DNS), probes proxy geo via ipapi.co, manages session-restore prefs and singleton locks, and tracks running profiles in a registry. Does NOT issue CDP commands — that's `cdp-driver`.

## Storage quota

`FingerprintConfig.storage_quota` and `--fingerprint-storage-quota` use bytes.
The default is `2_000_000_000` bytes (2 GB), passed as
`--fingerprint-storage-quota=2000000000` without a minimum override.
Only the UI converts between bytes and decimal MB (`1 MB = 1_000_000` bytes).
An unset or zero quota omits the flag and leaves the engine default in effect.
These native fingerprint flags apply to CloakBrowser, not CFT.
