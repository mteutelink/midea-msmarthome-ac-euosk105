"use strict";

import { Device } from "Device";
import { SecurityContext } from 'SecurityContext';
import { _LOGGER } from 'Logger';
import { CloudCommand } from 'command/CloudCommand';
import { ListAppliancesResponse } from "command/ListAppliancesResponse";

export class ListAppliancesCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/appliance/user/list/get", {});
	}

	public async execute(securityContext: SecurityContext): Promise<ListAppliancesResponse> {
		_LOGGER.info("ListAppliancesCommand::execute()");
		const response = await super.execute(securityContext);
		return new ListAppliancesResponse(response);
	}
}