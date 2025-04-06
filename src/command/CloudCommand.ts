"use strict";

import { Device } from '../Device';
import { _LOGGER } from '../Logger';
import { Command } from './Command';
import { CloudConnection } from '../CloudConnection';
import { CloudSecurityContext } from 'CloudSecurityContext';

export abstract class CloudCommand implements Command {
	protected _device: Device;
	private _cloudConnection: CloudConnection;
	private readonly _endpoint: string;
	private readonly _body: any;

	constructor(device: Device, endpoint: string, body: any) {
		this._device = device;
		this._endpoint = endpoint;
		this._body = body;
	}

	public async execute(cloudSecurityContext: CloudSecurityContext): Promise<any> {
		_LOGGER.debug("Command::execute()");
		this._cloudConnection = cloudSecurityContext.getCloudConnection(this._device);
		return this._cloudConnection.executeCommand(cloudSecurityContext, this._endpoint, this._body);
	}
}