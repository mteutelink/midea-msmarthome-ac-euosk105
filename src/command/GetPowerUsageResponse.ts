"use strict";

import { _LOGGER } from '../Logger';

export class GetPowerUsageResponse {
	constructor(data: Buffer) {
		data = data.subarray(10, data.length - 2);

		let n = 0;
		let m = 1;
		for (let i = 0; i < 3; i++) {
		  n += (data[18 - i] & 0x0F) * m;
		  n += ((data[18 - i] >> 4) & 0x0F) * m * 10;
		  m *= 100;
		}
		_LOGGER.debug( n / 10000);
	}
}