"use strict";

import { Device } from '../Device';
import { _LOGGER } from '../Logger';
import { Command } from './Command';
import { CloudConnection } from '../CloudConnection';

export abstract class CloudCommand implements Command {
	protected _device: Device;
	private readonly _cloudConnection: CloudConnection;
	private readonly _endpoint: string;
	private readonly _body: any;

	constructor(device: Device, endpoint: string, body: any) {
		this._device = device;
		this._cloudConnection = new CloudConnection(device);
		this._endpoint = endpoint;
		this._body = body;
	}

	public async execute(): Promise<any> {
		_LOGGER.debug("Command::execute()");
		return this._cloudConnection.executeCommand(this._endpoint, this._body);
	}
}