"use strict";

export class HomeGroup {
	private _id: string = "";
	private _name: string = "";
	private _createUser: string = "";
	private _cityCode: string = "";
	private _roleTag: number = 0;
	private _createTime: Date = new Date();
	private _roomCount: number = 0;
	
	public get id(): string {
		return this._id;
	}
	public set id(value: string) {
		this._id = value;
	}

	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	public get createUser(): string {
		return this._createUser;
	}
	public set createUser(value: string) {
		this._createUser = value;
	}

	public get cityCode(): string {
		return this._cityCode;
	}
	public set cityCode(value: string) {
		this._cityCode = value;
	}

	public get roleTag(): number {
		return this._roleTag;
	}
	public set roleTag(value: number) {
		this._roleTag = value;
	}

	public get createTime(): Date {
		return this._createTime;
	}
	public set createTime(value: Date) {
		this._createTime = value;
	}

	public get roomCount(): number {
		return this._roomCount;
	}
	public set roomCount(value: number) {
		this._roomCount = value;
	}
}