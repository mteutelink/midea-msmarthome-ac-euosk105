"use strict";

import { Device } from "../Device";
import { SecurityContext } from '../SecurityContext';
import { _LOGGER } from '../Logger';
import { CloudCommand } from './CloudCommand';
import { ListHomeGroupsResponse } from "./ListHomeGroupsResponse";

export class ListHomeGroupsCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/homegroup/list/get", {});
	}

	public async execute(securityContext: SecurityContext): Promise<ListHomeGroupsResponse> {
		_LOGGER.debug("ListHomeGroupsCommand::execute()");
		const response = await super.execute(securityContext);
		return new ListHomeGroupsResponse(response);
	}
}