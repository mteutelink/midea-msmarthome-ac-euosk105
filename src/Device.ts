"use strict";

import { DeviceContext } from './DeviceContext';
import { SecurityContext } from './SecurityContext';
import { CloudConnection } from './CloudConnection';
import { LANConnection } from './LANConnection';
import { _LOGGER } from './Logger';

export class Device {
	private _deviceContext: DeviceContext;
	private _cloudConnection: CloudConnection;
	private _lanConnection: LANConnection;

	constructor(deviceContext: DeviceContext) {
		this._deviceContext = deviceContext;
		this._cloudConnection = new CloudConnection(this._deviceContext);
		this._lanConnection = new LANConnection(this._deviceContext);
	}

	public get deviceContext(): DeviceContext {
		return this._deviceContext;
	}

	public get cloudConnection(): CloudConnection {
		return this._cloudConnection;
	}

	public get lanConnection(): LANConnection {
		return this._lanConnection;
	}

	public async authenticate(account: string, password: string): Promise<SecurityContext> {
		_LOGGER.info("Device::authenticate()");
		this._cloudConnection = new CloudConnection(this._deviceContext);
		return this._cloudConnection.authenticate(account, password).then(securityContext => {
			return this._lanConnection.authenticate(securityContext);
		})
	}
}