import { BooleanCapability, DeviceCapabilities } from './DeviceCapabilities';

/**
 * B5 capability identifiers/values cross-checked against:
 * mill1000/midea-msmart, msmart/device/AC/command.py (CapabilityId, CapabilitiesResponse).
 * These are advertised capabilities, not current operating states.
 */
export function decodeExtendedCapability(caps: DeviceCapabilities, id: number, data: number[]): void {
    if (!data.length) return;
    const value = data[0];
    const set = (name: BooleanCapability, allowed: number[]) => { caps[name] = allowed.includes(value); };
    switch (id) {
        case 0x0009: set('swingVerticalAngle', [1]); break;
        case 0x000A: set('swingHorizontalAngle', [1]); break;
        case 0x0018: set('breezeless', [1]); break;
        case 0x0039: set('selfClean', [1]); break;
        case 0x0048:
            set('rateSelect2Level', [1]);
            set('rateSelect5Level', [2, 3]);
            break;
        case 0x004B: set('freshAir', [1]); break;
        case 0x0058: set('breezeAwayDirection', [1, 2, 3]); break;
        case 0x0059: set('cascade', [1]); break;
        case 0x0067: set('jetCool', [1, 2, 3, 4]); break;
        case 0x0093: set('auxFanSpeedControl', [1]); break;
        case 0x0094: set('auxHeatFanSpeedControl', [1]); break;
        case 0x00CD: set('outSilent', [1, 3]); break;
        case 0x00E3: {
            // iECO support can be advertised by either of two generation-specific bytes.
            const cool = [1, 3, 8].includes(value) || (data.length > 1 && [1, 2, 8].includes(data[1]));
            const heat = [3, 4, 8].includes(value) || (data.length > 1 && [2, 3, 8].includes(data[1]));
            const primaryKnown = [0, 1, 3, 4, 8].includes(value);
            const secondaryKnown = data.length < 2 || [0, 1, 2, 3, 8].includes(data[1]);
            // An unrecognized future generation is unknown, unless support is positively advertised.
            if (cool || (primaryKnown && secondaryKnown)) caps.iEcoCool = cool;
            if (heat || (primaryKnown && secondaryKnown)) caps.iEcoHeat = heat;
            if (cool || heat || (primaryKnown && secondaryKnown)) caps.iEcoMode = cool || heat;
            if (data.length > 1 && [0, 1, 2, 3, 8].includes(data[1])) {
                caps.iEcoNumber = data[1] === 8 ? 8 : [1, 2, 3].includes(data[1]) ? 3 : 1;
            }
            break;
        }
        case 0x0210:
            set('fanCustom', [1]);
            // Continuous/custom speed support also supports each preset speed.
            set('fanSilent', [1, 6, 9]);
            set('fanLow', [1, 3, 4, 5, 6, 7, 9]);
            set('fanMedium', [1, 5, 6, 7]);
            set('fanHigh', [1, 3, 4, 5, 6, 7, 9]);
            set('fanAuto', [1, 4, 5, 6, 9]);
            set('fanSpeedControl', [1, 3, 4, 5, 6, 7, 9]);
            break;
        case 0x0214:
            // Extend the legacy 0..3 mode decoder to the newer 4..15 combinations.
            if (value <= 15) {
                set('heatMode', [1, 2, 4, 6, 7, 9, 10, 11, 12, 13]);
                set('coolMode', [0, 1, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15]);
                set('dryMode', [0, 1, 5, 6, 9, 11, 13, 14, 15]);
                set('autoMode', [0, 1, 2, 7, 8, 9, 13, 14]);
                set('auxHeatMode', [9]);
                set('auxMode', [9, 10, 11, 13, 14, 15]);
            }
            break;
        case 0x0216:
            set('energyStats', [2, 3, 4, 5]);
            set('energySetting', [3, 5]);
            set('energyBcd', [2, 3]);
            // Preserve legacy names but include the advertised binary format variants.
            set('powerCal', [2, 3, 4, 5]);
            set('powerCalSetting', [3, 5]);
            break;
        case 0x0217:
            set('filterReminder', [1, 2, 4]);
            set('filterCleanReminder', [3, 4]);
            break;
        case 0x021E: set('anionMode', [1]); break;
    }
    // No verified B5 advertisement for Follow Me, defrost or outdoor fan telemetry.
    // Their support remains unknown; a false state bit is not proof of no support.
}
