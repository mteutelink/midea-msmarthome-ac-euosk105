import { DeviceState, MIN_TARGET_TEMPERATURE, StateProtocolProfile } from '../DeviceState';

export class GetStateResponse extends DeviceState {
    constructor(frame: Buffer, profile: StateProtocolProfile = 'standard') {
        super();
        this.protocolProfile = profile;
        if (!Buffer.isBuffer(frame) || frame.length < 29) throw new Error('Truncated basic state response');
        const data = frame.subarray(10, frame.length - 2);
        if (data[0] !== 0xC0) throw new Error('Unexpected basic state response type');
        this.powerOn = Boolean(data[1] & 1);
        this.operationalMode = (data[2] >> 5) & 7;
        this.fanSpeed = data[3] & 0x7F;
        this.swingMode = data[7] & 15;
        this.turboMode = Boolean((data[10] & 2) || (data[8] & 0x20));
        this.ecoMode = Boolean(data[9] & 0x10); // C0 response differs from 0x40 SET bit layout.
        this.sleepMode = Boolean(data[10] & 1);
        this.fahrenheit = Boolean(data[10] & 4);
        this.followMe = Boolean(data[8] & 0x80);
        this.anionMode = Boolean(data[9] & 0x20);
        this.auxHeat = Boolean(data[9] & 8);
        if (profile === 'msmartAuxHeat') this.independentAuxHeat = Boolean(data[8] & 0x40);
        else this.smartEye = Boolean(data[8] & 0x40);
        this.filterAlert = Boolean(data[13] & 0x20);
        this.displayOn = (data[14] & 0x70) !== 0x70;
        this.powerSaving = Boolean(data[8] & 8);
        this.naturalWind = Boolean(data[9] & 2);
        this.dryFunction = Boolean(data[9] & 4);
        if (data.length >= 23) this.comfortMode = Boolean(data[22] & 1);
        const alternate = data[13] & 0x1F;
        this.targetTemperature = (alternate ? alternate + 12 : (data[2] & 15) + MIN_TARGET_TEMPERATURE)
            + ((data[2] & 0x10) ? 0.5 : 0);
        const temperature = (raw: number, decimal: number): number | undefined => {
            if (raw === 0xFF) return undefined;
            const base = (raw - 50) / 2;
            // Celsius decimal nibble replaces the fraction rather than being added twice.
            if (!this.fahrenheit && decimal) return Math.trunc(base) + (base >= 0 ? decimal / 10 : -decimal / 10);
            return Math.trunc(base) + (decimal >= 5 ? (base >= 0 ? 0.5 : -0.5) : base - Math.trunc(base));
        };
        const indoor = temperature(data[11], data[15] & 15);
        const outdoor = temperature(data[12], data[15] >> 4);
        if (indoor !== undefined) this.indoorTemperature = indoor;
        if (outdoor !== undefined) this.outdoorTemperature = outdoor;
        this.statusCode = data[16];
        if (data.length >= 20) this.targetHumidity = data[19] & 0x7F;
        if (data.length >= 22) this.freezeProtectionMode = Boolean(data[21] & 0x80);
    }
}
