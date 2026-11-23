# Midea AC library source audit — 23 November 2026

## Conclusion and scope

The library is substantially more complete for conventional 0xAC C0/0x40 and B0/B1/B5 protocols, but is **not complete for every Midea AC model or every protocol variant**. Do not publish this preview as universal support. An advertised capability is evidence of support, not proof that a command works on the installed firmware.

The review collected 97 selected source files from the ten projects below, including Python protocol implementations and Home Assistant entity layers, C++ UART references, and three Homey forks/feature branches. The complete retrieval inventory is in [AUDIT_SOURCES.json](AUDIT_SOURCES.json). This is a targeted protocol and integration review, not a claim that every line of every repository or every public fork has been audited. Home Assistant Core also contains other appliance types; those are outside this air-conditioner library.

No physical AC was controlled. Protocol tests use constructed frames and fake sockets/HTTP responses. These tests establish encoding, parsing and failure behaviour; they do not establish hardware compatibility.

## Source snapshots

| Project | Frozen commit | Role |
|---|---|---|
| [mill1000/midea-msmart](https://github.com/mill1000/midea-msmart/tree/1a92c14b84335d730db140a99242817e0ad93364) | `1a92c14b84335d730db140a99242817e0ad93364` | Python AC protocol, capabilities, properties, telemetry, LAN/cloud |
| [nbogojevic/midea-beautiful-air](https://github.com/nbogojevic/midea-beautiful-air/tree/4a8674496e2e110d4b27d6eb013727b3646f7512) | `4a8674496e2e110d4b27d6eb013727b3646f7512` | Python legacy AC protocol and LAN/cloud implementation |
| [mill1000/midea-ac-py](https://github.com/mill1000/midea-ac-py/tree/0cbaad9a84fcd9bfe9fd458c6588172d059f3fd5) | `0cbaad9a84fcd9bfe9fd458c6588172d059f3fd5` | Home Assistant wrapper around msmart |
| [midea-lan/midea-local](https://github.com/midea-lan/midea-local/tree/6fcfdaa75dfb736393c539e6c122c3cefca26e9e) | `6fcfdaa75dfb736393c539e6c122c3cefca26e9e` | Python AC alternate protocols, diagnostics, energy formats, model exceptions |
| [wuwentao/midea_ac_lan](https://github.com/wuwentao/midea_ac_lan/tree/fdff0c2a984ad373de9aa033fa4be6ea33d39ceb) | `fdff0c2a984ad373de9aa033fa4be6ea33d39ceb` | Home Assistant entities and model/configuration handling |
| [dudanov/MideaUART](https://github.com/dudanov/MideaUART/tree/eeea6c3e9b4474f067054592b435be1c4e466815) | `eeea6c3e9b4474f067054592b435be1c4e466815` | UART/C++ frame and AC capability/status references |
| [ftedv-de/nl.intyme.midea](https://github.com/ftedv-de/nl.intyme.midea/tree/122ada70bfca7a7900ef6e9b04468c5867a04888) | `122ada70bfca7a7900ef6e9b04468c5867a04888` | Homey fork, device/driver and library patch |
| [minguezdo/nl.intyme.midea](https://github.com/minguezdo/nl.intyme.midea/tree/287012d977b5660eab0a775fad70f90d83f65567) | `287012d977b5660eab0a775fad70f90d83f65567` | Homey fork, device/driver and library patch |
| [home-assistant/core](https://github.com/home-assistant/core/tree/b6d170e22714866fdd8a50f865013bed9648f606) | `b6d170e22714866fdd8a50f865013bed9648f606` | Midea integration Python files and dependency manifest |
| [itsklimov/nl.intyme.midea](https://github.com/itsklimov/nl.intyme.midea/tree/ea23e7928d2b1cc62684878759a8a515854eaad7) | `ea23e7928d2b1cc62684878759a8a515854eaad7` | Homey capability-discovery feature branch (PR 19 head) |

## Corrections in this audit

| Finding | Correction | Validation |
|---|---|---|
| 8370 encrypted packet length omitted the SHA-256 signature for already-aligned payloads | Always include 32 signature bytes, modulo-16 padding and 16-bit sequence wrap | Round-trips for 65 payload lengths, including aligned lengths |
| TCP data events assumed to contain complete responses | Incremental PacketStream for v2/v3, partial headers, fragmented and concatenated packets | Single-byte chunks, partial encrypted frames, concatenated frames |
| Data handler installed after write callback | Install data/error/close handlers before sending | Fake socket replies synchronously before callback |
| Recursive reconnect/retry paths could leave the outer Promise pending | Serial connection-level queue, direct awaited handshake and command | First v3 command without a pre-existing connection |
| Timeouts leaked handlers and could replay commands | Bounded connect/request timers, handler cleanup, socket destroy, no automatic command replay | Timeout/close/failure tests, one write per timed-out command |
| Inconsistent decode8370 return shape | Complete buffers always return Buffer[]; streaming API returns packets/incomplete separately | Complete/partial/multiple packets, signature corruption |
| Malformed handshake could continue after rejection | Validate ERROR, key/data length and SHA-256 before mutation | Failed handshakes leave the old key intact |
| Inner v2 packets were decrypted without checking signature | Check length, MD5 signature, appliance type and AA frame checksum | Corrupted inner signature/checksum rejected |
| Discovery used OR to test two-byte signatures and ignored all v2 devices | Exact headers, bounded field parsing, v2/v3 output, padded MAC, deduplication, two broadcast ports, UDP errors reject | Synthetic discovery datagrams; no real broadcast test |
| Logs exposed credentials, token/key pairs, encrypted password derivatives and decrypted transport data | Remove those debug payload logs from Security/cloud/Driver/LANConnection | Source inspection |
| Cloud HTTP requests were unbounded and login errors used wrong fields | Abort after 30s, HTTP status/code/errorCode/msg handling, explicit missing-field errors | Mock HTTP/API errors and missing metadata |
| JavaScript callers could not use exported const enums at runtime | Emit public connection/state/protocol enums | Runtime export tests |
| Display parsing compared the whole byte, including unrelated bits | Mask 0x70 before interpreting display status | State decoder regression coverage |
| Same state bit has conflicting meanings in Python references | Explicit standard/msmartAuxHeat profile; do not automatically use standard filter-reset bit for auxiliary heat | Decrypted SET payload assertions |

## Feature coverage

“Implemented” below means a library API and synthetic regression coverage, not validation on all hardware.

| Function/protocol | Read | Change | Status/qualification |
|---|---|---|---|
| Power, operating mode, target temperature, fan, swing | GetStateCommand | SetStateCommand | Conventional C0/0x40, validated ranges; per-device capability checks still matter |
| Turbo, ECO, sleep, frost protection, Fahrenheit | GetStateCommand | SetStateCommand | ECO response and SET bits differ |
| Follow Me, ionisation, auxiliary heating | GetStateCommand | SetStateCommand | Follow Me external measurement has a separate command |
| Power saving, natural wind, dry function, comfort mode | GetStateCommand | SetStateCommand | Added in audit; dry function differs from DRY operating mode |
| Smart eye vs independent auxiliary heating | Explicit state profile | Explicit state profile | standard maps smartEye; msmartAuxHeat maps independentAuxHeat. Cannot select reliably from B5 alone |
| Display | Masked C0 display bits | ToggleDisplayCommand | Toggle is not an idempotent absolute setter |
| Fixed angles, breeze controls, cascade, fresh air, rate selection | GetPropertiesCommand | SetPropertiesCommand | Only supported IDs/model layouts; BB fresh-air variant remains missing |
| iECO/ECOMaster, JetCool, outdoor silent, sound, self-clean | GetPropertiesCommand | SetPropertiesCommand | iECO generation retained; rejected/missing readback is an error |
| Buzzer | No reliable persistent readback | One-shot beep/property | Do not represent this as a guaranteed readable persistent boolean |
| Basic temperature, filter alert, error code | GetStateCommand | No | Read-only observations |
| Humidity target | GetStateCommand | SetStateCommand | Only meaningful for compatible hardware |
| Energy | GetPowerUsageCommand | No | Explicit bcd, binary (/10), binary100 (/100), mixed, bcdEnergyBinaryPower |
| Humidity, defrost, outdoor fan | GetSensorStateCommand / telemetry group 5 | No | Unsupported/unread values are not fabricated |
| Powered hours and run hours | Telemetry group 0 | No | Added; fractional hours |
| Compressor frequency/target/current/voltage and refrigerant temperatures | Telemetry group 1 | No | Added; encoding follows the frozen Python references |
| Indoor fan target/actual speed and condensate pump | Telemetry group 2 | No | Added; speed raw × 8 |
| Alternate outdoor fan speed | Telemetry group 3 | No | Added; model-specific alternative to group 5 |
| Outdoor unit power | Telemetry group 7 | No | Added; little-endian Watts |
| Diagnostic horizontal/vertical angle | Telemetry group 11 | No | Keep separate from property angle conventions |
| Standard filter reset | Filter alert only | Explicit SetStateCommand resetFilter option | Added; only standard profile; never triggered during discovery/polling |
| BB subprotocol query 10/11/30 and SET | Missing | Missing | Blocking gap for universal model coverage |
| BB fresh air and BB filter reset | Missing | Missing | Model/subtype-specific; must not send standard messages indiscriminately |
| A0/A1 alternate status and model-specific 0x7E temperature data | Missing | N/A | Needs a model profile and response fixtures |
| Remaining raw/model-specific B0/B5 attributes | Raw B5 retained; typed access incomplete | Incomplete | Support advertisement alone must not be treated as writable implementation |
| Schedules, timers, PMV/comfort-sleep details and advanced filter/service counters | Incomplete | Incomplete | Not equivalent to the ordinary sleep/comfort/filter flags |
| Cloud-only conveniences and non-AC appliances | Outside current LAN AC scope | Outside scope | Both cloud providers remain available for LAN credential retrieval |

## Outstanding work before a completeness claim

1. Implement a device/model profile layer (model/subtype, supported response/query families and energy scaling). There is no reliable universal B5 bit for all these choices.
2. Implement the BB query/SET/fresh-air/filter-reset family and the alternate A0/A1/0x7E decoders with reference capture tests. Upstream midea-local contains explicit model exceptions (including 23096633 subtype 1, 22013279, and 22251759); these are not general firmware rules.
3. Inventory and type the remaining model-specific properties/counters/presets; keep raw data for unknown fields. Do not expose every numeric capability as a current state.
4. Improve persistent connection response correlation and unsolicited-report handling. The present request path serializes writes and assembles complete TCP packets, but it is not a background report subscription/demultiplexer.
5. Validate v2 discovery field layouts on older hardware, both UDP-ID byte orders where necessary, and OEM/region-specific login behaviour. No live provider login was performed.
6. Validate readback and write effects on representative C0/B0, BB, portable, cassette, heat-only/cool-only and energy-meter models. In particular validate energy units and the auxiliary-heat/filter-reset profile.
7. Extend Homey UI/Flows only after capability support and the corresponding library command are established. This change does not automatically add all diagnostic sensors to Homey.

## API examples

```ts
const snapshot = await new GetAllStatesCommand(device, caps, {
  energyFormat: 'binary100', // configure from the device, do not guess
  telemetryGroups: [0, 1, 2, 3, 5, 7, 11],
  stateProfile: 'standard',
}).execute();
console.table(snapshot.values);
console.log(snapshot.errors);

// A direct optional diagnostic read; not all models respond:
const diagnostic = await new GetTelemetryCommand(device, 1).execute();
console.table(diagnostic.values);

// Explicit user action after servicing filters, on a standard-profile device:
const state = await new GetStateCommand(device, 'standard').execute();
await new SetStateCommand(device, state, {resetFilter: true}).execute();
```

Telemetry groups are opt-in, because support is not universally advertised and an unsupported query can time out. GetAllStates reports each group error separately and keeps successful readings. Standard profile is the default; use msmartAuxHeat only after identifying that hardware layout. GetStateResponse accepts the same profile, SetStateCommand retains it during readback.

## Verification

- TypeScript build of the library.
- 42 Node regression tests: capabilities (13), states (13), transport (10), telemetry/energy (2), cloud/discovery (4).
- 9 existing Jest security vectors.
- Homey TypeScript integration check and 6 Homey regression tests against the modified library.
- All hardware, UDP and HTTP tests are synthetic/mocked; there are no live AC/provider results.
- Run `npm run test:all` in the library. Homey integration tests require the preview library path as documented in its tests.

The Homey policy of clearing credentials when the IP changes is intentional and remains unchanged. Work remains on the preview branch; no release has been published.
