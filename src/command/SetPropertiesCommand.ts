"use strict";

import { FRAME_TYPE } from "../MideaConstants";
import { Device } from "../Device";
import { _LOGGER } from '../Logger';
import { GetPropertiesCommand, PROPERTY_ID } from "./GetPropertiesCommand";
import { GetPropertiesResponse } from './GetPropertiesResponse';
import { LANCommand } from './LANCommand';

export class SetPropertiesCommand extends LANCommand {
	private readonly _propertyIDs: PROPERTY_ID[];

	constructor(device: Device, properties: GetPropertiesResponse) {
		super(device, Buffer.from([
			0xB0, 0x04, 
			0x0A, 0x00, 0x00, 0x50, 0x00,
			0x09, 0x00, 0x00, 0x25, 0x00,
			0x42, 0x00, 0x00, 0x00, 0x00,
			0x39, 0x00, 0x00, 0x00, 0x00
		]), FRAME_TYPE.SET);
		this._propertyIDs = Array.from(properties.keys());
	}
	
	public async execute(): Promise<GetPropertiesResponse> {
		_LOGGER.debug("SetPropertiesCommand::execute()");
		await super.execute();
		return new GetPropertiesCommand(this._device, this._propertyIDs).execute();
	}
}