# Capability discovery preview

This branch adds reported support metadata to the existing capability decoder.
It does not add new protocol commands, automatic IP recovery, or transport patches.

## API

```ts
const caps = await new GetCapabilitiesCommand(device).execute();
caps.getSupport('heatMode'); // 'supported' | 'unsupported' | 'unknown'
caps.getReportedValue('minTempCool'); // number | undefined
const snapshot = caps.toSnapshot();
const restored = DeviceCapabilities.fromSnapshot(snapshot);
const merged = restored.merge(caps);
```

Existing boolean/number getters retain their defaults for compatibility.
Use getSupport/getReportedValue when deciding whether a function is available.
An absent TLV is unknown, not an explicit unsupported response.
Unrecognized TLVs are preserved as raw identifier/value pairs in snapshots.
A complete TLV page is validated before changing capability state.
Six-byte temperature entries do not report half-degree support; this remains unknown.

Snapshots contain appliance capability data, not credentials. Missing values in a
partial update do not erase prior information; explicitly reported values replace it.

## Test

```sh
npm install
npm run test:capabilities
```

Fixtures test missing/false support, cool-only and vertical-only devices, partial
and paginated responses, raw unknown codes, snapshots and malformed pages.
Live device validation is still required. This is an unpublished prerelease.
The prepare script builds dist when this branch is installed as a Git dependency.

## Follow-up work

Audit the existing capability mappings against real device responses. Then add
validated transport fixes, energy decoders and individual extra protocol commands.
Do not infer iECO support from specialEco alone, nor fixed louver positioning from
swing support. Those functions are not enabled by this preview.
