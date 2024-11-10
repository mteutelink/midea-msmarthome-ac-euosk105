"use strict";

import { MIDEA_DISCOVER_BROADCAST_MSG, MIDEA_APPLIANCE_TYPE } from './Constants';
import { Security } from './Security';
import { Device } from './Device';
import { DeviceContext } from './DeviceContext';
import { logger } from './Logger';
import crypto from 'crypto';
import udp from 'dgram';

export class DeviceAPI {
	public static async discoverDevices(): Promise<DeviceContext[]> {
		logger.info("DeviceAPI::list()");

		let contexts: DeviceContext[] = [];
		const client: udp.Socket = udp.createSocket('udp4')
			.bind({}, () => {
				client.setBroadcast(true);

				client.send(MIDEA_DISCOVER_BROADCAST_MSG, 0, MIDEA_DISCOVER_BROADCAST_MSG.length, 6445, '255.255.255.255', error => {
					if (error) {
						logger.error(error);
						client.close();
					}
				});
			})
			.on('message', async (msg, info) => {
				if (msg[0] !== 0x83 || msg[1] !== 0x70) {
					throw new Error('not an 8370 message');
				}
				msg = msg.subarray(8, msg.length - 16);

				if (msg[0] === 0x5A && msg.length >= 104) {
					const data = Security.aesDecrypt(msg.subarray(40, msg.length - 16));

					let applianceType: number = data[55 + data[40]];
					if (applianceType == MIDEA_APPLIANCE_TYPE.AIRCONDITIONER) {
						let context = new DeviceContext();
						const _id = msg.subarray(20, 26).toString('hex').match(/../g)!.reverse().join('');
						context.id = parseInt(_id, 16);
						context.ssid = data.subarray(41, 41 + data[40]).toString();
						context.macAddress = `${data[63 + data[40]].toString(16)}:${data[64 + data[40]].toString(16)}:${data[65 + data[40]].toString(16)}:${data[66 + data[40]].toString(16)}:${data[67 + data[40]].toString(16)}:${data[68 + data[40]].toString(16)}`;
						context.host = info.address;
						context.port = parseInt(data.subarray(4, 8).toString('hex').match(/../g)!.reverse().join(''), 16);
						context.serial = data.subarray(8, 40).toString();
						context.firmware = `${data[72 + data[40]]}.${data[73 + data[40]]}.${data[74 + data[40]]}`;
						{
							const hash = crypto.createHash('sha256').update(Buffer.from(_id, 'hex')).digest();
							const b1 = hash.slice(0, 16);
							const b2 = hash.slice(16);
							const b3 = Buffer.alloc(16);
						
							for (let i = 0; i < b1.length; i++) {
								b3[i] = b1[i] ^ b2[i];
							}
							context.udpId =  b3.toString('hex');
						}
						contexts.push(context);
					}
				}
			});

		return new Promise((resolve) => setTimeout(() => {
			client.close();
			resolve(contexts);
		}, 2000));
	}

	public static async getDevice(id: number): Promise<Device> {
		logger.info("DeviceAPI::getDevice()");
		
		const devices = await DeviceAPI.discoverDevices();
		const deviceContext = devices.find((deviceContext) => id === deviceContext.id);
		if (!deviceContext) {
			logger.error(`Device with id ${id} not found`);
			throw new Error(`Device with id ${id} not found`);
		}
		return new Device(deviceContext);
	}
}