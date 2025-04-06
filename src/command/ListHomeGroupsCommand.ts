"use strict";

import { ListHomeGroupsResponse } from "./ListHomeGroupsResponse";
import { CloudSecurityContext } from "../CloudSecurityContext";
import { CloudCommand } from './CloudCommand';
import { Device } from "../Device";
import { _LOGGER } from '../Logger';

export class ListHomeGroupsCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/homegroup/list/get", {});
	}

	public async execute(cloudSecurityContext: CloudSecurityContext): Promise<ListHomeGroupsResponse> {
		_LOGGER.debug("ListHomeGroupsCommand::execute()");
		const response = await super.execute(cloudSecurityContext);
		_LOGGER.http("ListHomeGroupsCommand::execute()::response = " + JSON.stringify(response));
		return new ListHomeGroupsResponse(response);
	}
}