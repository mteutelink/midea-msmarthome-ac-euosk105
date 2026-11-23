import { Device } from '../Device';
import { DeviceCapabilities } from '../DeviceCapabilities';
import { FRAME_TYPE } from '../MideaConstants';
import { GetPropertiesCommand } from './GetPropertiesCommand';
import { GetPropertiesResponse } from './GetPropertiesResponse';
import { LANCommand } from './LANCommand';
import { PROPERTY_ID, PropertyValue, createSetPropertiesPayload } from './PropertyCodec';

export class SetPropertiesCommand extends LANCommand {
    private readonly _propertyIDs: PROPERTY_ID[];
    constructor(device: Device, properties: ReadonlyMap<PROPERTY_ID, PropertyValue>,
        private readonly capabilities?: DeviceCapabilities) {
        super(device, createSetPropertiesPayload(properties, capabilities), FRAME_TYPE.SET);
        this._propertyIDs = Array.from(properties.keys());
    }
    public async execute(): Promise<GetPropertiesResponse> {
        const response = await super.execute();
        // Inspect the acknowledgement, and never claim success for a rejected write.
        const ack = new GetPropertiesResponse(response[0]);
        if (ack.errors.size) throw new Error('Air conditioner rejected properties: ' + [...ack.errors.keys()].join(', '));
        const readable = this._propertyIDs.filter(id => id !== PROPERTY_ID.BUZZER);
        if (!readable.length) return ack;
        const state = await new GetPropertiesCommand(this._device, readable, this.capabilities).execute();
        if (state.errors.size) throw new Error('Property read-back failed: ' + [...state.errors.keys()].join(', '));
        if (readable.some(id => !state.has(id))) throw new Error('Property read-back returned no state');
        return state; // Actual returned state; do not substitute requested values.
    }
}
