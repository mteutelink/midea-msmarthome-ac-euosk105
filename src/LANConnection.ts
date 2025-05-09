"use strict";

import { MIDEA_MESSAGE_TYPE } from './MideaConstants';
import { Security } from './Security';
import { LANSecurityContext } from "./LANSecurityContext";
import { _LOGGER } from './Logger';
import { Socket } from 'net';
import { Device } from './Device';

export class LANConnection {
	private readonly _device: Device;
	private _socket: Socket | null;
	private _requestCount: number = 0;
	private _numberOfRetries: number = 0;
	private readonly MAX_NUMBER_OF_RETRIES: number = 3;

	constructor(device: Device) {
		this._device = device;
		this._socket = null;
	}

	private async _connect(): Promise<Socket> {
		_LOGGER.debug("LANConnection::_connect()");
		if (this._socket) {
			return (this._socket);
		}

		this._disconnect();

		_LOGGER.http(`Attempting new connection to ${this._device.deviceContext.host}:${this._device.deviceContext.port}`);
		return new Promise((resolve, reject) => {
			const socket = new Socket();
			socket.setTimeout(30000);

			socket.on('error', (error: Error) => {
				_LOGGER.error(`Connect Error: ${this._device.deviceContext.host}:${this._device.deviceContext.port} ${error}`);
				this._disconnect();
				reject(error instanceof Error ? error : new Error(String(error)));
			});

			socket.connect(this._device.deviceContext.port, this._device.deviceContext.host, () => {
				_LOGGER.http(`Connected to ${socket.localAddress}:${socket.localPort}`);
				this._socket = socket;
				resolve(this._socket);
			});
		});
	}

	private _disconnect() {
		_LOGGER.debug("LANConnection::_disconnect()");
		if (this._socket) {
			this._socket.end();
			this._socket = null;
		}
	}

	private async _executeRequest(message: Buffer): Promise<Buffer> {
		_LOGGER.debug("LANConnection::_executeRequest()");

		return new Promise((resolve, reject) => {
			return this._connect().then(socket => {

				_LOGGER.http(`Sending message: ${message.toString('hex')}`);
				socket.write(message, (error) => {
					if (error) {
						_LOGGER.error(`Send Error: ${error}`);
						this._disconnect();
						reject(error instanceof Error ? error : new Error(String(error)));
					}

					socket.once('data', (response: Buffer) => {
						_LOGGER.http(`Received response: ${response.toString('hex')}`);
						if (response.length === 0) {
							_LOGGER.error(`Server Closed Socket`);
							this._disconnect();
							reject(new Error("Server closed the socket unexpectedly"));
						}
						resolve(response);
					});

					socket.once('timeout', () => {
						_LOGGER.debug('Socket timed out');
						this._disconnect();
						resolve(Buffer.alloc(0));
					});
				});
			}).catch((error) => {
				_LOGGER.error(`Connection Error: ${error}`);
				this._disconnect();
				reject(error instanceof Error ? error : new Error(String(error)));
			})
		});
	}


	public async authenticate(lanSecurityContext: LANSecurityContext): Promise<LANSecurityContext> {
		_LOGGER.debug("LANConnection::authenticate()");

		return new Promise((resolve, reject) => {
			const encoded = Security.encode8370(
				lanSecurityContext,
				Buffer.from(lanSecurityContext.token, 'hex'),
				this._requestCount,
				MIDEA_MESSAGE_TYPE.HANDSHAKE_REQUEST
			);

			this._requestCount = encoded.count;

			return this._executeRequest(encoded.data).then((response: Buffer) => {
				const tcpKeyData = response.slice(8, 72);
				return Security.tcpKey(lanSecurityContext, tcpKeyData).then((updatedSecurityContext: LANSecurityContext) => {
					_LOGGER.debug("LanConnection::authenticate() = " + JSON.stringify(updatedSecurityContext));
					this._device.lanSecurityContext = updatedSecurityContext;
					this._requestCount = 0;
					resolve(updatedSecurityContext);
				}).catch((error) => {
					_LOGGER.error("Error during TCP key generation:", error);
					this._disconnect();
					reject(error instanceof Error ? error : new Error(String(error)));
				});
			}).catch((error) => {
				_LOGGER.error("Error during authentication:", error);
				this._disconnect();
				reject(error instanceof Error ? error : new Error(String(error)));
			});
		});
	}

	public close(): void {
		this._disconnect();
	}

	public async executeCommand(request: Buffer, messageType: MIDEA_MESSAGE_TYPE = MIDEA_MESSAGE_TYPE.ENCRYPTED_REQUEST): Promise<any> {
		_LOGGER.debug("LanConnection::executeCommand()");
		return new Promise((resolve, reject) => {
			if (!this._device.lanSecurityContext) {
				reject(new ReferenceError("Not authenticated exception"));
			}

			if (!this._socket) {
				return this.authenticate(this._device.lanSecurityContext).then((updatedLanSecurityContext) => {
					this._device.lanSecurityContext = updatedLanSecurityContext;
					return this.executeCommand(request, messageType);
				}).catch((error) => {
					_LOGGER.error("Error during authentication:", error);
					this._disconnect();
					reject(error instanceof Error ? error : new Error(String(error)));
				});
			}

			const encoded = Security.encode8370(
				this._device.lanSecurityContext,
				request,
				this._requestCount,
				messageType
			);

			this._requestCount = encoded.count;

			return this._executeRequest(encoded.data).then((response: Buffer) => {
				if (response.length === 0) {
					_LOGGER.error(`Server Closed Socket`);
					this._disconnect();
					reject(new Error("Server closed the socket unexpectedly"));
				} else if (response.length < 13 || response.subarray(8, 13).equals(Buffer.from("ERROR", 'utf8'))) {
					if (++this._numberOfRetries <= this.MAX_NUMBER_OF_RETRIES) {
						_LOGGER.debug("RETRYING [" + this._numberOfRetries + "]");
						this._disconnect();
						return this.executeCommand(request, messageType);
					} else {
						_LOGGER.error("Error occured during command execution; retried but nothing helps");
						this._disconnect();
						reject(new Error("Error occured during command execution"));
					}
				} else {
					this._numberOfRetries = 0;
					const decodedResponses: Buffer[] = Security.decode8370(this._device.lanSecurityContext, response);
					const packets: Buffer[] = [];
					decodedResponses.forEach(response => {
						if (response.length > 40 + 16) {
							response = Security.aesDecrypt(response.slice(40, -16));
						}
						if (response.length > 10) {
							packets.push(response);
						}
					});
					resolve(packets);
				}
			}).catch((error) => {
				_LOGGER.error("Error during command execution:", error);
				this._disconnect();
				reject(error instanceof Error ? error : new Error(String(error)));
			});
		});
	}
}