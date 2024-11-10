"use strict";

import { Appliance } from "../Appliance";

export class ListAppliancesResponse {
	private _appliances: Appliance[] = [];
	public get appliances(): Appliance[] {
		return this._appliances;
	}

	constructor(response: any) {
		response.data.list.forEach((applianceJson: any) => {
			const appliance = new Appliance();

			appliance.id = applianceJson.id;
			appliance.userId = applianceJson.userId;
			appliance.wifiVersion = applianceJson.wifiVersion;
			appliance.serialNumber = applianceJson.sn;
			appliance.onlineStatus = applianceJson.onlineStatus;
			appliance.type = applianceJson.type;
			appliance.modelNumber = applianceJson.modelNumber;
			appliance.name = applianceJson.name;
			appliance.des = applianceJson.des;
			appliance.activeStatus = applianceJson.activeStatus
			appliance.userType = applianceJson.userType;
			appliance.homeGroupId = applianceJson.homeGroupId;
			appliance.roomId = applianceJson.roomId;
			appliance.tsn = applianceJson.tsn;
			appliance.mac = applianceJson.mac;
			appliance.registerTime = new Date(applianceJson.registerTime);
			appliance.uid = applianceJson.uid;
			appliance.existTemplate = applianceJson.existTemplate;
			appliance.templateOfTSL = applianceJson.templateOfTSL;
			appliance.bleMac = applianceJson.bleMac;
			appliance.connectType = applianceJson.connectType;
			appliance.sort = applianceJson.sort;
			appliance.smartProductId = applianceJson.smartProductId;
			appliance.btMac = applianceJson.btMac;
			appliance.btToken = applianceJson.btToken;
			appliance.compose = applianceJson.compose;
			appliance.singleAppliances = applianceJson.singleAppliances;
			appliance.singleCompose = applianceJson.singleCompose;
			appliance.sn8 = applianceJson.sn8;
			appliance.supportWidget = applianceJson.supportWidget;
			appliance.belong = applianceJson.belong;

			this._appliances.push(appliance);
		});
	}
}