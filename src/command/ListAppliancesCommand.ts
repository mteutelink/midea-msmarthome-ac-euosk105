"use strict";

import { CloudCommand } from './CloudCommand';
import { Device } from "../Device";
import { _LOGGER } from '../Logger';
import { ListAppliancesResponse } from "./ListAppliancesResponse";
import { CloudSecurityContext } from '../CloudSecurityContext';

export class ListAppliancesCommand extends CloudCommand {
	constructor(device: Device) {
		super(device, "/v1/appliance/user/list/get", {});
	}

	public async execute(cloudSecurityContext: CloudSecurityContext): Promise<ListAppliancesResponse> {
		_LOGGER.debug("ListAppliancesCommand::execute()");
		const response = await super.execute(cloudSecurityContext);
		_LOGGER.http("ListAppliancesCommand::execute()::response = " + JSON.stringify(response));
		return new ListAppliancesResponse(response);
	}
}