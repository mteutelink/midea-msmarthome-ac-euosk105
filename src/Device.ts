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
	private _securityContext: SecurityContext = null;

	constructor(deviceContext: DeviceContext) {
		this._deviceContext = deviceContext;
		this._cloudConnection = new CloudConnection(this);
		this._lanConnection = new LANConnection(this);
	}

	// DEVICECONTEXT
	public get deviceContext(): DeviceContext {
		return this._deviceContext;
	}

	// CLOUDCONNECTION
	public get cloudConnection(): CloudConnection {
		return this._cloudConnection;
	}

	// LANCONNECTION
	public get lanConnection(): LANConnection {
		return this._lanConnection;
	}

	// SECURITYCONTEXT
	public get securityContext(): SecurityContext | undefined {
		return this._securityContext;
	}

	public set securityContext(value: SecurityContext | undefined) {
		this._securityContext = value;
	}

	public async authenticate(securityContext: SecurityContext): Promise<SecurityContext> {
		_LOGGER.debug("Device::authenticate()");
		this._securityContext = await this._cloudConnection.authenticate(securityContext);
		this._securityContext = await this._lanConnection.authenticate(this._securityContext);
		return this._securityContext;
	}

	close(): void {
		this._lanConnection.close();
		this._cloudConnection.close();
	}
}