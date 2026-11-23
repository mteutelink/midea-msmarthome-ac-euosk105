import { Device } from '../Device';
import { FRAME_TYPE } from '../MideaConstants';
import { LANCommand } from './LANCommand';

export class GetSensorStateResponse {
    public readonly humidity: number | null;
    public readonly defrost: boolean;
    public readonly outdoorFanSpeed: number;
    constructor(frame: Buffer) {
        if (!Buffer.isBuffer(frame) || frame.length < 23) throw new Error('Truncated group-5 sensor response');
        const data = frame.subarray(10, frame.length - 2);
        if (data[0] !== 0xC1 || (data[3] & 15) !== 5) throw new Error('Unexpected group-5 response');
        this.humidity = data[4] > 0 && data[4] <= 100 ? data[4] : null;
        this.outdoorFanSpeed = data[8] * 8;
        this.defrost = data[10] !== 0;
    }
}
export class GetSensorStateCommand extends LANCommand {
    constructor(device: Device) { super(device, Buffer.from([0x41, 0x21, 1, 0x45, 0, 1]), FRAME_TYPE.REQUEST); }
    public async execute(): Promise<GetSensorStateResponse> {
        const response = await super.execute();
        return new GetSensorStateResponse(response[0]);
    }
}
