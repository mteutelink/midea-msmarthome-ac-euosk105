"use strict";

import { Device } from "../Device";
import { GetStateResponse } from './GetStateResponse';
import { _LOGGER } from '../Logger';
import { LANCommand } from './LANCommand';

export class GetStateCommand extends LANCommand {
	constructor(device: Device) {
		super(device, Buffer.from([
				0x41, 0x81, 0x00, 0xFF, 0x03, 0xFF, 0x00,
				0x02, //this.temperatureType,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x03,
			]));
	}

	public async execute(): Promise<GetStateResponse> {
		_LOGGER.debug("GetStateCommand::execute()");
		const response = await super.execute();
		return new GetStateResponse(response[0]);
	}
}