"use strict";

import { Device } from '../Device';
import { SecurityContext } from '../SecurityContext';
import { _LOGGER } from '../Logger';
import { Command } from './Command';

export abstract class CloudCommand implements Command {
	protected _device: Device;
	private _endpoint: string;
	private _body: any;

	constructor(device: Device, endpoint: string, body: any) {
		this._device = device;
		this._endpoint = endpoint;
		this._body = body;
	}

	public async execute(): Promise<any> {
		_LOGGER.debug("Command::execute()");
		return this._device.cloudConnection.executeCommand(this._endpoint, this._body);
	}
}