import { Device } from '../Device';
import { FRAME_TYPE } from '../MideaConstants';
import { LANCommand } from './LANCommand';

export type TelemetryGroup = 0 | 1 | 2 | 3 | 5 | 7 | 11;
/** Optional read-only C1 diagnostics. Availability is model-specific; B5 does not advertise all groups. */
export class GetTelemetryResponse {
    public readonly values: Record<string, number | boolean | null> = {};
    constructor(frame: Buffer, public readonly group: TelemetryGroup) {
        const lengths: Record<TelemetryGroup, number> = {0:19,1:15,2:9,3:11,5:11,7:12,11:13};
        if (!Buffer.isBuffer(frame) || frame.length < lengths[group] + 12) throw new Error('Truncated telemetry response');
        const p = frame.subarray(10, -2);
        if (p[0] !== 0xC1 || (p[3] & 15) !== group) throw new Error('Unexpected telemetry response group');
        const v = this.values;
        switch (group) {
            case 0: {
                const hours = (i: number) => p.readUInt16BE(i)*24 + p[i+2] + p[i+3]/60 + p[i+4]/3600;
                v.poweredHours = hours(4); v.totalOperatingHours = hours(9); v.currentOperatingHours = hours(14);
                break;
            }
            case 1:
                v.compressorFrequency = p[4]; v.targetCompressorFrequency = p[5];
                v.compressorCurrent = p[7]; v.compressorVoltage = p[8];
                v.indoorTemperature = (p[10]-30)/2; v.indoorCoilTemperature = (p[11]-30)/2;
                v.outdoorCoilTemperature = (p[12]-50)/2; v.outdoorTemperature = (p[13]-50)/2;
                v.dischargePipeTemperature = p[14]; break;
            case 2:
                v.targetIndoorFanSpeed = p[4]*8; v.indoorFanSpeed = p[5]*8;
                v.waterPumpRunning = Boolean(p[8]&0x10); break;
            case 3: v.outdoorFanSpeed = p[10]*8; break;
            case 5:
                v.humidity = p[4]>0 && p[4]<=100 ? p[4] : null;
                v.outdoorFanSpeed = p[8]*8; v.defrost = Boolean(p[10]); break;
            case 7: v.outdoorUnitPower = p.readUInt16LE(10); break;
            case 11: v.horizontalSwingAngle = p[9]; v.verticalSwingAngle = p[12]; break;
        }
    }
}
export class GetTelemetryCommand extends LANCommand {
    constructor(device: Device, private readonly group: TelemetryGroup) {
        if (![0,1,2,3,5,7,11].includes(group)) throw new Error('Unsupported telemetry group');
        super(device, Buffer.from([0x41,0x21,1,0x40|group,0,1]), FRAME_TYPE.REQUEST);
    }
    public async execute(): Promise<GetTelemetryResponse> {
        const frames: Buffer[] = await super.execute();
        const frame = frames.find(f => f.length >= 14 && f[10] === 0xC1 && (f[13]&15) === this.group);
        if (!frame) throw new Error('Requested telemetry group not returned');
        return new GetTelemetryResponse(frame, this.group);
    }
}
