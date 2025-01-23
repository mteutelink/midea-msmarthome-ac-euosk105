"use strict";

import { MIDEA_MESSAGE_TYPE, MSMARTHOME_SIGN_KEY, MSMARTHOME_APP_KEY, MSMARTHOME_IOT_KEY, MSMARTHOME_HMAC_KEY } from './MideaConstants';
import { LANSecurityContext } from './LANSecurityContext';
import { _LOGGER } from './Logger';
import crypto from 'crypto';

export class Security {
	public static aesEncrypt(raw: Buffer): Buffer {
		_LOGGER.debug("Security::aesEncrypt(" + raw.toString('hex') + ")");
		const cipher: crypto.Cipher = crypto.createCipheriv('aes-128-ecb', this._encodedSignKey(), null);
		const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
		_LOGGER.debug("Security::aesEncrypt() = " + Buffer.from(encrypted).toString('hex'));
		return encrypted;
	}

	public static aesDecrypt(raw: Buffer): Buffer {
		_LOGGER.debug("Security::aesDecrypt(" + raw.toString('hex') + ")");
		const decipher: crypto.Decipher = crypto.createDecipheriv('aes-128-ecb', this._encodedSignKey(), null);
		const decrypted = Buffer.concat([decipher.update(raw), decipher.final()]);
		_LOGGER.debug("Security::aesDecrypt() = " + Buffer.from(decrypted).toString('hex'));
		return decrypted;
	}

	public static aesCbcEncrypt(raw: Buffer, key: Buffer): Buffer {
		_LOGGER.debug("Security::aesCbcEncrypt(" + raw.toString('hex') + ", " + key.toString('hex') + ")");
		const cipher: crypto.Cipher = crypto.createCipheriv('aes-256-cbc', key, /*IV*/Buffer.alloc(16, 0));
		const encrypted =  cipher.update(raw);
		_LOGGER.debug("Security::aesCbcEncrypt() = " + Buffer.from(encrypted).toString('hex'));
		return encrypted;
	}

	public static aesCbcDecrypt(raw: Buffer, key: Buffer): Buffer {
		_LOGGER.debug("Security::aesCbcDecrypt(" + raw.toString('hex') + ", " + key.toString('hex') + ")");
		const decipher: crypto.Decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16)).setAutoPadding(false);
		const decrypted =  decipher.update(raw);
		_LOGGER.debug("Security::aesCbcDecrypt() = " + Buffer.from(decrypted).toString('hex'));
		return decrypted;
	}

	private static _encodedSignKey(): Buffer {
		_LOGGER.debug("Security::_encodedSignKey()");
		const encoded = crypto.createHash('md5').update(MSMARTHOME_SIGN_KEY).digest();
		_LOGGER.debug("Security::_encodedSignKey() = " + encoded.toString('hex'));
		return encoded;
	}

	public static sign(data:string, random: string): string {
		_LOGGER.debug("Security::sign(" + data + ", " + random + ")");
		const msg: string = MSMARTHOME_IOT_KEY + data + random;
		const sign = crypto.createHmac('SHA256', MSMARTHOME_HMAC_KEY).update(msg).digest('hex');
		_LOGGER.debug("Security::sign() = " + sign);
		return sign;
	}
	public static encryptPassword(loginId: string, password: string): string {
		_LOGGER.debug("Security::encryptPassword(****, ****)");
		const hashedPassword: string = crypto.createHash('sha256').update(password, 'utf-8').digest('hex');
		const encrypted = crypto.createHash('sha256').update(`${loginId}${hashedPassword}${MSMARTHOME_APP_KEY}`, 'utf-8').digest('hex');
		_LOGGER.debug("Security::encryptPassword() = " + encrypted);
		return encrypted;
	}
	
	public static encryptIAMPassword(loginId: string, password: string): string {
		_LOGGER.debug("Security::encryptIAMPassword(****, ****)");
		const mdPassword: string = crypto.createHash('md5').update(password, 'utf-8').digest('hex');
		const mdMdPassword: string = crypto.createHash('md5').update(mdPassword, 'utf-8').digest('hex');
		const encrypted = crypto.createHash('sha256').update(`${loginId}${mdMdPassword}${MSMARTHOME_APP_KEY}`, 'utf-8').digest('hex');
		_LOGGER.debug("Security::encryptIAMPassword() = " + encrypted);
		return encrypted;
	}

	public static encode32(data: Buffer) {
		_LOGGER.debug("Security::encode32(" + data.toString('hex') + ")");
		const encoded = crypto.createHash('md5').update(Buffer.concat([data, Buffer.from(MSMARTHOME_SIGN_KEY, 'utf-8')])).digest();
		_LOGGER.debug("Security::encode32() = " + encoded.toString('hex'));
		return encoded;
	  }

	public static encode8370(lanSecurityContext: LANSecurityContext, data: Buffer, requestCount: number, msgtype: MIDEA_MESSAGE_TYPE) {
		_LOGGER.debug("Security::encode8370(" + msgtype + ")");
		let header: Buffer = Buffer.from([0x83, 0x70] );
		let size: number = data.length;
		let padding: number = 0;
	
		if ([MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST, MIDEA_MESSAGE_TYPE.ENCRYPTED_RESPONSE].includes(msgtype)) {
			if ((size + 2) % 16 !== 0) {
				padding = 16 - ((size + 2) & 0xf);
				size += padding + 32; 
				const randomBytes = crypto.randomBytes(padding);
				data = Buffer.concat([data, randomBytes]);
			}
		}
	
		header = Buffer.concat([
			header,
			Buffer.alloc(2), 
			Buffer.from([0x20, (padding << 4) | msgtype])
		]);
		header.writeUInt16BE(size, 2); 
	
		if (requestCount >= 0xfff) {
			_LOGGER.debug(`request_count is too big to convert: ${requestCount}`);
			requestCount = 0;
		}
	
		const requestCountBuffer = Buffer.alloc(2);
		requestCountBuffer.writeUInt16BE(requestCount, 0);
		requestCount += 1;
		data = Buffer.concat([requestCountBuffer, data]);

	
		if ([MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST, MIDEA_MESSAGE_TYPE.ENCRYPTED_RESPONSE].includes(msgtype)) {
			const sign = crypto.createHash('sha256').update(Buffer.concat([header, data])).digest();
			data = Buffer.concat([Security.aesCbcEncrypt(data, Buffer.from(lanSecurityContext.accessToken, 'hex')), sign]);
		}
	
		let encoded = Buffer.concat([header,  data])
		_LOGGER.debug("Security::encode8370() = " + encoded.toString('hex'));
		return { data: encoded, count: requestCount};
	}

	public static decode8370(lanSecurityContext: LANSecurityContext, data: Buffer): any[] {
		_LOGGER.debug("Security::decode8370()");
		if (data.length < 6) {
			return [[], data];
		}
	
		const header = data.slice(0, 6);
		if (header[0] !== 0x83 || header[1] !== 0x70) {
			_LOGGER.error('Not an 8370 message');
			throw new Error('not an 8370 message');
		}
		const size = header.readUInt16BE(2) + 8; // Include header size
		let leftover: Buffer = Buffer.alloc(0);
	
		if (data.length < size) {
			return [[], data];
		} else if (data.length > size) {
			leftover = data.slice(size);
			data = data.slice(0, size);
		}
	
		if (header[4] !== 0x20) {
			_LOGGER.error('Missing byte 4')
			throw new Error('missing byte 4');
		}
	
		const padding = header[5] >> 4;
		const msgtype = header[5] & 0xf;
		data = data.slice(6); // Skip header
	
		if ([MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST, MIDEA_MESSAGE_TYPE.ENCRYPTED_RESPONSE].includes(msgtype)) {
			const sign = data.slice(-32);
			data = data.slice(0, -32);
			data = Security.aesCbcDecrypt(data, Buffer.from(lanSecurityContext.accessToken, 'hex'));
	
			const computedSign = crypto.createHash('sha256').update(Buffer.concat([header, data])).digest();
			if (!sign.equals(computedSign)) {
				_LOGGER.error('Sign does not match');
				throw new Error('sign does not match');
			}
	
			if (padding) {
				data = data.slice(0, -padding);
			}
		}
	
		data = data.slice(2); // Skip response count
	
		if (leftover && leftover.length > 0) {
			const [packets, incomplete] = Security.decode8370(lanSecurityContext, leftover);
			return [[data, ...packets], incomplete];
		}
	
		let decoded = [data];
		_LOGGER.debug("Security::decode8370() = " + data.toString('hex'));
		return decoded;
	}

	public static async tcpKey(lanSecurityContext: LANSecurityContext, response: Buffer): Promise<LANSecurityContext> {
		_LOGGER.debug("Security::tcpKey()");
		return new Promise((resolve, reject) => {
			if (response.toString() === 'ERROR') {
				_LOGGER.error('Authentication failed');
				reject("Authentication failed");
			}
			if (response.length !== 64) {
				_LOGGER.error('Unexpected data length');
				reject('Unexpected data length');
			}
			const payload = response.slice(0, 32);
			const sign = response.slice(32);
			const plain = this.aesCbcDecrypt(payload, Buffer.from(lanSecurityContext.key, 'hex'));
			if (!crypto.timingSafeEqual(crypto.createHash('sha256').update(plain).digest(), sign)) {
			  _LOGGER.error('Sign does not match');
			  reject('Sign does not match');
			  return [Buffer.alloc(0), false];
			}

			lanSecurityContext.accessToken = Security.strxor(plain, Buffer.from(lanSecurityContext.key, 'hex')).toString('hex');
			_LOGGER.debug("Security::tcpKey() = " + lanSecurityContext.accessToken);
			resolve(lanSecurityContext);
		});

	  }

	  private static strxor(buf1: Buffer, buf2: Buffer): Buffer {
		return Buffer.from(buf1.map((b, i) => b ^ buf2[i]));
	  }
}
