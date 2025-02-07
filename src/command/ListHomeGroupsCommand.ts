"use strict";

import { Device } from "../Device";
import { _LOGGER } from '../Logger';
import { CloudCommand } from './CloudCommand';
import { ListHomeGroupsResponse } from "./ListHomeGroupsResponse";

export class ListHomeGroupsCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/homegroup/list/get", {});
	}

	public async execute(): Promise<ListHomeGroupsResponse> {
		_LOGGER.debug("ListHomeGroupsCommand::execute()");
		const response = await super.execute();
		return new ListHomeGroupsResponse(response);
	}
}