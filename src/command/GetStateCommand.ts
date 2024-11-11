"use strict";

import { Device } from "Device";
import { GetStateResponse } from 'command/GetStateResponse';
import { SecurityContext } from 'SecurityContext';
import { _LOGGER } from 'Logger';
import { LANCommand } from 'command/LANCommand';

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

	public async execute(securityContext: SecurityContext): Promise<GetStateResponse> {
		_LOGGER.info("GetStateCommand::execute()");
		const response = await super.execute(securityContext);
		return new GetStateResponse(response[0]);
	}
}