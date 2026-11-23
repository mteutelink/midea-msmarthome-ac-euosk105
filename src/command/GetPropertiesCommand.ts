import { Device } from '../Device';
import { DeviceCapabilities } from '../DeviceCapabilities';
import { GetPropertiesResponse } from './GetPropertiesResponse';
import { LANCommand } from './LANCommand';
import { PROPERTY_ID, assertPropertySupport } from './PropertyCodec';
export { PROPERTY_ID } from './PropertyCodec';

export class GetPropertiesCommand extends LANCommand {
    constructor(device: Device, propertyIDs: PROPERTY_ID[], caps?: DeviceCapabilities) {
        if (!propertyIDs.length || propertyIDs.length > 120) throw new Error('Expected 1..120 property IDs');
        const buffer = Buffer.alloc(propertyIDs.length * 2);
        propertyIDs.forEach((id, index) => {
            assertPropertySupport(id, caps);
            buffer.writeUInt16LE(id, index * 2);
        });
        super(device, Buffer.concat([Buffer.from([0xB1, propertyIDs.length]), buffer]));
    }
    public async execute(): Promise<GetPropertiesResponse> {
        const response = await super.execute();
        return new GetPropertiesResponse(response[0]);
    }
}
