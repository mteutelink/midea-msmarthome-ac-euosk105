"use strict";

import { Device } from "../Device";
import { SecurityContext } from '../SecurityContext';
import { _LOGGER } from '../Logger';
import { CloudCommand } from './CloudCommand';
import { ListAppliancesResponse } from "./ListAppliancesResponse";

export class ListAppliancesCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/appliance/user/list/get", {});
	}

	public async execute(securityContext: SecurityContext): Promise<ListAppliancesResponse> {
		_LOGGER.debug("ListAppliancesCommand::execute()");
		const response = await super.execute(securityContext);
		return new ListAppliancesResponse(response);
	}
}