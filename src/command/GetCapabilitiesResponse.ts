"use strict";

import { DeviceCapabilities } from '../DeviceCapabilities';
import { _LOGGER } from '../Logger';

export class GetCapabilitiesResponse extends DeviceCapabilities {
	private _hasMoreCapabilities: boolean = false;

	constructor(data: Buffer) {
		super();
		this.parse(this, data);
	}

	// HASMORECAPABILITIES
	public get hasMoreCapabilities(): boolean {
		return this._hasMoreCapabilities;
	}
	public set hasMoreCapabilities(value: boolean) {
		this._hasMoreCapabilities = value;
	}

	// PARSE
	public parse(getCapabilitiesResponse: GetCapabilitiesResponse, data: Buffer): GetCapabilitiesResponse {
		data = data.subarray(10, data.length - 2);

		let i = 2;
		let caps2process = data[1];
		while (i < data.length - 2 && caps2process) {
			if (data[i + 1] === 0x00 && data[i + 2] > 0) {
				switch (data[i]) {
					case 0x15: // hasIndoorHumidity
						getCapabilitiesResponse.indoorHumidity = data[i + 3] !== 0;
						break;

					case 0x18: // hasNoWindFeel
						getCapabilitiesResponse.silkyCool = data[i + 3] !== 0;
						// From T0xAC:
						// if(data[i + 3] = 1) { noWindFeel = upNoWindFeel = downNoWindFeel = true; }
						// if(data[i + 3] = 2) { upNoWindFeel = true; noWindFeel = downNoWindFeel = false; }
						// if(data[i + 3] = 3) { upNoWindFeel = noWindFeel = false;  downNoWindFeel = true; }
						// else { noWindFeel = upNoWindFeel = downNoWindFeel = false; }
						break;

					case 0x30: // hasSmartEye
						getCapabilitiesResponse.smartEye = data[i + 3] === 1;
						break;

					case 0x32: // hasBlowingPeople
						getCapabilitiesResponse.windOnMe = data[i + 3] === 1;
						break;

					case 0x33: // hasAvoidPeople
						getCapabilitiesResponse.windOffMe = data[i + 3] === 0;
						break;

					case 0x39: // hasSelfClean
						getCapabilitiesResponse.activeClean = data[i + 3] === 1;
						break;

					case 0x3D:
						getCapabilitiesResponse.upNoWindFeel = data[i + 3] > 1;
						break;

					case 0x3E:
						getCapabilitiesResponse.downNoWindFeel = data[i + 3] > 1;
						break;

					case 0x40: // Found in a log
						break;

					case 0x42: // hasOneKeyNoWindOnMe
						getCapabilitiesResponse.oneKeyNoWindOnMe = data[i + 3] === 1;
						// From T0xAC
						// if(data[i + 3] = 2) {
						//    hasWindowBlowing = true;
						//    windBlowing = true;
						//    windBlowingStatus true;
						//    upDownProduceWindStatus = false;
						//    upSwipeWindStatus = false;
						//    downSwipeWindStatus = false;
						//    upNoWindFeel = false;
						//    downNoWindFeel = false;
						//    natureWindStatus = false;
						// } else {
						//    windBlowing = false;
						//    windBlowingStatus = false;
						// }
						// }
						break;

					case 0x43: // hasBreeze
						getCapabilitiesResponse.breezeControl = data[i + 3] === 0;
						break;
				}
			}

			if (data[i + 1] === 0x02 && data[i + 2] > 0) {
				switch (data[i]) {
					case 0x10: // hasNoWindSpeed (the app states getCapabilitiesResponse.property is true when === 1)
						getCapabilitiesResponse.fanSpeedControl = data[i + 3] !== 1;
						break;

					case 0x12:
						getCapabilitiesResponse.ecoMode = data[i + 3] === 1;
						getCapabilitiesResponse.specialEco = data[i + 3] === 2;
						break;

					case 0x13:
						getCapabilitiesResponse.frostProtectionMode = data[i + 3] === 1;
						break;

					case 0x14: // hotcold
						switch (data[i + 3]) {
							case 0:
								getCapabilitiesResponse.heatMode = false;
								getCapabilitiesResponse.coolMode = true;
								getCapabilitiesResponse.dryMode = true;
								getCapabilitiesResponse.autoMode = true;
								break;

							case 1:
								getCapabilitiesResponse.coolMode = true;
								getCapabilitiesResponse.heatMode = true;
								getCapabilitiesResponse.dryMode = true;
								getCapabilitiesResponse.autoMode = true;
								break;

							case 2:
								getCapabilitiesResponse.coolMode = false;
								getCapabilitiesResponse.dryMode = false;
								getCapabilitiesResponse.heatMode = true;
								getCapabilitiesResponse.autoMode = true;
								break;

							case 3:
								getCapabilitiesResponse.coolMode = true;
								getCapabilitiesResponse.dryMode = false;
								getCapabilitiesResponse.heatMode = false;
								getCapabilitiesResponse.autoMode = false;
								break;
						}
						break;

					case 0x15:
						switch (data[i + 3]) {
							case 0:
								getCapabilitiesResponse.leftrightFan = false;
								getCapabilitiesResponse.updownFan = true;
								break;

							case 1:
								getCapabilitiesResponse.leftrightFan = true;
								getCapabilitiesResponse.updownFan = true;
								break;

							case 2:
								getCapabilitiesResponse.leftrightFan = false;
								getCapabilitiesResponse.updownFan = false;
								break;

							case 3:
								getCapabilitiesResponse.leftrightFan = true;
								getCapabilitiesResponse.updownFan = false;
								break;
						}
						break;

					case 0x16:
						switch (data[i + 3]) {
							case 0:
							case 1:
								getCapabilitiesResponse.powerCal = false;
								getCapabilitiesResponse.powerCalSetting = false;
								break;

							case 2:
								getCapabilitiesResponse.powerCal = true;
								getCapabilitiesResponse.powerCalSetting = false;
								break;

							case 3:
								getCapabilitiesResponse.powerCal = true;
								getCapabilitiesResponse.powerCalSetting = true;
								break;
						}
						break;

					case 0x17:
						switch (data[i + 3]) {
							case 0:
								getCapabilitiesResponse.nestCheck = false;
								getCapabilitiesResponse.nestNeedChange = false;
								break;

							case 1:
							case 2:
								getCapabilitiesResponse.nestCheck = true;
								getCapabilitiesResponse.nestNeedChange = false;
								break;

							case 3:
								getCapabilitiesResponse.nestCheck = false;
								getCapabilitiesResponse.nestNeedChange = true;
								break;

							case 4:
								getCapabilitiesResponse.nestCheck = true;
								getCapabilitiesResponse.nestNeedChange = true;
								break;
						}
						break;

					case 0x19: // dianfure
						getCapabilitiesResponse.electricAuxHeating = data[i + 3] === 1;
						break;

					case 0x1A:
						switch (data[i + 3]) {
							case 0:
								getCapabilitiesResponse.turboHeat = false; // strongHot
								getCapabilitiesResponse.turboCool = true; // strongCool
								break;

							case 1:
								getCapabilitiesResponse.turboHeat = true;
								getCapabilitiesResponse.turboCool = true;
								break;

							case 2:
								getCapabilitiesResponse.turboHeat = false;
								getCapabilitiesResponse.turboCool = false;
								break;

							case 3:
								getCapabilitiesResponse.turboHeat = true;
								getCapabilitiesResponse.turboCool = false;
								break;
						}
						break;

					case 0x1F:
						switch (data[i + 3]) {
							case 0:
								getCapabilitiesResponse.autoSetHumidity = false; // hasAutoClearHumidity
								getCapabilitiesResponse.manualSetHumidity = false; // hasHandClearHumidity
								break;

							case 1:
								getCapabilitiesResponse.autoSetHumidity = true;
								getCapabilitiesResponse.manualSetHumidity = false;
								break;

							case 2:
								getCapabilitiesResponse.autoSetHumidity = true;
								getCapabilitiesResponse.manualSetHumidity = true;
								break;

							case 3:
								getCapabilitiesResponse.autoSetHumidity = false;
								getCapabilitiesResponse.manualSetHumidity = true;
								break;
						}
						break;

					case 0x22: // unitChangeable
						getCapabilitiesResponse.unitChangeable = data[i + 3] === 0;
						break;

					case 0x24: // lightType
						getCapabilitiesResponse.lightControl = data[i + 3] === 0;
						break;

					case 0x25:
						if (data[i + 2] >= 6) {
							_LOGGER.silly(`B5.parser: Parsing adjust temp capability ${data[i + 3]}`);
							getCapabilitiesResponse.minTempCool = data[i + 3] / 2; // cool_adjust_down_temp
							getCapabilitiesResponse.maxTempCool = data[i + 4] / 2; // cool_adjust_up_temp
							getCapabilitiesResponse.minTempAuto = data[i + 5] / 2; // auto_adjust_down_temp
							getCapabilitiesResponse.maxTempAuto = data[i + 6] / 2; // auto_adjust_up_temp
							getCapabilitiesResponse.minTempHeat = data[i + 7] / 2; // hot_adjust_down_temp
							getCapabilitiesResponse.maxTempHeat = data[i + 8] / 2; // hot_adjust_up_temp

							// isHavePoint
							if (data[i + 2] > 6) {
								getCapabilitiesResponse.decimals = data[i + 9] !== 0;
							} else {
								getCapabilitiesResponse.decimals = data[i + 5] !== 0;
							}
						}
						break;

					case 0x2C: // hasBuzzer
						getCapabilitiesResponse.buzzer = data[i + 3] !== 0;
						break;
				}
			}

			// Increment cursor and decrement getCapabilitiesResponse.to process
			i += (3 + data[i + 2]);
			caps2process--;
		}
		getCapabilitiesResponse.hasMoreCapabilities = (data.length - i >= 2 ? data[data.length - 2] : 0) === 1;
		return getCapabilitiesResponse; 
	}
}