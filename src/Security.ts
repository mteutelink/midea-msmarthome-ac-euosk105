"use strict";

import { MIDEA_MESSAGE_TYPE } from './MideaConstants';
import { MSMARTHOME_SIGN_KEY, MSMARTHOME_APP_KEY, MSMARTHOME_IOT_KEY, MSMARTHOME_HMAC_KEY } from './MSmartHomeConstants';
import { LANSecurityContext } from './LANSecurityContext';
import { _LOGGER } from './Logger';
import crypto from 'crypto';
import { NETHOMEPLUS_APP_KEY } from './NetHomePlusConstants';

export class Security {
	public static aesEncrypt(raw: Buffer): Buffer {
		const cipher: crypto.Cipher = crypto.createCipheriv('aes-128-ecb', this._encodedSignKey(), null);
		const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
		return encrypted;
	}

	public static aesDecrypt(raw: Buffer): Buffer {
		const decipher: crypto.Decipher = crypto.createDecipheriv('aes-128-ecb', this._encodedSignKey(), null);
		const decrypted = Buffer.concat([decipher.update(raw), decipher.final()]);
		return decrypted;
	}

	public static aesCbcEncrypt(raw: Buffer, key: Buffer): Buffer {
		const cipher: crypto.Cipher = crypto.createCipheriv('aes-256-cbc', key, /*IV*/Buffer.alloc(16, 0));
		cipher.setAutoPadding(false);
        const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
		return encrypted;
	}

	public static aesCbcDecrypt(raw: Buffer, key: Buffer): Buffer {
		const decipher: crypto.Decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16)).setAutoPadding(false);
		const decrypted = Buffer.concat([decipher.update(raw), decipher.final()]);
		return decrypted;
	}

	private static _encodedSignKey(): Buffer {
		const encoded = crypto.createHash('md5').update(MSMARTHOME_SIGN_KEY).digest();
		return encoded;
	}

	public static encode32(data: Buffer) {
		const encoded = crypto.createHash('md5').update(Buffer.concat([data, Buffer.from(MSMARTHOME_SIGN_KEY, 'utf-8')])).digest();
		return encoded;
	  }


    public static encode8370(context: LANSecurityContext, payload: Buffer, requestCount: number, type: MIDEA_MESSAGE_TYPE) {
        const encrypted = type === MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST || type === MIDEA_MESSAGE_TYPE.ENCRYPTED_RESPONSE;
        const padding = encrypted ? (16 - ((payload.length + 2) % 16)) % 16 : 0;
        const size = payload.length + padding + (encrypted ? 32 : 0);
        if (size > 65535) throw new Error('8370 payload is too large');
        const header = Buffer.from([0x83, 0x70, 0, 0, 0x20, (padding << 4) | type]);
        header.writeUInt16BE(size, 2);
        const sequence = Buffer.alloc(2);
        sequence.writeUInt16BE(requestCount & 0xFFFF);
        const plain = Buffer.concat([sequence, payload, crypto.randomBytes(padding)]);
        const body = encrypted ? Buffer.concat([
            Security.aesCbcEncrypt(plain, Buffer.from(context.accessToken, 'hex')),
            crypto.createHash('sha256').update(Buffer.concat([header, plain])).digest()
        ]) : plain;
        return { data: Buffer.concat([header, body]), count: ((requestCount & 0xFFFF) + 1) & 0xFFFF };
    }

    /** Stable streaming result; incomplete TCP data is never confused with a packet. */
    public static decode8370Packets(context: LANSecurityContext, input: Buffer): { packets: Buffer[]; incomplete: Buffer } {
        const packets: Buffer[] = [];
        let offset = 0;
        while (offset < input.length) {
            const data = input.subarray(offset);
            if (data.length < 6) break;
            if (data[0] !== 0x83 || data[1] !== 0x70) throw new Error('not an 8370 message');
            if (data[4] !== 0x20) throw new Error('missing byte 4');
            const length = data.readUInt16BE(2) + 8;
            if (data.length < length) break;
            const header = data.subarray(0, 6);
            const type = header[5] & 15, padding = header[5] >> 4;
            let plain: Buffer;
            if (type === MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST || type === MIDEA_MESSAGE_TYPE.ENCRYPTED_RESPONSE) {
                const cipher = data.subarray(6, length - 32);
                if (!cipher.length || cipher.length % 16) throw new Error('Invalid encrypted 8370 block length');
                plain = Security.aesCbcDecrypt(cipher, Buffer.from(context.accessToken, 'hex'));
                const expected = crypto.createHash('sha256').update(Buffer.concat([header, plain])).digest();
                const actual = data.subarray(length - 32, length);
                if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('sign does not match');
                if (padding > plain.length - 2) throw new Error('Invalid 8370 padding');
            } else {
                if (![0, 1, 15].includes(type) || padding !== 0) throw new Error('Unsupported 8370 packet type');
                plain = data.subarray(6, length);
            }
            if (plain.length < 2) throw new Error('Truncated 8370 sequence');
            packets.push(Buffer.from(plain.subarray(2, padding ? plain.length - padding : undefined)));
            offset += length;
        }
        return { packets, incomplete: Buffer.from(input.subarray(offset)) };
    }

    /** Compatibility API: complete buffers return a flat Buffer[] consistently. */
    public static decode8370(context: LANSecurityContext, data: Buffer): Buffer[] {
        const result = Security.decode8370Packets(context, data);
        if (result.incomplete.length) throw new Error('Incomplete 8370 packet; use decode8370Packets for streaming');
        return result.packets;
    }

    public static async tcpKey(context: LANSecurityContext, response: Buffer): Promise<LANSecurityContext> {
        if (response.equals(Buffer.from('ERROR'))) throw new Error('Authentication failed');
        const key = Buffer.from(context.key, 'hex');
        if (response.length !== 64 || key.length !== 32) throw new Error('Unexpected handshake/key length');
        const plain = Security.aesCbcDecrypt(response.subarray(0, 32), key);
        const expected = crypto.createHash('sha256').update(plain).digest();
        if (!crypto.timingSafeEqual(expected, response.subarray(32))) throw new Error('Sign does not match');
        context.accessToken = Security.strxor(plain, key).toString('hex');
        return context;
    }

	  private static strxor(buf1: Buffer, buf2: Buffer): Buffer {
		return Buffer.from(buf1.map((b, i) => b ^ buf2[i]));
	  }
}
