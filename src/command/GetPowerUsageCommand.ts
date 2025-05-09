"use strict";

import { FRAME_TYPE } from '../MideaConstants';
import { Device } from "../Device";
import { _LOGGER } from '../Logger';
import { GetPowerUsageResponse } from './GetPowerUsageResponse';
import { LANCommand } from './LANCommand';

export class GetPowerUsageCommand extends LANCommand {
	constructor(device: Device) {
		super(device, Buffer.from([
			0x41, 0x21, 0x01, 0x44, 0x00, 0x01
		]), FRAME_TYPE.REQUEST);
	}

	public async execute(): Promise<GetPowerUsageResponse> {
		_LOGGER.debug("GetPowerUsageCommand::execute()");
		const response = await super.execute();
		return new GetPowerUsageResponse(response[0]);
	}
}