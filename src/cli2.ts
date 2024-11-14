#!/usr/bin/env ts-node

import { Driver } from "./Driver";
import { SecurityContext } from "./SecurityContext";
import { GetPowerUsageCommand } from "./command/GetPowerUsageCommand";
import { GetPowerUsageResponse } from "./command/GetPowerUsageResponse";

Driver.getDevice(142936511670913).then(async device => {
	let securityContext: SecurityContext = await device.authenticate('marc@teutelink.nl', 'M1r4nD4!975');

	let command = new GetPowerUsageCommand(device);
	const response: GetPowerUsageResponse = await command.execute(securityContext);
	console.log(response);
})