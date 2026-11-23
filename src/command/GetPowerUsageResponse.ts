export type EnergyDecodeMode = 'bcd' | 'binary' | 'binary100' | 'mixed' | 'bcdEnergyBinaryPower';

export class GetPowerUsageResponse {
    public readonly totalEnergy: number;
    public readonly currentEnergy: number;
    public readonly realTimePower: number;
    constructor(frame: Buffer, public readonly decodeMode: EnergyDecodeMode = 'bcd') {
        if (!Buffer.isBuffer(frame) || frame.length < 31) throw new Error('Truncated energy response');
        const data = frame.subarray(10, frame.length - 2);
        if (data[0] !== 0xC1 || (data[3] & 15) !== 4) throw new Error('Unexpected energy response');
        if (!['bcd','binary','binary100','mixed','bcdEnergyBinaryPower'].includes(decodeMode))
            throw new Error('Unknown energy format');
        const bcd = (byte: number): number => {
            if ((byte >> 4) > 9 || (byte & 15) > 9) throw new Error('Invalid BCD energy data');
            return (byte >> 4) * 10 + (byte & 15);
        };
        const parse = (offset: number, length: number, binary: boolean): number => {
            let result = 0;
            for (const byte of data.subarray(offset, offset + length)) {
                if (decodeMode === 'mixed' && byte > 99) throw new Error('Invalid mixed energy data');
                result = result * (binary ? 256 : 100) +
                    (binary || decodeMode === 'mixed' ? byte : bcd(byte));
            }
            return result;
        };
        const binaryEnergy = decodeMode === 'binary' || decodeMode === 'binary100';
        const energy = (offset: number) => parse(offset,4,binaryEnergy) / (decodeMode === 'binary' ? 10 : 100);
        this.totalEnergy = energy(4); this.currentEnergy = energy(12);
        this.realTimePower = parse(16,3,binaryEnergy || decodeMode === 'bcdEnergyBinaryPower') / 10;
    }
}
