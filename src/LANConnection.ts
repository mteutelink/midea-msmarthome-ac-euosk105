import { MIDEA_MESSAGE_TYPE } from './MideaConstants';
import { Security } from './Security';
import { LANSecurityContext } from './LANSecurityContext';
import { Socket } from 'net';
import { Device } from './Device';
import { PacketStream } from './PacketStream';
import crypto from 'crypto';

export interface LANConnectionOptions {
    connectTimeoutMs?: number;
    requestTimeoutMs?: number;
    socketFactory?: () => Socket;
}
export class LANConnection {
    private socket: Socket | null = null;
    private connecting: Socket | null = null;
    private authenticated = false;
    private requestCount = 0;
    private queue: Promise<unknown> = Promise.resolve();
    constructor(private readonly device: Device, private readonly options: LANConnectionOptions = {}) {}
    private serial<T>(action: () => Promise<T>): Promise<T> {
        const run = this.queue.then(action, action);
        this.queue = run.then(() => undefined, () => undefined);
        return run;
    }
    private async connect(): Promise<Socket> {
        if (this.socket && !this.socket.destroyed) return this.socket;
        return new Promise((resolve, reject) => {
            const socket = this.options.socketFactory?.() ?? new Socket();
            this.connecting = socket;
            let settled = false;
            const timer = setTimeout(() => fail(new Error('LAN connect timed out')), this.options.connectTimeoutMs ?? 30000);
            const fail = (error: Error) => {
                if (!settled) { settled = true; clearTimeout(timer); if (this.connecting === socket) this.connecting = null; socket.destroy(); reject(error); }
            };
            // Keep an error listener for errors between requests as well.
            socket.on('error', error => {
                if (this.socket === socket) { this.socket = null; this.authenticated = false; }
                fail(error);
            });
            socket.on('close', () => {
                if (this.socket === socket) { this.socket = null; this.authenticated = false; }
                fail(new Error('LAN connection closed'));
            });
            socket.connect(this.device.deviceContext.port, this.device.deviceContext.host, () => {
                if (settled) return;
                settled = true; clearTimeout(timer); this.connecting = null; this.socket = socket; resolve(socket);
            });
        });
    }
    private async request(message: Buffer): Promise<Buffer[]> {
        const socket = await this.connect();
        return new Promise((resolve, reject) => {
            const stream = new PacketStream();
            const packets: Buffer[] = [];
            let settled = false;
            const cleanup = () => {
                clearTimeout(timer);
                socket.removeListener('data', data);
                socket.removeListener('error', fail);
                socket.removeListener('end', closed);
                socket.removeListener('close', closed);
            };
            const fail = (error: Error) => {
                if (settled) return;
                settled = true; cleanup(); this.close(); reject(error);
            };
            const closed = () => fail(new Error('LAN socket closed before a complete response'));
            const data = (chunk: Buffer) => {
                try {
                    packets.push(...stream.push(chunk));
                    if (packets.length && !stream.pendingBytes) {
                        settled = true; cleanup(); resolve(packets);
                    }
                } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
            };
            const timer = setTimeout(() => fail(new Error('LAN request timed out; command was not replayed')),
                this.options.requestTimeoutMs ?? 30000);
            // Install listeners before write: a fast device can reply before its callback.
            socket.on('data', data); socket.once('error', fail);
            socket.once('end', closed); socket.once('close', closed);
            try { socket.write(message, error => { if (error) fail(error); }); }
            catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
        });
    }
    private async handshake(context: LANSecurityContext): Promise<LANSecurityContext> {
        const encoded = Security.encode8370(context, Buffer.from(context.token, 'hex'),
            this.requestCount, MIDEA_MESSAGE_TYPE.HANDSHAKE_REQUEST);
        this.requestCount = encoded.count;
        try {
            const response = await this.request(encoded.data);
            if (response.length !== 1 || (response[0][5] & 15) !== 1) throw new Error('Unexpected handshake response');
            const decoded = Security.decode8370(context, response[0]);
            await Security.tcpKey(context, decoded[0]);
            this.device.lanSecurityContext = context;
            this.authenticated = true; this.requestCount = 0;
            return context;
        } catch (error) { this.close(); throw error; }
    }
    public authenticate(context: LANSecurityContext): Promise<LANSecurityContext> {
        return this.serial(() => this.handshake(context));
    }
    public close(): void {
        const socket = this.socket;
        this.socket = null; this.authenticated = false;
        socket?.destroy();
        this.connecting?.destroy();
        this.connecting = null;
    }
    public executeCommand(request: Buffer,
        type: MIDEA_MESSAGE_TYPE = MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST): Promise<Buffer[]> {
        return this.serial(async () => {
            try {
                const v2 = this.device.deviceContext.version === 2;
                let wire = request;
                const context = this.device.lanSecurityContext;
                if (!v2) {
                    if (!context) throw new ReferenceError('LAN credentials are missing');
                    if (!this.authenticated || !this.socket) await this.handshake(context);
                    const encoded = Security.encode8370(context, request, this.requestCount, type);
                    this.requestCount = encoded.count; wire = encoded.data;
                }
                const response = await this.request(wire);
                const packets = v2 ? response : response.flatMap(packet => Security.decode8370(context!, packet));
                return packets.map(packet => {
                    if (packet[0] === 0x5A && packet[1] === 0x5A) {
                        if (packet.length < 72 || packet.readUInt16LE(4) !== packet.length)
                            throw new Error('Invalid inner LAN packet length');
                        const signed = packet.subarray(0, -16);
                        if (!crypto.timingSafeEqual(Security.encode32(signed), packet.subarray(-16)))
                            throw new Error('Inner LAN packet signature does not match');
                        packet = Security.aesDecrypt(packet.subarray(40, -16));
                    }
                    if (packet.length < 13 || packet[2] !== 0xAC || packet[0] !== 0xAA || packet[1] + 1 !== packet.length)
                        throw new Error('Invalid appliance response frame');
                    if ((packet.subarray(1).reduce((sum, value) => sum + value, 0) & 255) !== 0)
                        throw new Error('Appliance response checksum does not match');
                    return packet;
                });
            } catch (error) { this.close(); throw error; }
        });
    }
}
