"use strict";

import { MIDEA_APPLIANCE_TYPE } from "./MideaConstants";

export class DeviceContext {
	private _id: number = 0;
	private _ssid: string ='';
	private _macAddress: string ='';
	private _host: string ='';
	private _port: number = 0;
	private _serial: string ='';
	private _firmware: string ='';
	private _udpId: string ='';
	private _version: number = 0;
	private _applianceType: MIDEA_APPLIANCE_TYPE;

	// ID
	public get id(): number {
		return this._id;
	}

	public set id(id: number) {
		this._id = id;
	}

	// SSID
	public get ssid(): string {
		return this._ssid;
	}

	public set ssid(ssid: string) {
		this._ssid = ssid;
	}

	// MACADDRESS
	public get macAddress(): string {
		return this._macAddress;
	}

	public set macAddress(macAddress: string) {
		this._macAddress = macAddress;
	}

	// HOST
	public get host(): string {
		return this._host;
	}

	public set host(host: string) {
		this._host = host;
	}

	// PORT
	public get port(): number {
		return this._port
	}

	public set port(port: number) {
		this._port = port;
	}

	// SERIAL
	public get serial(): string {
		return this._serial;
	}

	public set serial(serial: string) {
		this._serial = serial;
	}

	// FIRMWARE
	public get firmware(): string {
		return this._firmware;
	}

	public set firmware(firmware: string) {
		this._firmware = firmware;
	}

	// UDPID
	public get udpId(): string {
		return this._udpId;
	}

	public set udpId(udpId: string) {
		this._udpId = udpId;
	}

	// ENCRYPTION VERSION
	public get version(): number {
		return this._version;
	}
	public set version(value: number) {
		this._version = value;
	}

	// APPLIANCE TYPE
	public get applianceType(): MIDEA_APPLIANCE_TYPE {
		return this._applianceType;
	}
	public set applianceType(value: MIDEA_APPLIANCE_TYPE) {
		this._applianceType = value;
	}
}