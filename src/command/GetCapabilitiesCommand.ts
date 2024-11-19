"use strict";

import { FRAME_TYPE } from '../Constants';
import { Device } from "../Device";
import { SecurityContext } from '../SecurityContext';
import { _LOGGER } from '../Logger';
import { GetCapabilitiesResponse } from './GetCapabilitiesResponse';
import { LANCommand } from './LANCommand';

export class GetCapabilitiesCommand extends LANCommand {
	constructor(device: Device) {
		super(device, Buffer.from([
			0xB5, 0x01, 0x11
		]), FRAME_TYPE.REQUEST);
	}

	public async execute(securityContext: SecurityContext): Promise<GetCapabilitiesResponse> {
		_LOGGER.debug("GetCapabilitiesCommand::execute()");
		let response = await super.execute(securityContext);
		
		let getCapabilitiesResponse: GetCapabilitiesResponse = new GetCapabilitiesResponse(response[0]);
		if (getCapabilitiesResponse.hasMoreCapabilities) {
			const getMoreCapabilitiesCommand: GetMoreCapabilitiesCommand = new GetMoreCapabilitiesCommand(this._device);
			
			response = await getMoreCapabilitiesCommand.execute(securityContext);
			getCapabilitiesResponse = getCapabilitiesResponse.parse(getCapabilitiesResponse, response[0]);
		}
		return getCapabilitiesResponse;
	}
}

class GetMoreCapabilitiesCommand extends LANCommand {
	constructor(device: Device) {
		super(device, Buffer.from([
			0xB5, 0x01, 0x01, 0x00
		]), FRAME_TYPE.REQUEST);
	}
}