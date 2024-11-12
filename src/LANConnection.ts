"use strict";

import { MIDEA_MESSAGE_TYPE } from './Constants';
import { Security } from './Security';
import { DeviceContext } from "./DeviceContext";
import { SecurityContext } from "./SecurityContext";
import { _LOGGER } from './Logger';
import { Socket } from 'net';

export class LANConnection {
	private _deviceContext: DeviceContext;
	private _socket: any;
	private _requestCount: number = 0;

	constructor(deviceContext: DeviceContext) {
		this._deviceContext = deviceContext;
		this._socket = null;
	}

	private async _connect(): Promise<Socket> {
		_LOGGER.info("LANConnection::_connect()");
		if (this._socket) {
			return (this._socket);
		}

		this._disconnect();

		_LOGGER.http(`Attempting new connection to ${this._deviceContext.host}:${this._deviceContext.port}`);
		return new Promise((resolve, reject) => {
			const socket = new Socket();
			socket.setTimeout(5000);

			socket.on('error', (error: Error) => {
				_LOGGER.error(`Connect Error: ${this._deviceContext.host}:${this._deviceContext.port} ${error}`);
				this._disconnect();
				reject(error);
			});

			socket.connect(this._deviceContext.port, this._deviceContext.host, () => {
				_LOGGER.http(`Connected to ${socket.localAddress}:${socket.localPort}`);
				this._socket = socket;
				resolve(this._socket);
			});
		});
	}

	private _disconnect() {
		_LOGGER.info("LANConnection::_disconnect()");
		if (this._socket) {
			this._socket.destroy();
			this._socket = null;
		}
	}

	private async _executeRequest(message: Buffer): Promise<Buffer> {
		_LOGGER.info("LANConnection::_executeRequest()");

		return new Promise((resolve, reject) => {
			return this._connect().then(socket => {

				_LOGGER.http(`Sending message: ${message.toString('hex')}`);
				socket.write(message, (err) => {
					if (err) {
						_LOGGER.error(`Send Error: ${err}`);
						this._disconnect();
						reject(err);
					}

					this._socket.once('data', (response: Buffer) => {
						_LOGGER.http(`Received response: ${response.toString('hex')}`);
						if (response.length === 0) {
							_LOGGER.error(`Server Closed Socket`);
							this._disconnect();
							reject();
						}
						resolve(response);
					});

					this._socket.once('timeout', () => {
						_LOGGER.info('Socket timed out');
						this._disconnect();
						resolve(Buffer.alloc(0));
					});
				});
			});
		});
	}


	public async authenticate(securityContext: SecurityContext): Promise<SecurityContext> {
		_LOGGER.info("LANConnection::authenticate()");

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
			_LOGGER.debug("LanConnection::_authenticate() = " + JSON.stringify(updatedSecurityContext));
			return updatedSecurityContext;
		} catch (error) {
			_LOGGER.error("Authentication failed:", error);
			throw error;
		}
	}

	public async executeCommand(securityContext: SecurityContext, request: Buffer, messageType: MIDEA_MESSAGE_TYPE = MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST) {
		_LOGGER.info("LanConnection::executeCommand()");
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
			_LOGGER.error("executeCommand failed:", error);
			throw error;
		}
	}
}