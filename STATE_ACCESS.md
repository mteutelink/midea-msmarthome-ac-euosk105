# AC state read/write audit

This preview extends the library API. It does not add the new controls to the Homey UI.
Capabilities describe support; the commands below read or change current values.
No write was performed on a real air conditioner during development.

| Function | Read | Write | Notes |
|---|---|---|---|
| Power, mode, target temperature, fan speed, swing | GetStateCommand | SetStateCommand | Mode/range support differs by appliance. |
| Turbo, ordinary ECO, sleep, frost protection, Fahrenheit | GetStateCommand | SetStateCommand | Response and SET bit layouts differ for ECO. |
| Follow Me, ionisation, auxiliary heating | GetStateCommand | SetStateCommand | Unknown B5 support remains unknown; state response may report a bit. |
| Follow Me external temperature | Not a sensor read-back | SetFollowMeTemperatureCommand | Reports a measurement; caller schedules repeats if needed. |
| Fixed louver angles | GetPropertiesCommand | SetPropertiesCommand | Separate from swing capability. |
| iECO | GetPropertiesCommand | SetPropertiesCommand | IECO returns {enabled, number}; SET uses the generation number. |
| JetCool, Outdoor Silent, Self Clean | GetPropertiesCommand | SetPropertiesCommand | Only query/enable on compatible appliances. |
| Breezeless, indirect wind, breeze control, direction, cascade | GetPropertiesCommand | SetPropertiesCommand | Different IDs and payloads; do not conflate them. |
| Fresh air fan speed, rate selection | GetPropertiesCommand | SetPropertiesCommand | Values/available gears depend on the appliance. |
| Persistent sound setting | GetPropertiesCommand | SetPropertiesCommand | SOUND is distinct from one-shot beep flags. |
| One-shot buzzer/beep | No reliable persistent state | BUZZER property or beepOn | Do not invent a readable boolean. |
| Display | GetStateCommand | ToggleDisplayCommand | Toggle only, not an idempotent absolute setter. |
| Indoor/outdoor temperature, filter alert, error code | GetStateCommand | No | Read-only measurements/status. |
| Energy, current-run energy and power | GetPowerUsageCommand | No | kWh, kWh, W; explicit BCD, binary, binary100, mixed or bcdEnergyBinaryPower format. |
| Humidity, defrost, outdoor fan speed | GetSensorStateCommand | No | Group-5 telemetry; actual hardware availability varies. |
| Humidity target | GetStateCommand | SetStateCommand | Only on hardware supporting humidity targets; 0..100 encoded. |
| Compressor/electrical/coil/fan/pump/run-hour telemetry | GetTelemetryCommand | No | Explicit model-dependent groups 0/1/2/3/5/7/11. |
| Power saving, natural wind, dry function, comfort mode | GetStateCommand | SetStateCommand | Standard C0/0x40 profile. |
| Filter reset | Filter alert only | SetStateCommand resetFilter option | Explicit service action, standard profile only. |
| BB subprotocol, alternate model status frames and advanced presets | Incomplete | Incomplete | See SOURCE_AUDIT.md for the remaining gaps. |

## Read all available states

```ts
const caps = await new GetCapabilitiesCommand(device).execute();
const snapshot = await new GetAllStatesCommand(device, caps).execute();
console.table(snapshot.values);
console.log(snapshot.errors);
```

Optional properties are read only when advertised. To deliberately investigate
unadvertised readable functions, pass {probeUnknown: true}; this may take time
on an appliance that does not reply. No probing writes are performed.
Unavailable optional readings are null or omitted, never fabricated false/zero.
Individual errors do not discard successful measurements. Legacy DeviceState
getters retain default values for compatibility: use toStateSnapshot() for
reported-only values.

## Change a property and inspect the real read-back

```ts
const properties = new Map<PROPERTY_ID, PropertyValue>([
    [PROPERTY_ID.OUT_SILENT, true],
    [PROPERTY_ID.IECO, {enabled: true, number: 8}],
]);
const actual = await new SetPropertiesCommand(device, properties, caps).execute();
console.log(actual.get(PROPERTY_ID.OUT_SILENT));
console.log(actual.get(PROPERTY_ID.IECO));
```

Choose the iECO generation actually advertised by the appliance; this example
uses ECOMaster generation 8, which is not supported by every model. A boolean
IECO input uses caps.iEcoNumber when available.

Get/SetProperties retain the existing Map-based API; the fixed sample frame is
replaced by actual encoded entries. Rejected and missing read-backs raise errors.
Reads and writes on a device share a command queue. Multi-property commands are
no longer truncated at 48 encrypted bytes. Frame size is validated.

## Validation and limits

Run npm run test:capabilities and npm run test:states.
Tests inspect decrypted output packets, state decoders, optional-error handling,
the command queue and read-back behaviour. They do not prove every OEM/firmware
implements these commands. Energy binary scaling follows the msmart reference;
validate counters and units on each appliance before relying on them.

Reference: https://github.com/mill1000/midea-msmart/blob/master/msmart/device/AC/command.py
(PropertyId, state/property/group decoders and query/control payloads).

## Model profiles and audit

See [SOURCE_AUDIT.md](SOURCE_AUDIT.md) for pinned Python/Homey references, tests and remaining gaps. The default state profile is standard. msmartAuxHeat explicitly selects the conflicting independent-auxiliary-heat bits; it cannot be combined with standard filter reset. Telemetry groups and energy formats are selected explicitly. This preview does not implement BB/model-specific alternate status protocols.
