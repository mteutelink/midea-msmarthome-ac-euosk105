import { Device } from '../Device';
import { FRAME_TYPE } from '../MideaConstants';
import { LANCommand } from './LANCommand';

/** Send an external measurement. A caller must schedule repeats if its AC requires them. */
export class SetFollowMeTemperatureCommand extends LANCommand {
    constructor(device: Device, temperature: number | null, beep = false) {
        if (temperature !== null && (!Number.isFinite(temperature) || temperature < -25 || temperature > 102))
            throw new Error('External temperature is outside the encodable range');
        const value = temperature === null ? 0xFF : Math.round(temperature * 2) + 50;
        super(device, Buffer.from([0x41, 0x23 | (beep ? 0x40 : 0), 0, 0xFF, 1,
            value, 0, 0, 0, 0, 0]), FRAME_TYPE.REQUEST);
    }
}
