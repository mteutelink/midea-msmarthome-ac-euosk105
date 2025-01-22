"use strict";

import { PROPERTY_ID } from './GetPropertiesCommand';

export class GetPropertiesResponse extends Map<PROPERTY_ID, any> {
	constructor(data: Buffer) {
		super();
		data = data.subarray(10, data.length - 2);

		const result: { [key: string]: any } = {};
		let offset = 2;
		try {
			while (offset < data.length) {
				const param = data[offset] + (data[offset + 1] << 8);
				const length = data[offset + 3];
				if (length > 0) {
					const value = data[offset + 4];
					switch (param) {
						case PROPERTY_ID.SWING_UD_ANGLE: {
							this.set(PROPERTY_ID.SWING_UD_ANGLE, value);
							break;
						}
						case PROPERTY_ID.SWING_LR_ANGLE: {
							this.set(PROPERTY_ID.SWING_LR_ANGLE, value);
							break;
						}
						case PROPERTY_ID.SELF_CLEAN: {
							this.set(PROPERTY_ID.SELF_CLEAN, value === 0x1);
							break;
						}
						case PROPERTY_ID.INDIRECT_WIND: {
							this.set(PROPERTY_ID.INDIRECT_WIND, value === 0x02);
							break;
						}
					}
				}
				offset += 4 + length;
			}
		} catch (e) {
			console.error(e);
		}
	}
}