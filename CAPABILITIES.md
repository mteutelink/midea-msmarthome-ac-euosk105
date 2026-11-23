# Capability and state preview

This branch distinguishes supported, unsupported and unknown advertised functions.
Existing capability getters keep their legacy defaults; use getSupport or
getReportedValue for support decisions. Missing TLVs are unknown.

```ts
const caps = await new GetCapabilitiesCommand(device).execute();
console.table(caps.getSupportSummary());
const snapshot = caps.toSnapshot();
const restored = DeviceCapabilities.fromSnapshot(snapshot);
```

Capability snapshots preserve raw unknown TLVs. Partial updates preserve previously
reported fields; explicit updates replace them. Malformed pages are rejected before
changing capability state. Follow Me/defrost/outdoor fan support remains unknown if
no verified B5 advertisement exists, even when a state response contains related data.

Recognized extensions include iECO by mode and generation, ionisation, JetCool,
Outdoor Silent, fixed louver angles, fan presets/custom speeds, energy formats,
filter reminders, rate selection, fresh air, cascade, breezeless and auxiliary modes.
They are not present on every model.

## State access

See [STATE_ACCESS.md](STATE_ACCESS.md) for the full read/write audit, supported
property APIs and examples. The branch now includes property writes/read-back,
basic state additions, an all-states snapshot, energy/group-5 telemetry,
display toggle, Follow Me temperature reports and command serialization.
The Homey preview does not yet expose the new functions as buttons or Flow cards.

## Validation

```sh
npm install
npm run test:capabilities
npm run test:states
```

25 library fixture/protocol tests pass. State tests inspect decrypted command
packets, actual read-back, sensor decoding, missing values and concurrent requests.
No real air conditioner was controlled during development. Live model/firmware
verification is still needed, including energy units and optional command support.
This is an unpublished prerelease; prepare builds dist for Git dependencies.

Primary references:
- https://github.com/mill1000/midea-msmart/blob/master/msmart/device/AC/command.py
- https://github.com/midea-lan/midea-local/blob/main/midealocal/devices/ac/message.py
