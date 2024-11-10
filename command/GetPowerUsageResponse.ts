"use strict";

export class GetPowerUsageResponse {
	constructor(data: Buffer) {
		console.log(data.toString('hex'))
		data = data.subarray(10, data.length - 2);
		console.log(data.toString('hex'))

		let n = 0;
		let m = 1;
		for (let i = 0; i < 3; i++) {
		  n += (data[18 - i] & 0x0F) * m;
		  n += ((data[18 - i] >> 4) & 0x0F) * m * 10;
		  m *= 100;
		}
	  
		console.log( n / 10000);
	}
}