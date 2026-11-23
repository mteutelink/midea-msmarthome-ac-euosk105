/** Frame complete TCP packets without decrypting them. Supports LAN v2 and v3. */
export class PacketStream {
    private pending = Buffer.alloc(0);
    constructor(private readonly maxBufferSize = 131086) {}
    public get pendingBytes(): number { return this.pending.length; }
    public push(chunk: Buffer): Buffer[] {
        this.pending = Buffer.concat([this.pending, chunk]);
        if (this.pending.length > this.maxBufferSize) throw new Error('LAN receive buffer limit exceeded');
        const result: Buffer[] = [];
        while (this.pending.length >= 2) {
            let length: number;
            if (this.pending[0] === 0x83 && this.pending[1] === 0x70) {
                if (this.pending.length < 6) break;
                length = this.pending.readUInt16BE(2) + 8;
            } else if (this.pending[0] === 0x5A && this.pending[1] === 0x5A) {
                if (this.pending.length < 6) break;
                length = this.pending.readUInt16LE(4);
                if (length < 56) throw new Error('Invalid LAN v2 packet length');
            } else if (this.pending[0] === 0xAA) {
                length = this.pending[1] + 1;
                if (length < 13) throw new Error('Invalid raw frame length');
            } else throw new Error('Unrecognized LAN packet header');
            if (length > this.maxBufferSize) throw new Error('LAN packet exceeds receive buffer limit');
            if (this.pending.length < length) break;
            result.push(Buffer.from(this.pending.subarray(0, length)));
            this.pending = this.pending.subarray(length);
        }
        return result;
    }
}
