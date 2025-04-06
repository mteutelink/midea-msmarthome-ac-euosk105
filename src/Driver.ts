"use strict";

import { MIDEA_DISCOVER_BROADCAST_MSG, MIDEA_APPLIANCE_TYPE } from './MideaConstants';
import { Security } from './Security';
import { Device } from './Device';
import { DeviceContext } from './DeviceContext';
import { CloudConnection } from './CloudConnection';
import { LANSecurityContext } from './LANSecurityContext';
import { CloudSecurityContext, CONNECTION_TYPE } from './CloudSecurityContext';
import { _LOGGER } from './Logger';
import crypto from 'crypto';
import udp from 'dgram';
import util from 'util';
import { NETHOMEPLUS_DEFAULT_ACCOUNT, NETHOMEPLUS_DEFAULT_PASSWORD } from './NetHomePlusConstants';

export class Driver {
	public static async listDevices(): Promise<Device[]> {
		_LOGGER.debug("Driver::listDevices()");

		let devices: Device[] = [];
		const client: udp.Socket = udp.createSocket('udp4')
			.bind({}, () => {
				client.setBroadcast(true);

				client.send(MIDEA_DISCOVER_BROADCAST_MSG, 0, MIDEA_DISCOVER_BROADCAST_MSG.length, 6445, '255.255.255.255', error => {
					if (error) {
						_LOGGER.error(error);
						client.close();
					}
				});
			})
			.on('message', async (msg, info) => {
				try {
					_LOGGER.debug("Broadcasting returns '" + msg.toString('hex') + "'");

					let context = new DeviceContext();

					// DETERMINE VERSION
					if (msg[0] === 0x83 || msg[1] === 0x70) {
						context.version = 3;
						msg = msg.subarray(8, msg.length - 16);
					} else
					if (msg[0] === 0x5A || msg[1] === 0x5A) {
						context.version = 2;
					}

					if (msg[0] === 0x5A && msg.length >= 104) {
						const data = Security.aesDecrypt(msg.subarray(40, msg.length - 16));

						context.applianceType = data[55 + data[40]];
						const _id = msg.subarray(20, 26).toString('hex').match(/../g)!.reverse().join('');
						context.id = parseInt(_id, 16);
						context.ssid = data.subarray(41, 41 + data[40]).toString();
						context.macAddress = `${data[63 + data[40]].toString(16)}:${data[64 + data[40]].toString(16)}:${data[65 + data[40]].toString(16)}:${data[66 + data[40]].toString(16)}:${data[67 + data[40]].toString(16)}:${data[68 + data[40]].toString(16)}`;
						context.host = info.address;
						context.port = parseInt(data.subarray(4, 8).toString('hex').match(/../g)!.reverse().join(''), 16);
						context.serial = data.subarray(8, 40).toString();
						context.firmware = `${data[72 + data[40]]}.${data[73 + data[40]]}.${data[74 + data[40]]}`;
						
						if (context.version === 3) {
							const hash = crypto.createHash('sha256').update(Buffer.from(_id, 'hex')).digest();
							const b1 = hash.subarray(0, 16);
							const b2 = hash.subarray(16);
							const b3 = Buffer.alloc(16);
						
							for (let i = 0; i < b1.length; i++) {
								b3[i] = b1[i] ^ b2[i];
							}
							context.udpId =  b3.toString('hex');
						}
						
						if ((context.version === 3) && (context.applianceType === MIDEA_APPLIANCE_TYPE.AIRCONDITIONER)) {
							_LOGGER.info("ADDING [" + util.inspect(context) + "]");
							devices.push(new Device(context));
						} else {
							_LOGGER.info("IGNORING [" + util.inspect(context) + "]");
						}
					} else {
						_LOGGER.error("Message '" + msg.toString('hex') + "' not recognized");
					}
				} catch(error) {
					_LOGGER.info("IGNORING BECAUSE OF ERROR [" + error + "]");
					// SKIP
				}
			});

		return new Promise((resolve) => setTimeout(() => {
			client.close();
			resolve(devices);
		}, 2000));
	}

	public static async getDevice(id: number, cloudSecurityContext: CloudSecurityContext): Promise<Device> {
		_LOGGER.debug("Driver::getDevice(" + id + ")");
		try {
			const devices = await Driver.listDevices();
			const device = devices.find((device) => id === device.deviceContext.id);
			if (!device) {
				_LOGGER.error(`Device with id ${id} not found`);
				throw new Error(`Device with id ${id} not found`);
			}

			let lanSecurityContext: LANSecurityContext = await Driver.retrieveTokenAndKeyFromCloud(device, cloudSecurityContext);
			await device.authenticate(lanSecurityContext);
			return device; 
		} catch(error) {
			throw new Error("Exception during device discovery [" + error + "]");
		}
	}

	public static async retrieveTokenAndKeyFromCloud(device: Device, cloudSecurityContext: CloudSecurityContext | null): Promise<LANSecurityContext> {
		// MSMARTHOME HAS SHUT DOWN THE TOKEN API SERVICE: TOKENS AND KEYS SHOULD ALWAYS BE RETRIEVED VIA NETHOME PLUs
		let updatedCloudSecurityContext: CloudSecurityContext = cloudSecurityContext;
		if (!cloudSecurityContext || cloudSecurityContext.connectionType === CONNECTION_TYPE.MSMARTHOME) {
			updatedCloudSecurityContext = new CloudSecurityContext(NETHOMEPLUS_DEFAULT_ACCOUNT, NETHOMEPLUS_DEFAULT_PASSWORD, CONNECTION_TYPE.NETHOMEPLUS)
		}
		let cloudConnection: CloudConnection = updatedCloudSecurityContext.getCloudConnection(device);

		updatedCloudSecurityContext = await cloudConnection.authenticate(updatedCloudSecurityContext);

		const tokenAndKey = await cloudConnection._getTokenAndKey(
			updatedCloudSecurityContext.sessionId,
			device.deviceContext.udpId
		);
		_LOGGER.debug("Driver::retrieveTokenAndKeyFromCloud(" + device.deviceContext.id + ",  ***) ==> token=" + tokenAndKey.token + ", key=" + tokenAndKey.key);

		return new LANSecurityContext(tokenAndKey.token, tokenAndKey.key)
	}
}