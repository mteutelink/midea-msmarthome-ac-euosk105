"use strict";

import { Device } from "../Device";
import { _LOGGER } from '../Logger';
import { GetPropertiesResponse } from './GetPropertiesResponse';
import { LANCommand } from './LANCommand';

export enum PROPERTY_ID {
	SWING_UD_ANGLE = 0x0009,
	SWING_LR_ANGLE = 0x000A,
	SELF_CLEAN = 0x0039,
	INDIRECT_WIND = 0x0042
}

export class GetPropertiesCommand extends LANCommand {
	constructor(device: Device, propertyIDs: PROPERTY_ID[]) {
		let _buffer: Buffer = Buffer.allocUnsafe(propertyIDs.length * 2);
		propertyIDs.forEach((value, index) => _buffer.writeUInt16LE(value, index * 2));
		super(device, Buffer.concat([Buffer.from([0xB1, propertyIDs.length]), _buffer]));
	}

	public async execute(): Promise<GetPropertiesResponse> {
		_LOGGER.debug("GetPropertiesCommand::execute()");
		const response = await super.execute();
		return new GetPropertiesResponse(response[0]);
	}
}