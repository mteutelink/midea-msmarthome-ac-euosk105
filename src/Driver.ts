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
    /** Decode one discovery datagram without contacting the device or cloud. */
    public static parseDiscoveryResponse(message: Buffer, host: string): DeviceContext {
        let msg = message;
        const context = new DeviceContext();
        if (msg.length >= 2 && msg[0] === 0x83 && msg[1] === 0x70) {
            if (msg.length < 24) throw new Error('Truncated v3 discovery response');
            context.version = 3; msg = msg.subarray(8, -16);
        } else if (msg[0] === 0x5A && msg[1] === 0x5A) context.version = 2;
        else throw new Error('Unknown discovery header');
        if (msg.length < 72 || msg[0] !== 0x5A || msg[1] !== 0x5A) throw new Error('Invalid discovery packet');
        const data = Security.aesDecrypt(msg.subarray(40, -16));
        if (data.length < 41) throw new Error('Truncated discovery payload');
        const ssidLength = data[40];
        if (data.length < 69 + ssidLength) throw new Error('Truncated discovery fields');
        const id = msg.subarray(20,26);
        context.id = id.readUIntLE(0,6);
        context.applianceType = data[55 + ssidLength];
        context.ssid = data.subarray(41,41+ssidLength).toString();
        context.macAddress = [...data.subarray(63+ssidLength,69+ssidLength)]
            .map(byte => byte.toString(16).padStart(2,'0')).join(':');
        context.host = host; context.port = data.readUInt32LE(4);
        if (!context.port || context.port > 65535) throw new Error('Invalid discovery port');
        context.serial = data.subarray(8,40).toString();
        if (data.length >= 75 + ssidLength) context.firmware = [...data.subarray(72+ssidLength,75+ssidLength)].join('.');
        if (context.version === 3) {
            const hash = crypto.createHash('sha256').update(Buffer.from(id).reverse()).digest();
            context.udpId = Buffer.from(hash.subarray(0,16).map((value,index)=>value^hash[index+16])).toString('hex');
        }
        return context;
    }

    public static async listDevices(): Promise<Device[]> {
        return new Promise((resolve, reject) => {
            const devices = new Map<number,Device>();
            const client = udp.createSocket('udp4');
            let done = false;
            const finish = (error?: Error) => {
                if (done) return; done = true; clearTimeout(timer);
                try { client.close(); } catch { /* Binding may have failed. */ }
                if (error) reject(error); else resolve([...devices.values()]);
            };
            const timer = setTimeout(() => finish(),2000);
            client.on('error',finish);
            client.on('message',(msg,info)=>{
                try {
                    const context = Driver.parseDiscoveryResponse(msg,info.address);
                    if (context.applianceType === MIDEA_APPLIANCE_TYPE.AIRCONDITIONER)
                        devices.set(context.id,new Device(context));
                } catch { /* Ignore unrelated or malformed UDP broadcasts. */ }
            });
            client.bind({},()=>{
                try {
                    client.setBroadcast(true);
                    for (const port of [6445,20086]) client.send(MIDEA_DISCOVER_BROADCAST_MSG,port,'255.255.255.255',error=>{
                        if (error) finish(error);
                    });
                } catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
            });
        });
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

			if (device.deviceContext.version === 2) return device;

			let lanSecurityContext: LANSecurityContext = await Driver.retrieveTokenAndKeyFromCloud(device, cloudSecurityContext);
			await device.authenticate(lanSecurityContext);
			return device;
		} catch (error) {
			throw new Error("Exception during device discovery [" + error + "]");
		}
	}

	public static async retrieveTokenAndKeyFromCloud(device: Device, cloudSecurityContext: CloudSecurityContext | null): Promise<LANSecurityContext> {
		// Behoud de bestaande standaard als geen context is meegegeven.
		const context = cloudSecurityContext ?? new CloudSecurityContext(
			NETHOMEPLUS_DEFAULT_ACCOUNT,
			NETHOMEPLUS_DEFAULT_PASSWORD,
			CONNECTION_TYPE.NETHOMEPLUS
		);

		// Respecteer de gekozen provider.
		const connection = context.getCloudConnection(device);
		const authenticated = await connection.authenticate(context);

		let credential: string;

		switch (authenticated.connectionType) {
			case CONNECTION_TYPE.MSMARTHOME:
				credential = authenticated.accessToken;
				break;
			case CONNECTION_TYPE.NETHOMEPLUS:
				credential = authenticated.sessionId;
				break;
			default:
				throw new Error("Unsupported cloud connection type");
		}

		if (!credential) {
			throw new Error(
				"Cloud login returned no access token or session ID"
			);
		}

		const tokenAndKey = await connection._getTokenAndKey(
			credential,
			device.deviceContext.udpId
		);

		return new LANSecurityContext(tokenAndKey.token, tokenAndKey.key);
	}

}
