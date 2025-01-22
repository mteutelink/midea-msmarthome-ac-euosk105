"use strict";

import { DeviceContext } from './DeviceContext';
import { LANSecurityContext } from './LANSecurityContext';
import { CloudSecurityContext } from './CloudSecurityContext';
import { LANConnection } from './LANConnection';
import { _LOGGER } from './Logger';

export class Device {
	private readonly _deviceContext: DeviceContext;
	private readonly _lanConnection: LANConnection;
	private _lanSecurityContext: LANSecurityContext = null;
	private _cloudSecurityContext: CloudSecurityContext = null;

	constructor(deviceContext: DeviceContext) {
		this._deviceContext = deviceContext;
		this._lanConnection = new LANConnection(this);
	}

	// DEVICECONTEXT
	public get deviceContext(): DeviceContext {
		return this._deviceContext;
	}

	// LANCONNECTION
	public get lanConnection(): LANConnection {
		return this._lanConnection;
	}

	// SECURITYCONTEXT
	public get lanSecurityContext(): LANSecurityContext | undefined {
		return this._lanSecurityContext;
	}

	public set lanSecurityContext(value: LANSecurityContext | undefined) {
		this._lanSecurityContext = value;
	}

	// CLOUDSECURITYCONTEXT
	public get cloudSecurityContext(): CloudSecurityContext | undefined {
		return this._cloudSecurityContext;
	}

	public set cloudSecurityContext(value: CloudSecurityContext | undefined) {
		this._cloudSecurityContext = value;
	}

	public async authenticate(lanSecurityContext: LANSecurityContext): Promise<LANSecurityContext> {
		_LOGGER.debug("Device::authenticate()");
		try {
			this._lanSecurityContext = await this._lanConnection.authenticate(lanSecurityContext);
			return this._lanSecurityContext;
		} catch (error) {
			_LOGGER.error("Authentication failed: " + error);
			throw (error);
		}
	}

	close(): void {
		this._lanConnection.close();
	}
}