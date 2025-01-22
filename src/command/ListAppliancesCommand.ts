"use strict";

import { Device } from "../Device";
import { LANSecurityContext } from '../LANSecurityContext';
import { _LOGGER } from '../Logger';
import { CloudCommand } from './CloudCommand';
import { ListAppliancesResponse } from "./ListAppliancesResponse";

export class ListAppliancesCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/appliance/user/list/get", {});
	}

	public async execute(): Promise<ListAppliancesResponse> {
		_LOGGER.debug("ListAppliancesCommand::execute()");
		const response = await super.execute();
		return new ListAppliancesResponse(response);
	}
}