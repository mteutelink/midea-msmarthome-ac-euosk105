"use strict";

export enum OPERATIONAL_MODE {
	AUTO= 1,
	COOL =  2,
	DRY = 3,
	HEAT = 4,
	FAN = 5,
	CUSTOM_DRY = 6
};

export enum FAN_SPEED {
	AUTO = 102,		// 0x66
	FIXED = 101,	// 0x65
	SILENT = 20,	// 0x14
	LOW = 40,		// 0x28
	MEDIUM = 60,	// 0x3C
	HIGH = 80,		// 0x50
	FULL = 100		// 0x64
};

export enum SWING_MODE {
	OFF = 0x0,
	VERTICAL = 0xC,
	HORIZONTAL = 0x3,
	BOTH = 0xF
}

export enum SWING_ANGLE {
	OFF = 0,
	POS_1 = 1,
	POS_2 = 25,
	POS_3 = 50,
	POS_4 = 75,
	POS_5 = 100
}

export const MIN_TARGET_TEMPERATURE = 16;
export const MAX_TARGET_TEMPERATURE = 30;

export type StateProtocolProfile = 'standard' | 'msmartAuxHeat';

export class DeviceState {
    public protocolProfile: StateProtocolProfile = 'standard';
    private _reportedState: Record<string, boolean | number> = {};
    /** Values actually read from a response or explicitly assigned by the caller. */
    public toStateSnapshot(): Record<string, boolean | number> { return { ...this._reportedState }; }

    private _powerSaving: boolean = false;
    public get powerSaving(): boolean { return this._powerSaving; }
    public set powerSaving(value: boolean) { this._powerSaving = value; this._reportedState.powerSaving = value; }

    private _naturalWind: boolean = false;
    public get naturalWind(): boolean { return this._naturalWind; }
    public set naturalWind(value: boolean) { this._naturalWind = value; this._reportedState.naturalWind = value; }

    private _dryFunction: boolean = false;
    public get dryFunction(): boolean { return this._dryFunction; }
    public set dryFunction(value: boolean) { this._dryFunction = value; this._reportedState.dryFunction = value; }

    private _comfortMode: boolean = false;
    public get comfortMode(): boolean { return this._comfortMode; }
    public set comfortMode(value: boolean) { this._comfortMode = value; this._reportedState.comfortMode = value; }

    private _smartEye = false;
    public get smartEye(): boolean { return this._smartEye; }
    public set smartEye(value: boolean) { this._smartEye = value; this._reportedState.smartEye = value; }

    private _followMe: boolean = false;
    public get followMe(): boolean { return this._followMe; }
    public set followMe(value: boolean) { this._followMe = value; this._reportedState.followMe = value; }

    private _anionMode: boolean = false;
    public get anionMode(): boolean { return this._anionMode; }
    public set anionMode(value: boolean) { this._anionMode = value; this._reportedState.anionMode = value; }

    private _displayOn: boolean = false;
    public get displayOn(): boolean { return this._displayOn; }
    public set displayOn(value: boolean) { this._displayOn = value; this._reportedState.displayOn = value; }

    private _filterAlert: boolean = false;
    public get filterAlert(): boolean { return this._filterAlert; }
    public set filterAlert(value: boolean) { this._filterAlert = value; this._reportedState.filterAlert = value; }

    private _auxHeat: boolean = false;
    public get auxHeat(): boolean { return this._auxHeat; }
    public set auxHeat(value: boolean) { this._auxHeat = value; this._reportedState.auxHeat = value; }

    private _independentAuxHeat: boolean = false;
    public get independentAuxHeat(): boolean { return this._independentAuxHeat; }
    public set independentAuxHeat(value: boolean) { this._independentAuxHeat = value; this._reportedState.independentAuxHeat = value; }

    private _beepOn: boolean = false;
    public get beepOn(): boolean { return this._beepOn; }
    public set beepOn(value: boolean) { this._beepOn = value; this._reportedState.beepOn = value; }

    private _targetHumidity: number = 0;
    public get targetHumidity(): number { return this._targetHumidity; }
    public set targetHumidity(value: number) { this._targetHumidity = value; this._reportedState.targetHumidity = value; }

	private _powerOn: boolean = false;
	private _operationalMode: OPERATIONAL_MODE = OPERATIONAL_MODE.AUTO;
	private _fanSpeed: FAN_SPEED = FAN_SPEED.AUTO;
	private _swingMode: SWING_MODE = SWING_MODE.OFF;
	private _horizontalSwingAngle: SWING_ANGLE = SWING_ANGLE.OFF;
	private _verticalSwingAngle: SWING_ANGLE = SWING_ANGLE.OFF;
	private _turboMode: boolean = false;
	private _ecoMode: boolean = false;
	private _sleepMode: boolean = false;
	private _freezeProtectionMode: boolean = false;

	private _fahrenheit: boolean = false;
	private _targetTemperature: number = MIN_TARGET_TEMPERATURE;
	private _indoorTemperature: number = 0;
	private _outdoorTemperature: number = 0;

		//  0:  "OK"
		//  1:  "Interior board and display board communication failure"
		//  2:  "Indoor main control board E party failure"
		//  3:  "Indoor board and Outdoor board communication failure"
		//  4:  "Zero crossing detection failure"
		//  5:  "Indoor board fan stall failure"
		//  6:  "Outdoor condenser sensor failure"
		//  7:  "Outdoor ambient temperature sensor failure"
		//  8:  "Outdoor compression Engine exhaust temperature sensor failure"
		//  9:  "Outdoor E side failure"
		//  10: "Indoor temperature sensor failure"
		//  11: "Indoor evaporator temperature sensor failure"
		//  12: "Outdoor wind speed stall failure"
		//  13: "IPM Module protection"
		//  14: "Voltage protection"
		//  15: "Outdoor compressor top temperature protection"
		//  16: "Outdoor temperature low protection"
		//  17: "Compressor position protection"
		//  18: "Display board E side fault"
		//  21: "Outer pipe temperature protection"
		//  23: "Exhaust high temperature protection"
		//  25: "Heating and cold wind protection"
		//  26: "Current protection"
		//  29: "Evaporator high and low temperature protection"
		//  30: "Condenser High and low temperature protection frequency limit"
		//  31: "Exhaust high and low temperature protection"
		//  32: "Indoor and outdoor communication mismatch protocol"
		//  33: "Refrigerant leakage protection"
	private _statusCode: number = 0;

	// POWERON
	get powerOn() {
		return this._powerOn;
	}

	set powerOn(value) {
		this._powerOn = value;
        this._reportedState.powerOn = value;
	}

	// OPERATIONAL_MODE
	get operationalMode() {
		return this._operationalMode;
	}

	set operationalMode(operationalMode) {
		this._operationalMode = operationalMode;
        this._reportedState.operationalMode = operationalMode;
	}

	// FAN_SPEED
	get fanSpeed() {
		return this._fanSpeed;
	}

	set fanSpeed(fanSpeed) {
		this._fanSpeed = fanSpeed;
        this._reportedState.fanSpeed = fanSpeed;
	}

	// SWING_MODE
	get swingMode() {
		return this._swingMode;
	}

	set swingMode(swingMode) {
		this._swingMode = swingMode;
        this._reportedState.swingMode = swingMode;
	}

	// HORIZONTAL_SWING_ANGLE
	get horizontalSwingAngle() {
		return this._horizontalSwingAngle;
	}

	set horizontalSwingAngle(horizontalSwingAngle) {
		this._horizontalSwingAngle = horizontalSwingAngle;
        this._reportedState.horizontalSwingAngle = horizontalSwingAngle;
	}

	// VERTICAL_SWING_ANGLE
	get verticalSwingAngle() {
		return this._verticalSwingAngle;
	}

	set verticalSwingAngle(verticalSwingAngle) {
		this._verticalSwingAngle = verticalSwingAngle;
        this._reportedState.verticalSwingAngle = verticalSwingAngle;
	}

	// TURBO_MODE
	get turboMode() {
		return this._turboMode;
	}

	set turboMode(turboMode) {
		this._turboMode = turboMode;
        this._reportedState.turboMode = turboMode;
	}

	// ECO_MODE
	get ecoMode() {
		return this._ecoMode;
	}

	set ecoMode(ecoMode) {
		this._ecoMode = ecoMode;
        this._reportedState.ecoMode = ecoMode;
	}

	// SLEEP_MODE
	get sleepMode() {
		return this._sleepMode;
	}

	set sleepMode(sleepMode) {
		this._sleepMode = sleepMode;
        this._reportedState.sleepMode = sleepMode;
	}

	// FREEZE_PROTECTION_MODE
	get freezeProtectionMode() {
		return this._freezeProtectionMode;
	}

	set freezeProtectionMode(freezeProtectionMode) {
		this._freezeProtectionMode = freezeProtectionMode;
        this._reportedState.freezeProtectionMode = freezeProtectionMode;
	}

	// FAHRENHEIT
	get fahrenheit() {
		return this._fahrenheit;
	}

	set fahrenheit(fahrenheit) {
		this._fahrenheit = fahrenheit;
        this._reportedState.fahrenheit = fahrenheit;
	}

	// TARGET_TEMPERATURE
	get targetTemperature() {
		return this._targetTemperature;
	}

	set targetTemperature(targetTemperature) {
		this._targetTemperature = targetTemperature;
        this._reportedState.targetTemperature = targetTemperature;
	}

	// INDOOR_TEMPERATURE
	get indoorTemperature() {
		return this._indoorTemperature;
	}

	set indoorTemperature(indoorTemperature) {
		this._indoorTemperature = indoorTemperature;
        this._reportedState.indoorTemperature = indoorTemperature;
	}

	// OUTDOOR_TEMPERATURE
	get outdoorTemperature() {
		return this._outdoorTemperature;
	}

	set outdoorTemperature(outindoorTemperature) {
		this._outdoorTemperature = outindoorTemperature;
        this._reportedState.outdoorTemperature = outindoorTemperature;
	}

	// STATUSCODE
	get statusCode() {
		return this._statusCode;
	}

	set statusCode(statusCode) {
		this._statusCode = statusCode;
        this._reportedState.statusCode = statusCode;
	}
}