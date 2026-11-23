import { PROPERTY_ID, PropertyValue, decodeProperty } from './PropertyCodec';

export class GetPropertiesResponse extends Map<PROPERTY_ID, PropertyValue> {
    public readonly errors = new Map<PROPERTY_ID, number>();
    public readonly raw = new Map<number, Buffer>();

    constructor(frame: Buffer) {
        super();
        if (!Buffer.isBuffer(frame) || frame.length < 14) throw new Error('Truncated properties response');
        const data = frame.subarray(10, frame.length - 2);
        if (data[0] !== 0xB0 && data[0] !== 0xB1) throw new Error('Unexpected properties response type');
        let offset = 2;
        for (let i = 0; i < data[1]; i++) {
            if (offset + 4 > data.length) throw new Error('Truncated property header');
            const id = data.readUInt16LE(offset) as PROPERTY_ID;
            const result = data[offset + 2];
            const length = data[offset + 3];
            if (offset + 4 + length > data.length) throw new Error('Truncated property payload');
            const bytes = Buffer.from(data.subarray(offset + 4, offset + 4 + length));
            this.raw.set(id, bytes);
            if (result & 0x10) this.errors.set(id, result);
            else {
                const value = decodeProperty(id, bytes);
                if (value !== undefined) this.set(id, value);
            }
            offset += 4 + length;
        }
    }
}
