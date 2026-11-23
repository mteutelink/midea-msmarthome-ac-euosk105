"use strict";

import { Device } from "../Device";
import { DeviceState } from '../DeviceState';
import { FRAME_TYPE } from '../MideaConstants';
import { GetStateResponse } from './GetStateResponse';
import { _LOGGER } from '../Logger';
import { GetStateCommand } from './GetStateCommand';
import { LANCommand } from './LANCommand';

export class SetStateCommand extends LANCommand {
	constructor(device: Device, deviceState: DeviceState) {
		if (!Number.isFinite(deviceState.targetTemperature)
            || deviceState.targetTemperature < 12 || deviceState.targetTemperature > 43.5
            || !Number.isInteger(deviceState.targetTemperature * 2)) throw new Error('Invalid target temperature');
        if (!Number.isInteger(deviceState.fanSpeed) || deviceState.fanSpeed < 0 || deviceState.fanSpeed > 102)
            throw new Error('Invalid fan speed');
        if (!Number.isInteger(deviceState.targetHumidity) || deviceState.targetHumidity < 0 || deviceState.targetHumidity > 100)
            throw new Error('Invalid target humidity');
        if (!Number.isInteger(deviceState.operationalMode) || deviceState.operationalMode < 0 || deviceState.operationalMode > 6)
            throw new Error('Invalid operational mode');
        if (![0, 3, 12, 15].includes(deviceState.swingMode)) throw new Error('Invalid swing mode');
        const beep = deviceState.beepOn ? 0x40 : 0;
		const powerOn = deviceState.powerOn ? 0x1 : 0;
		const targetTemperatureFractional = deviceState.targetTemperature % 1;
		const targetTemperatureIntegral = Math.floor(deviceState.targetTemperature);
		const primaryTemperature = targetTemperatureIntegral >= 17 && targetTemperatureIntegral <= 30;
        const targetTemperature = (primaryTemperature ? (targetTemperatureIntegral - 16) & 0xF : 0)
            | (targetTemperatureFractional > 0 ? 0x10 : 0);
        const alternateTemperature = primaryTemperature ? 0 : (targetTemperatureIntegral - 12) & 0x1F;
		const operationalMode = (deviceState.operationalMode & 0x7) << 5;
		const swingMode = 0x30 | (deviceState.swingMode & 0x3F);
		const ecoMode = (deviceState.ecoMode ? 0x80 : 0) | (deviceState.anionMode ? 0x20 : 0) | (deviceState.auxHeat ? 8 : 0);
		const sleepMode = deviceState.sleepMode ? 0x01 : 0;
		const turboMode = deviceState.turboMode ? 0x02 : 0;
		const display = /*displayOn*/false ? 0x10 : 0;
		const fahrenheit = deviceState.fahrenheit ? 0x04 : 0;
		const turboAlt = (deviceState.turboMode ? 0x20 : 0) | (deviceState.followMe ? 0x80 : 0);
		const freezeProtectionMode = deviceState.freezeProtectionMode ? 0x80 : 0x00;

		super(device, Buffer.from([
			0x40,
			0x02 | beep | powerOn,
			targetTemperature | operationalMode,
			deviceState.fanSpeed,
			0x7F, 0x7F, 0x00,
			swingMode,
			turboAlt,
			ecoMode,
			sleepMode | turboMode | display | fahrenheit,
			0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, alternateTemperature,
			deviceState.targetHumidity & 0x7F, 0x00, 
			freezeProtectionMode,
			deviceState.independentAuxHeat ? 8 : 0, 0x00,
		]), FRAME_TYPE.SET);
	}

	public async execute(): Promise<GetStateResponse> {
		_LOGGER.debug("SetStateCommand::execute()");
		await super.execute();
		return new GetStateCommand(this._device).execute();
	}
}