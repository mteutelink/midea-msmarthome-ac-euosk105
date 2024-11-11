"use strict";

import { DeviceState, MIN_TARGET_TEMPERATURE } from 'DeviceState';

export class GetStateResponse extends DeviceState {
	constructor(data: Buffer) {
		super();

		data = data.subarray(10, data.length - 2);

		this.powerOn = (data[1] & 0x01) === 0x01;
		this.operationalMode = (data[2] & 0xE0) >> 5;
		this.fanSpeed = data[3] & 0x7F;

		this.swingMode = data[7] & 0xF;

		this.turboMode = (((data[10] & 0x02) === 0x02) || ((data[8] & 0x20) === 0x20));
		this.ecoMode = (data[9] & 0x10) === 0x10;
		this.freezeProtectionMode = (data[21] & 0x80) === 0x80;
		this.sleepMode = !!(data[10] & 0x1);

		this.fahrenheit = ((data[10] & 0x04) >> 2) === 0x01;
		this.targetTemperature = (data[2] & 0x0F) + MIN_TARGET_TEMPERATURE;
		const targetTemperatureDecimal = ((data[2] & 0x10) >> 4) * 0.5;
		this.targetTemperature += targetTemperatureDecimal;

		this.indoorTemperature = (data[11] - 50) / 2;
		const indoorTemperatureDecimal = data[15] & 0x0F;
		if (this.indoorTemperature > 0) {
			this.indoorTemperature += (indoorTemperatureDecimal / 10);
		} else {
			this.indoorTemperature -= (indoorTemperatureDecimal / 10);
		}

		this.outdoorTemperature = (data[12] - 50) / 2;
		const outdoorTemperatureDecimal = (data[15] & 0xF0) >> 4;
		if (this.outdoorTemperature > 0) {
			this.outdoorTemperature += (outdoorTemperatureDecimal / 10);
		} else {
			this.outdoorTemperature -= (outdoorTemperatureDecimal / 10);
		}

		this.statusCode = data[16];
	}
}