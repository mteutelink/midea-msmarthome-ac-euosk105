"use strict";

import { MIDEA_APPLIANCE_TYPE } from "./MideaConstants";

export class Appliance {
	private _id: string = "";
	private _userId: string = "";
	private _wifiVersion: string = "";
	private _serialNumber: string = "";
	private _onlineStatus: number = 0;
	private _type: MIDEA_APPLIANCE_TYPE = MIDEA_APPLIANCE_TYPE.AIRCONDITIONER;
	private _modelNumber: string = "";
	private _name: string = "";
	private _des: string = "";
	private _activeStatus: number = 0;
	private _userType: any = null;
	private _homeGroupId: string = "";
	private _roomId: string = "";
	private _tsn: any = null;
	private _mac: any = null;
	private _registerTime: Date = new Date();
	private _uid: string = "";
	private _existTemplate: boolean = false;
	private _templateOfTSL: any = null;
	private _bleMac: any = null;
	private _connectType: string = "";
	private _sort: number = 0;
	private _smartProductId: number = 0;
	private _btMac: string = "";
	private _btToken: any = null;
	private _compose: boolean = false;
	private _singleAppliances: any = null;
	private _singleCompose: boolean = false;
	private _sn8: string = "";
	private _supportWidget: boolean = false;
	private _belong: number = 0;
	
	public get id(): string {
		return this._id;
	}
	public set id(value: string) {
		this._id = value;
	}

	public get userId(): string {
		return this._userId;
	}
	public set userId(value: string) {
		this._userId = value;
	}

	public get wifiVersion(): string {
		return this._wifiVersion;
	}
	public set wifiVersion(value: string) {
		this._wifiVersion = value;
	}

	public get serialNumber(): string {
		return this._serialNumber;
	}
	public set serialNumber(value: string) {
		this._serialNumber = value;
	}

	public get onlineStatus(): number {
		return this._onlineStatus;
	}
	public set onlineStatus(value: number) {
		this._onlineStatus = value;
	}

	public get type(): MIDEA_APPLIANCE_TYPE {
		return this._type;
	}
	public set type(value: MIDEA_APPLIANCE_TYPE) {
		this._type = value;
	}

	public get modelNumber(): string {
		return this._modelNumber;
	}
	public set modelNumber(value: string) {
		this._modelNumber = value;
	}

	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	public get des(): string {
		return this._des;
	}
	public set des(value: string) {
		this._des = value;
	}

	public get activeStatus(): number {
		return this._activeStatus;
	}
	public set activeStatus(value: number) {
		this._activeStatus = value;
	}

	public get userType(): any {
		return this._userType;
	}
	public set userType(value: any) {
		this._userType = value;
	}

	public get homeGroupId(): string {
		return this._homeGroupId;
	}
	public set homeGroupId(value: string) {
		this._homeGroupId = value;
	}

	public get roomId(): string {
		return this._roomId;
	}
	public set roomId(value: string) {
		this._roomId = value;
	}

	public get tsn(): any {
		return this._tsn;
	}
	public set tsn(value: any) {
		this._tsn = value;
	}

	public get mac(): any {
		return this._mac;
	}
	public set mac(value: any) {
		this._mac = value;
	}

	public get registerTime(): Date {
		return this._registerTime;
	}
	public set registerTime(value: Date) {
		this._registerTime = value;
	}

	public get uid(): string {
		return this._uid;
	}
	public set uid(value: string) {
		this._uid = value;
	}

	public get existTemplate(): boolean {
		return this._existTemplate;
	}
	public set existTemplate(value: boolean) {
		this._existTemplate = value;
	}

	public get templateOfTSL(): any {
		return this._templateOfTSL;
	}
	public set templateOfTSL(value: any) {
		this._templateOfTSL = value;
	}

	public get bleMac(): any {
		return this._bleMac;
	}
	public set bleMac(value: any) {
		this._bleMac = value;
	}

	public get connectType(): string {
		return this._connectType;
	}
	public set connectType(value: string) {
		this._connectType = value;
	}

	public get sort(): number {
		return this._sort;
	}
	public set sort(value: number) {
		this._sort = value;
	}

	public get smartProductId(): number {
		return this._smartProductId;
	}
	public set smartProductId(value: number) {
		this._smartProductId = value;
	}

	public get btMac(): string {
		return this._btMac;
	}
	public set btMac(value: string) {
		this._btMac = value;
	}

	public get btToken(): any {
		return this._btToken;
	}
	public set btToken(value: any) {
		this._btToken = value;
	}

	public get compose(): boolean {
		return this._compose;
	}
	public set compose(value: boolean) {
		this._compose = value;
	}

	public get singleAppliances(): any {
		return this._singleAppliances;
	}
	public set singleAppliances(value: any) {
		this._singleAppliances = value;
	}

	public get singleCompose(): boolean {
		return this._singleCompose;
	}
	public set singleCompose(value: boolean) {
		this._singleCompose = value;
	}

	public get sn8(): string {
		return this._sn8;
	}
	public set sn8(value: string) {
		this._sn8 = value;
	}

	public get supportWidget(): boolean {
		return this._supportWidget;
	}
	public set supportWidget(value: boolean) {
		this._supportWidget = value;
	}

	public get belong(): number {
		return this._belong;
	}
	public set belong(value: number) {
		this._belong = value;
	}
}