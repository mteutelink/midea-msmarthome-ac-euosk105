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

## Extended advertised capabilities

The decoder now recognizes:
- iEcoMode, iEcoCool, iEcoHeat and the reported iEcoNumber generation
- anionMode, jetCool, outSilent, selfClean
- swingVerticalAngle and swingHorizontalAngle, separately from swing directions
- fanSilent, fanLow, fanMedium, fanHigh, fanAuto and fanCustom
- energyStats, energySetting, energyBcd (also extends legacy powerCal flags to values 4/5)
- filterReminder, filterCleanReminder, rateSelect2Level, rateSelect5Level
- freshAir, cascade, breezeless, breezeAwayDirection
- auxFanSpeedControl, auxHeatFanSpeedControl, auxHeatMode, auxMode

Newer HVAC mode combinations 4..15 and custom fan support are decoded too.
An absent field or zero-length TLV still means unknown.
Follow Me, defrostSensor and outdoorFanSpeedSensor are represented, but remain
unknown from B5 discovery: no verified advertisement mapping was identified.
Do not infer support from a false/zero operating-state value.

```ts
console.table(caps.getSupportSummary());
console.log(caps.getSupport('iEcoCool'));
console.log(caps.getSupport('outSilent'));
console.log(caps.getSupport('swingVerticalAngle'));
console.log(caps.getReportedValue('iEcoNumber'));
```

This extends discovery only. New get/set commands and Homey buttons are not included.
There is no claim to cover every Midea firmware or OEM-specific capability.
Thirteen library fixture tests cover both positive and negative declarations,
iECO variants, BCD/binary energy formats, fixed versus swinging louvers and snapshots.

Primary references:
- https://github.com/mill1000/midea-msmart/blob/master/msmart/device/AC/command.py
  (CapabilityId and CapabilitiesResponse; cross-checked during this change)
- https://github.com/midea-lan/midea-local/blob/main/midealocal/devices/ac/message.py
  (NewProtocolTags and B5 parsing)
