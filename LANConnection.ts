"use strict";

import { Security } from './Security';
import { DeviceContext } from "./DeviceContext";
import { SecurityContext } from "./SecurityContext";
import { Socket } from 'net';
import { logger } from './Logger';

import { MIDEA_MESSAGE_TYPE, MSMARTHOME_SIGN_KEY, MSMARTHOME_APP_KEY, MSMARTHOME_IOT_KEY, MSMARTHOME_HMAC_KEY } from './Constants';

export class LANConnection {
	private _deviceContext: DeviceContext;
	private _socket: any;
	private _requestCount: number = 0;

	constructor(deviceContext: DeviceContext) {
		this._deviceContext = deviceContext;
		this._socket = null;
	}

	private async _connect(): Promise<Socket> {
		logger.info("LANConnection::_connect()");
		if (this._socket) {
			return (this._socket);
		}

		this._disconnect();

		logger.http(`Attempting new connection to ${this._deviceContext.host}:${this._deviceContext.port}`);
		return new Promise((resolve, reject) => {
			const socket = new Socket();
			socket.setTimeout(5000);

			socket.on('error', (error: Error) => {
				logger.error(`Connect Error: ${this._deviceContext.host}:${this._deviceContext.port} ${error}`);
				this._disconnect();
				reject(error);
			});

			socket.connect(this._deviceContext.port, this._deviceContext.host, () => {
				logger.http(`Connected to ${socket.localAddress}:${socket.localPort}`);
				this._socket = socket;
				resolve(this._socket);
			});
		});
	}

	private _disconnect() {
		logger.info("LANConnection::_disconnect()");
		if (this._socket) {
			this._socket.destroy();
			this._socket = null;
		}
	}

	private async _executeRequest(message: Buffer): Promise<Buffer> {
		logger.info("LANConnection::_executeRequest()");

		return new Promise((resolve, reject) => {
			return this._connect().then(socket => {

				logger.http(`Sending message: ${message.toString('hex')}`);
				socket.write(message, (err) => {
					if (err) {
						logger.error(`Send Error: ${err}`);
						this._disconnect();
						reject(err);
					}

					this._socket.once('data', (response: Buffer) => {
						logger.http(`Received response: ${response.toString('hex')}`);
						if (response.length === 0) {
							logger.error(`Server Closed Socket`);
							this._disconnect();
							reject();
						}
						resolve(response);
					});

					this._socket.once('timeout', () => {
						logger.info('Socket timed out');
						this._disconnect();
						resolve(Buffer.alloc(0));
					});
				});
			});
		});
	}


	public async authenticate(securityContext: SecurityContext): Promise<SecurityContext> {
		logger.info("LANConnection::authenticate()");

		try {
			const encoded = Security.encode8370(
				securityContext,
				Buffer.from(securityContext.token, 'hex'),
				this._requestCount,
				MIDEA_MESSAGE_TYPE.HANDSHAKE_REQUEST
			);

			this._requestCount = encoded.count;

			const response = await this._executeRequest(encoded.data);
			const tcpKeyData = response.slice(8, 72);

			const updatedSecurityContext = await Security.tcpKey(securityContext, tcpKeyData);

			this._requestCount = 0;
			logger.debug("LanConnection::_authenticate() = " + JSON.stringify(updatedSecurityContext));
			return updatedSecurityContext;
		} catch (error) {
			logger.error("Authentication failed:", error);
			throw error;
		}
	}

	public async executeCommand(securityContext: SecurityContext, request: Buffer, messageType: MIDEA_MESSAGE_TYPE = MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST) {
		logger.info("LanConnection::executeCommand()");
		try {
			const encoded = Security.encode8370(
				securityContext,
				request,
				this._requestCount,
				messageType
			);

			this._requestCount = encoded.count;

			const response = await this._executeRequest(encoded.data);
			const decodedResponses: Buffer[] = Security.decode8370(securityContext, response); 
			const packets: Buffer[] = [];

			decodedResponses.forEach(response => {
				if (response.length > 40 + 16) {
					response = Security.aesDecrypt(response.slice(40, -16));
				}
				if (response.length > 10) {
					packets.push(response);
				}
			});

			return (packets);
		} catch (error) {
			logger.error("executeCommand failed:", error);
			throw error;
		}
	}
}