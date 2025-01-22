"use strict";

import { Device } from "../Device";
import { _LOGGER } from '../Logger';
import { CloudCommand } from './CloudCommand';
import { ApplianceTransparentSendResponse } from "./ApplianceTransparentSendResponse";

export class ApplianceTransparentSendCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/appliance/transparent/send", Buffer.from([
				0x41, 0x81, 0x00, 0xFF, 0x03, 0xFF, 0x00,
				0x02, //this.temperatureType,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x03,
			]));
	}

	public async execute(): Promise<ApplianceTransparentSendResponse> {
		_LOGGER.debug("ApplianceTransparentSendCommand::execute()");
		const response = await super.execute();
		return new ApplianceTransparentSendResponse(response);
	}
}