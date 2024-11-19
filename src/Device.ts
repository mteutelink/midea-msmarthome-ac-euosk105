"use strict";

import { DeviceContext } from './DeviceContext';
import { SecurityContext } from './SecurityContext';
import { CloudConnection } from './CloudConnection';
import { LANConnection } from './LANConnection';
import { _LOGGER } from './Logger';

export class Device {
	private readonly _deviceContext: DeviceContext;
	private _cloudConnection: CloudConnection;
	private readonly _lanConnection: LANConnection;

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

	public async authenticate(securityContext: SecurityContext): Promise<SecurityContext> {
		_LOGGER.debug("Device::authenticate()");
		return this._cloudConnection.authenticate(securityContext).then(securityContext => {
			return this._lanConnection.authenticate(securityContext);
		})
	}
}