"use strict";

import { Device } from "Device";
import { SecurityContext } from 'SecurityContext';
import { _LOGGER } from 'Logger';
import { CloudCommand } from 'command/CloudCommand';
import { ListHomeGroupsResponse } from "command/ListHomeGroupsResponse";

export class ListHomeGroupsCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/homegroup/list/get", {});
	}

	public async execute(securityContext: SecurityContext): Promise<ListHomeGroupsResponse> {
		_LOGGER.info("ListHomeGroupsCommand::execute()");
		const response = await super.execute(securityContext);
		return new ListHomeGroupsResponse(response);
	}
}