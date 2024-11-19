"use strict";

import { Device } from "../Device";
import { DeviceState } from '../DeviceState';
import { FRAME_TYPE } from '../Constants';
import { SecurityContext } from '../SecurityContext';
import { GetStateResponse } from './GetStateResponse';
import { _LOGGER } from '../Logger';
import { GetStateCommand } from './GetStateCommand';
import { LANCommand } from './LANCommand';

export class SetStateCommand extends LANCommand {
	constructor(device: Device, deviceState: DeviceState) {
		const beep = (/*beepOn*/false) ? 0x42 : 0;
		const powerOn = deviceState.powerOn ? 0x1 : 0;
		const targetTemperatureFractional = deviceState.targetTemperature % 1;
		const targetTemperatureIntegral = Math.floor(deviceState.targetTemperature);
		const targetTemperature = (targetTemperatureIntegral & 0xF) | (targetTemperatureFractional > 0 ? 0x10 : 0);
		const operationalMode = (deviceState.operationalMode & 0x7) << 5;
		const swingMode = 0x30 | (deviceState.swingMode & 0x3F);
		const ecoMode = deviceState.ecoMode ? 0x80 : 0;
		const sleepMode = deviceState.sleepMode ? 0x01 : 0;
		const turboMode = deviceState.turboMode ? 0x02 : 0;
		const display = /*displayOn*/false ? 0x10 : 0;
		const fahrenheit = deviceState.fahrenheit ? 0x04 : 0;
		const turboAlt = deviceState.turboMode ? 0x20 : 0;

		super(device, Buffer.from([
			0x40,
			beep | powerOn,
			targetTemperature | operationalMode,
			deviceState.fanSpeed,
			0x7F, 0x7F, 0x00,
			swingMode,
			turboAlt,
			ecoMode,
			sleepMode | turboMode | display | fahrenheit,
			0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00,
		]), FRAME_TYPE.SET);
	}

	public async execute(securityContext: SecurityContext): Promise<GetStateResponse> {
		_LOGGER.debug("SetStateCommand::execute()");
		const response = await super.execute(securityContext);
		return new GetStateCommand(this._device).execute(securityContext);
	}
}