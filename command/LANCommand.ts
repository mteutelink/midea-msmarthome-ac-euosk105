"use strict";

import { MIDEA_APPLIANCE_TYPE, FRAME_TYPE } from '../Constants';
import { Device } from '../Device';
import { Security } from '../Security';
import { SecurityContext } from '../SecurityContext';
import { logger } from '../Logger';
import dateFormat from 'dateformat';
import { Command } from './Command';

export abstract class LANCommand implements Command {
	protected _device: Device;
	private _request: Buffer;
	static _messageId: number = 0;

	private CRC8_854_TABLE = [
		0x00, 0x5E, 0xBC, 0xE2, 0x61, 0x3F, 0xDD, 0x83,
		0xC2, 0x9C, 0x7E, 0x20, 0xA3, 0xFD, 0x1F, 0x41,
		0x9D, 0xC3, 0x21, 0x7F, 0xFC, 0xA2, 0x40, 0x1E,
		0x5F, 0x01, 0xE3, 0xBD, 0x3E, 0x60, 0x82, 0xDC,
		0x23, 0x7D, 0x9F, 0xC1, 0x42, 0x1C, 0xFE, 0xA0,
		0xE1, 0xBF, 0x5D, 0x03, 0x80, 0xDE, 0x3C, 0x62,
		0xBE, 0xE0, 0x02, 0x5C, 0xDF, 0x81, 0x63, 0x3D,
		0x7C, 0x22, 0xC0, 0x9E, 0x1D, 0x43, 0xA1, 0xFF,
		0x46, 0x18, 0xFA, 0xA4, 0x27, 0x79, 0x9B, 0xC5,
		0x84, 0xDA, 0x38, 0x66, 0xE5, 0xBB, 0x59, 0x07,
		0xDB, 0x85, 0x67, 0x39, 0xBA, 0xE4, 0x06, 0x58,
		0x19, 0x47, 0xA5, 0xFB, 0x78, 0x26, 0xC4, 0x9A,
		0x65, 0x3B, 0xD9, 0x87, 0x04, 0x5A, 0xB8, 0xE6,
		0xA7, 0xF9, 0x1B, 0x45, 0xC6, 0x98, 0x7A, 0x24,
		0xF8, 0xA6, 0x44, 0x1A, 0x99, 0xC7, 0x25, 0x7B,
		0x3A, 0x64, 0x86, 0xD8, 0x5B, 0x05, 0xE7, 0xB9,
		0x8C, 0xD2, 0x30, 0x6E, 0xED, 0xB3, 0x51, 0x0F,
		0x4E, 0x10, 0xF2, 0xAC, 0x2F, 0x71, 0x93, 0xCD,
		0x11, 0x4F, 0xAD, 0xF3, 0x70, 0x2E, 0xCC, 0x92,
		0xD3, 0x8D, 0x6F, 0x31, 0xB2, 0xEC, 0x0E, 0x50,
		0xAF, 0xF1, 0x13, 0x4D, 0xCE, 0x90, 0x72, 0x2C,
		0x6D, 0x33, 0xD1, 0x8F, 0x0C, 0x52, 0xB0, 0xEE,
		0x32, 0x6C, 0x8E, 0xD0, 0x53, 0x0D, 0xEF, 0xB1,
		0xF0, 0xAE, 0x4C, 0x12, 0x91, 0xCF, 0x2D, 0x73,
		0xCA, 0x94, 0x76, 0x28, 0xAB, 0xF5, 0x17, 0x49,
		0x08, 0x56, 0xB4, 0xEA, 0x69, 0x37, 0xD5, 0x8B,
		0x57, 0x09, 0xEB, 0xB5, 0x36, 0x68, 0x8A, 0xD4,
		0x95, 0xCB, 0x29, 0x77, 0xF4, 0xAA, 0x48, 0x16,
		0xE9, 0xB7, 0x55, 0x0B, 0x88, 0xD6, 0x34, 0x6A,
		0x2B, 0x75, 0x97, 0xC9, 0x4A, 0x14, 0xF6, 0xA8,
		0x74, 0x2A, 0xC8, 0x96, 0x15, 0x4B, 0xA9, 0xF7,
		0xB6, 0xE8, 0x0A, 0x54, 0xD7, 0x89, 0x6B, 0x35
	];

	constructor(device: Device, command: Buffer, frameType: FRAME_TYPE = FRAME_TYPE.REQUEST) {
		this._device = device;
		this._request = this._createRequest(this._createCommand(command, frameType));
	}

	private _calculateCRC(data: Buffer): number {
		logger.info("Command::_calculateCheckSum()");
		let crcValue = 0;
		for (let m of data) {
			let k = crcValue ^ m;
			if (k > 256) k -= 256;
			if (k < 0) k += 256;
			crcValue = this.CRC8_854_TABLE[k];
		}
		logger.debug("Command::_calculateCheckSum() = " + crcValue);
		return crcValue;
	}

	private _calculateCheckSum(data: Buffer): number {
		logger.info("Command::_calculateCheckSum()");
		const sum = data.slice(1).reduce((acc, byte) => acc + byte, 0);
		const checksum = (~sum + 1) & 0xFF;
		logger.debug("Command::_calculateCheckSum() = " + checksum);
		return checksum;
	}

	private _calculatePacketTime(): Buffer {
		logger.info("Command::_calculatePacketTime()");
		const t = dateFormat(new Date(), "yyyymmddHHMMss").padEnd(16);
		const buffer = Buffer.alloc(8);
		for (let i = 0; i < t.length; i += 2) {
			buffer.writeUInt8(parseInt(t.substr(i, 2), 10), 7 - (i / 2));
		}
		logger.debug("Command::_calculatePacketTime() = " + buffer.toString('hex'));
		return buffer
	}

	static _calculcateMessageId(): number {
		logger.info("Command::_calculcateMessageId()");
		LANCommand._messageId += 1;
		const messageId = LANCommand._messageId & 0xFF;
		logger.debug("Command::_calculcateMessageId() = " + messageId);
		return messageId;
	  }

	private _createCommand(data: Buffer, frameType: FRAME_TYPE = FRAME_TYPE.REQUEST): Buffer {
		logger.info("Command::_createCommand()");
		// Create payload with message ID
		const payload = Buffer.concat([data, Buffer.from([LANCommand._calculcateMessageId()])]);

		// Append CRC to payload
		const payloadCRC = Buffer.concat([payload, Buffer.from([this._calculateCRC(payload)])]);

		// Calculate total length including header, payload, and CRC
		const length = 10 + payloadCRC.length;

		// Build frame header
		const header = Buffer.from([
			0xAA, // Start byte
			length, // Length of payload and header
			MIDEA_APPLIANCE_TYPE.AIRCONDITIONER, // Device/appliance type
			MIDEA_APPLIANCE_TYPE.AIRCONDITIONER ^ length, // Frame checksum (sync?)
			0x00, 0x00, // Reserved
			0x00, // Frame ID
			0x00, // Frame protocol version
			0x00, // Device protocol version
			frameType // Frame type
		]);

		// Combine header and payload with CRC
		const frame = Buffer.concat([header, payloadCRC]);

		// Append total frame checksum
		const checksum = Buffer.from([this._calculateCheckSum(frame)]);
		const frameWithChecksum = Buffer.concat([frame, checksum]);

		logger.debug("Command::_createCommand() = " + frameWithChecksum.toString('hex'));
		return frameWithChecksum;
	}

	private _createRequest(command: Buffer): Buffer {
		logger.info("Command::_createRequest()");
		// INITIALIZE PACKET
		let packet: Buffer = Buffer.from([
			// 2 bytes - StaticHeader
			0x5a, 0x5a,
			// 2 bytes - mMessageType
			0x01, 0x11,
			// 2 bytes - PacketLength
			0x00, 0x00,
			// 2 bytes
			0x20, 0x00,
			// 4 bytes - MessageId
			0x00, 0x00, 0x00, 0x00,
			// 8 bytes - Date & Time
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// 8 bytes - mDeviceID
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// 12 bytes
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
		]);
		packet.set(this._calculatePacketTime(), 12); // Set the packet time

		const buffer = Buffer.alloc(8); // Allocate 8 bytes
		buffer.writeBigUInt64LE(BigInt(this._device.deviceContext.id), 0); // Write the integer in little-endian format
		packet.set(buffer, 20);

		// ENCRYPT COMMAND
		const encryptedCommand = Security.aesEncrypt(command).slice(0, 48);
		packet = Buffer.concat([packet, encryptedCommand]);

		const length = Buffer.alloc(2);
		length.writeUInt16LE(packet.length + 16, 0);
		packet.set(length, 4);

		const checksum = Security.encode32(packet);
		packet = Buffer.concat([packet, checksum]);

		logger.debug("Command::_createRequest() = " + packet.toString('hex'));
		return packet;
	}

	public async execute(securityContext: SecurityContext): Promise<any> {
		logger.info("Command::execute()");
		return this._device.lanConnection.executeCommand(securityContext, this._request);
	}
}