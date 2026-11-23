import { BooleanCapability, DeviceCapabilities } from '../DeviceCapabilities';

export enum PROPERTY_ID {
    SWING_UD_ANGLE = 0x0009, SWING_LR_ANGLE = 0x000A,
    INDOOR_HUMIDITY = 0x0015, BREEZELESS = 0x0018, BUZZER = 0x001A,
    SELF_CLEAN = 0x0039, INDIRECT_WIND = 0x0042, BREEZE_CONTROL = 0x0043,
    RATE_SELECT = 0x0048, FRESH_AIR = 0x004B, BREEZE_AWAY_DIRECTION = 0x0058,
    CASCADE = 0x0059, JET_COOL = 0x0067, OUT_SILENT = 0x00CD,
    IECO = 0x00E3, SOUND = 0x022C
}

export interface IEcoState { enabled: boolean; number: number; }
export type PropertyValue = boolean | number | IEcoState;
export const PROPERTY_FEATURES: Partial<Record<PROPERTY_ID, BooleanCapability[]>> = {
    [PROPERTY_ID.SWING_UD_ANGLE]: ['swingVerticalAngle'],
    [PROPERTY_ID.SWING_LR_ANGLE]: ['swingHorizontalAngle'],
    [PROPERTY_ID.INDOOR_HUMIDITY]: ['indoorHumidity'],
    [PROPERTY_ID.BREEZELESS]: ['breezeless'],
    [PROPERTY_ID.BUZZER]: ['buzzer'],
    [PROPERTY_ID.SELF_CLEAN]: ['selfClean', 'activeClean'],
    [PROPERTY_ID.INDIRECT_WIND]: ['oneKeyNoWindOnMe'],
    [PROPERTY_ID.BREEZE_CONTROL]: ['breezeControl'],
    [PROPERTY_ID.RATE_SELECT]: ['rateSelect2Level', 'rateSelect5Level'],
    [PROPERTY_ID.FRESH_AIR]: ['freshAir'],
    [PROPERTY_ID.BREEZE_AWAY_DIRECTION]: ['breezeAwayDirection'],
    [PROPERTY_ID.CASCADE]: ['cascade'],
    [PROPERTY_ID.JET_COOL]: ['jetCool'],
    [PROPERTY_ID.OUT_SILENT]: ['outSilent'],
    [PROPERTY_ID.IECO]: ['iEcoMode'],
    [PROPERTY_ID.SOUND]: ['buzzer'],
};

export function assertPropertySupport(id: PROPERTY_ID, caps?: DeviceCapabilities): void {
    if (!PROPERTY_FEATURES[id]) throw new Error('Unsupported property identifier: ' + id);
    if (caps && PROPERTY_FEATURES[id]!.every(name => caps.getSupport(name) === 'unsupported')) {
        throw new Error('Property is explicitly unsupported: ' + PROPERTY_ID[id]);
    }
}
function booleanValue(value: PropertyValue): boolean {
    if (typeof value !== 'boolean') throw new Error('Expected a boolean property value');
    return value;
}
function integerValue(value: PropertyValue, allowed?: number[], max = 255): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max
        || (allowed && !allowed.includes(value))) throw new Error('Invalid numeric property value');
    return value;
}

export function encodeProperty(id: PROPERTY_ID, value: PropertyValue, caps?: DeviceCapabilities): Buffer {
    assertPropertySupport(id, caps);
    switch (id) {
        case PROPERTY_ID.INDOOR_HUMIDITY: throw new Error('Humidity is read-only');
        case PROPERTY_ID.SWING_UD_ANGLE:
        case PROPERTY_ID.SWING_LR_ANGLE:
            return Buffer.from([integerValue(value, [0, 1, 25, 50, 75, 100])]);
        case PROPERTY_ID.BREEZELESS:
        case PROPERTY_ID.BUZZER:
        case PROPERTY_ID.SELF_CLEAN:
        case PROPERTY_ID.JET_COOL:
        case PROPERTY_ID.SOUND: return Buffer.from([booleanValue(value) ? 1 : 0]);
        case PROPERTY_ID.INDIRECT_WIND: return Buffer.from([booleanValue(value) ? 2 : 1]);
        case PROPERTY_ID.OUT_SILENT: return Buffer.from([booleanValue(value) ? 3 : 0]);
        case PROPERTY_ID.CASCADE: {
            const direction = integerValue(value);
            return Buffer.from([direction ? 1 : 0, direction]);
        }
        case PROPERTY_ID.FRESH_AIR: {
            const speed = integerValue(value, undefined, 100);
            return Buffer.from([speed ? 1 : 0, speed, 0xFF]);
        }
        case PROPERTY_ID.IECO: {
            const generation = caps?.getReportedValue('iEcoNumber');
            const setting = typeof value === 'boolean'
                ? { enabled: value, number: typeof generation === 'number' ? generation : 1 } : value;
            if (!setting || typeof setting !== 'object' || typeof setting.enabled !== 'boolean'
                || ![1, 3, 8].includes(setting.number)) throw new Error('Invalid iECO generation/enabled value');
            return Buffer.from([0, setting.number, setting.enabled ? 1 : 0, ...Array(10).fill(0)]);
        }
        case PROPERTY_ID.RATE_SELECT: {
            const gears = caps?.getSupport('rateSelect5Level') === 'supported'
                ? [1, 20, 40, 60, 80, 100] : caps?.getSupport('rateSelect2Level') === 'supported'
                    ? [50, 75, 100] : [1, 20, 40, 50, 60, 75, 80, 100];
            return Buffer.from([integerValue(value, gears)]);
        }
        default: return Buffer.from([integerValue(value)]);
    }
}

export function decodeProperty(id: PROPERTY_ID, data: Buffer): PropertyValue | undefined {
    if (!data.length) return undefined;
    switch (id) {
        case PROPERTY_ID.BUZZER: return undefined; // A command flag, not a readable state.
        case PROPERTY_ID.BREEZELESS:
        case PROPERTY_ID.SELF_CLEAN:
        case PROPERTY_ID.JET_COOL:
        case PROPERTY_ID.SOUND: return data[0] !== 0;
        case PROPERTY_ID.INDIRECT_WIND: return data[0] === 2;
        case PROPERTY_ID.OUT_SILENT: return data[0] === 3;
        case PROPERTY_ID.IECO:
            if (data.length < 2) throw new Error('Truncated iECO state');
            return { number: data[0], enabled: data[1] !== 0 };
        case PROPERTY_ID.FRESH_AIR:
        case PROPERTY_ID.CASCADE:
            if (data.length < 2) throw new Error('Truncated multi-byte property');
            return data[0] ? data[1] : 0;
        default: return PROPERTY_FEATURES[id] ? data[0] : undefined;
    }
}

export function createSetPropertiesPayload(properties: ReadonlyMap<PROPERTY_ID, PropertyValue>,
    caps?: DeviceCapabilities): Buffer {
    if (!properties.size || properties.size > 255) throw new Error('Expected 1..255 properties');
    const parts: Buffer[] = [Buffer.from([0xB0, properties.size])];
    for (const [id, value] of properties) {
        const encoded = encodeProperty(id, value, caps);
        const header = Buffer.alloc(3);
        header.writeUInt16LE(id, 0);
        header[2] = encoded.length;
        parts.push(header, encoded);
    }
    const payload = Buffer.concat(parts);
    if (payload.length > 242) throw new Error('Too many properties for one Midea frame');
    return payload;
}
