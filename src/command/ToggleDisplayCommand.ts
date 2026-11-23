import { Device } from '../Device';
import { FRAME_TYPE } from '../MideaConstants';
import { LANCommand } from './LANCommand';
import { GetStateCommand } from './GetStateCommand';
import { GetStateResponse } from './GetStateResponse';

/** Protocol exposes a toggle, not an idempotent absolute display setter. */
export class ToggleDisplayCommand extends LANCommand {
    constructor(device: Device, beep = false) {
        super(device, Buffer.from([0x41, 0x02 | (beep ? 0x40 : 0), 0, 0xFF, 2,
            0, 2, ...Array(14).fill(0)]), FRAME_TYPE.REQUEST);
    }
    public async execute(): Promise<GetStateResponse> {
        await super.execute();
        return new GetStateCommand(this._device).execute();
    }
}
