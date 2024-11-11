"use strict";

import { HomeGroup } from "HomeGroup";

export class ListHomeGroupsResponse {
	private _homeGroups: HomeGroup[] = [];
	public get homeGroups(): HomeGroup[] {
		return this._homeGroups;
	}

	constructor(response: any) {
		response.data.homeList.forEach((homeGroupJson: any) => {
			const homeGroup = new HomeGroup();

			homeGroup.id = homeGroupJson.homegroupId;
			homeGroup.name = homeGroupJson.homeName;
			homeGroup.createUser = homeGroupJson.createUser;
			homeGroup.cityCode = homeGroupJson.cityCode;
			homeGroup.roleTag = homeGroupJson.roleTag;
			homeGroup.createTime = new Date(homeGroupJson.createTime);
			homeGroup.roomCount = homeGroupJson.roomCount;
			this._homeGroups.push(homeGroup);
		});
	}
}