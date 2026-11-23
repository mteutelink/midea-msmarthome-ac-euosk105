export type EnergyDecodeMode = 'bcd' | 'binary';

export class GetPowerUsageResponse {
    public readonly totalEnergy: number;
    public readonly currentEnergy: number;
    public readonly realTimePower: number;
    constructor(frame: Buffer, public readonly decodeMode: EnergyDecodeMode = 'bcd') {
        if (!Buffer.isBuffer(frame) || frame.length < 31) throw new Error('Truncated energy response');
        const data = frame.subarray(10, frame.length - 2);
        if (data[0] !== 0xC1 || (data[3] & 15) !== 4) throw new Error('Unexpected energy response');
        if (decodeMode !== 'bcd' && decodeMode !== 'binary') throw new Error('Unknown energy format');
        const bcd = (byte: number): number => {
            if ((byte >> 4) > 9 || (byte & 15) > 9) throw new Error('Invalid BCD energy data');
            return (byte >> 4) * 10 + (byte & 15);
        };
        const energy = (offset: number): number => decodeMode === 'binary'
            ? data.readUInt32BE(offset) / 10
            : Math.round((10000 * bcd(data[offset]) + 100 * bcd(data[offset + 1])
                + bcd(data[offset + 2]) + bcd(data[offset + 3]) / 100) * 100) / 100;
        this.totalEnergy = energy(4);
        this.currentEnergy = energy(12);
        this.realTimePower = decodeMode === 'binary' ? data.readUIntBE(16, 3) / 10
            : Math.round((1000 * bcd(data[16]) + 10 * bcd(data[17]) + bcd(data[18]) / 10) * 10) / 10;
    }
}
