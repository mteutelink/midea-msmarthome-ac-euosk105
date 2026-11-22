"use strict";

export type CapabilitySupport = 'supported' | 'unsupported' | 'unknown';

export const BOOLEAN_CAPABILITIES = ["activeClean","autoMode","autoSetHumidity","breezeControl","buzzer","coolMode","decimals","downNoWindFeel","dryMode","ecoMode","electricAuxHeating","fanSpeedControl","frostProtectionMode","heatMode","indoorHumidity","leftrightFan","lightControl","manualSetHumidity","nestCheck","nestNeedChange","oneKeyNoWindOnMe","powerCal","powerCalSetting","silkyCool","smartEye","specialEco","turboCool","turboHeat","unitChangeable","updownFan","upNoWindFeel","windOffMe","windOnMe"] as const;
export const NUMERIC_CAPABILITIES = ["maxTempAuto","maxTempCool","maxTempHeat","minTempAuto","minTempCool","minTempHeat"] as const;
export type BooleanCapability = typeof BOOLEAN_CAPABILITIES[number];
export type NumericCapability = typeof NUMERIC_CAPABILITIES[number];
export type CapabilityName = BooleanCapability | NumericCapability;

export interface RawCapability {
    /** Little-endian 16-bit capability identifier, rendered as four hex digits. */
    id: string;
    value: number[];
}

export interface CapabilitySnapshot {
    version: 1;
    /** Only values actually reported by the appliance; defaults are omitted. */
    reported: Partial<Record<CapabilityName, boolean | number>>;
    raw: RawCapability[];
}

export class DeviceCapabilities {
    private _reported: Partial<Record<CapabilityName, boolean | number>> = {};
    private _rawCapabilities: RawCapability[] = [];

    public getSupport(name: BooleanCapability): CapabilitySupport {
        const value = this._reported[name];
        return value === true ? 'supported' : value === false ? 'unsupported' : 'unknown';
    }

    public getReportedValue(name: CapabilityName): boolean | number | undefined {
        return this._reported[name];
    }

    public recordRawCapability(id: number, value: number[]): void {
        const key = id.toString(16).padStart(4, '0');
        const entry = { id: key, value: [...value] };
        const index = this._rawCapabilities.findIndex(item => item.id === key);
        if (index < 0) this._rawCapabilities.push(entry);
        else this._rawCapabilities[index] = entry;
    }

    public toSnapshot(): CapabilitySnapshot {
        return {
            version: 1,
            reported: { ...this._reported },
            raw: this._rawCapabilities.map(item => ({ id: item.id, value: [...item.value] }))
        };
    }

    public static fromSnapshot(snapshot: CapabilitySnapshot): DeviceCapabilities {
        if (!snapshot || snapshot.version !== 1 || !snapshot.reported || !Array.isArray(snapshot.raw)) {
            throw new Error('Invalid capability snapshot');
        }
        const result = new DeviceCapabilities();
        for (const name of BOOLEAN_CAPABILITIES) {
            const value = snapshot.reported[name];
            if (typeof value === 'boolean') result[name] = value;
        }
        for (const name of NUMERIC_CAPABILITIES) {
            const value = snapshot.reported[name];
            if (typeof value === 'number' && Number.isFinite(value)) result[name] = value;
        }
        for (const entry of snapshot.raw) {
            if (/^[0-9a-f]{4}$/i.test(entry.id) && Array.isArray(entry.value)
                && entry.value.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) {
                result.recordRawCapability(parseInt(entry.id, 16), entry.value);
            }
        }
        return result;
    }

    /** Missing fields in a partial response never erase previously reported values. */
    public merge(update: DeviceCapabilities): DeviceCapabilities {
        const current = this.toSnapshot();
        const next = update.toSnapshot();
        const raw = new Map(current.raw.map(item => [item.id, item]));
        for (const item of next.raw) raw.set(item.id, item);
        return DeviceCapabilities.fromSnapshot({
            version: 1,
            reported: { ...current.reported, ...next.reported },
            raw: [...raw.values()]
        });
    }

	private _activeClean: boolean = false;
	private _autoMode: boolean = false;
	private _autoSetHumidity: boolean = false;
	private _breezeControl: boolean = false;
	private _buzzer: boolean = false;
	private _coolMode: boolean = false;
	private _decimals: boolean = false;
	private _downNoWindFeel: boolean = false;
	private _dryMode: boolean = false;
	private _ecoMode: boolean = false;
	private _electricAuxHeating: boolean = false;
	private _fanSpeedControl: boolean = true;
	private _frostProtectionMode: boolean = false;
	private _heatMode: boolean = false;
	private _indoorHumidity: boolean = false;
	private _leftrightFan: boolean = false;
	private _lightControl: boolean = false;
	private _manualSetHumidity: boolean = false;
	private _maxTempAuto: number = 30;
	private _maxTempCool: number = 30;
	private _maxTempHeat: number = 30;
	private _minTempAuto: number = 17;
	private _minTempCool: number = 17;
	private _minTempHeat: number = 17;
	private _nestCheck: boolean = false;
	private _nestNeedChange: boolean = false;
	private _oneKeyNoWindOnMe: boolean = false;
	private _powerCal: boolean = false;
	private _powerCalSetting: boolean = false;
	private _silkyCool: boolean = false;
	private _smartEye: boolean = false;
	private _specialEco: boolean = false;
	private _turboCool: boolean = false;
	private _turboHeat: boolean = false;
	private _unitChangeable: boolean = false;
	private _updownFan: boolean = false;
	private _upNoWindFeel: boolean = false;
	private _windOffMe: boolean = false;
	private _windOnMe: boolean = false;

	public get activeClean(): boolean {
		return this._activeClean;
	}
	public set activeClean(value: boolean) {
		this._activeClean = value;
        this._reported.activeClean = value;
	}

	public get autoMode(): boolean {
		return this._autoMode;
	}
	public set autoMode(value: boolean) {
		this._autoMode = value;
        this._reported.autoMode = value;
	}
	
	public get autoSetHumidity(): boolean {
		return this._autoSetHumidity;
	}
	public set autoSetHumidity(value: boolean) {
		this._autoSetHumidity = value;
        this._reported.autoSetHumidity = value;
	}

	public get breezeControl(): boolean {
		return this._breezeControl;
	}
	public set breezeControl(value: boolean) {
		this._breezeControl = value;
        this._reported.breezeControl = value;
	}

	public get buzzer(): boolean {
		return this._buzzer;
	}
	public set buzzer(value: boolean) {
		this._buzzer = value;
        this._reported.buzzer = value;
	}

	public get coolMode(): boolean {
		return this._coolMode;
	}
	public set coolMode(value: boolean) {
		this._coolMode = value;
        this._reported.coolMode = value;
	}

	public get decimals(): boolean {
		return this._decimals;
	}
	public set decimals(value: boolean) {
		this._decimals = value;
        this._reported.decimals = value;
	}

	public get downNoWindFeel(): boolean {
		return this._downNoWindFeel;
	}
	public set downNoWindFeel(value: boolean) {
		this._downNoWindFeel = value;
        this._reported.downNoWindFeel = value;
	}

	public get dryMode(): boolean {
		return this._dryMode;
	}
	public set dryMode(value: boolean) {
		this._dryMode = value;
        this._reported.dryMode = value;
	}

	public get ecoMode(): boolean {
		return this._ecoMode;
	}
	public set ecoMode(value: boolean) {
		this._ecoMode = value;
        this._reported.ecoMode = value;
	}

	public get electricAuxHeating(): boolean {
		return this._electricAuxHeating;
	}
	public set electricAuxHeating(value: boolean) {
		this._electricAuxHeating = value;
        this._reported.electricAuxHeating = value;
	}

	public get fanSpeedControl(): boolean {
		return this._fanSpeedControl;
	}
	public set fanSpeedControl(value: boolean) {
		this._fanSpeedControl = value;
        this._reported.fanSpeedControl = value;
	}

	public get frostProtectionMode(): boolean {
		return this._frostProtectionMode;
	}
	public set frostProtectionMode(value: boolean) {
		this._frostProtectionMode = value;
        this._reported.frostProtectionMode = value;
	}

	public get heatMode(): boolean {
		return this._heatMode;
	}
	public set heatMode(value: boolean) {
		this._heatMode = value;
        this._reported.heatMode = value;
	}

	public get indoorHumidity(): boolean {
		return this._indoorHumidity;
	}
	public set indoorHumidity(value: boolean) {
		this._indoorHumidity = value;
        this._reported.indoorHumidity = value;
	}

	public get leftrightFan(): boolean {
		return this._leftrightFan;
	}
	public set leftrightFan(value: boolean) {
		this._leftrightFan = value;
        this._reported.leftrightFan = value;
	}

	public get lightControl(): boolean {
		return this._lightControl;
	}
	public set lightControl(value: boolean) {
		this._lightControl = value;
        this._reported.lightControl = value;
	}

	public get manualSetHumidity(): boolean {
		return this._manualSetHumidity;
	}
	public set manualSetHumidity(value: boolean) {
		this._manualSetHumidity = value;
        this._reported.manualSetHumidity = value;
	}

	public get maxTempAuto(): number {
		return this._maxTempAuto;
	}
	public set maxTempAuto(value: number) {
		this._maxTempAuto = value;
        this._reported.maxTempAuto = value;
	}

	public get maxTempCool(): number {
		return this._maxTempCool;
	}
	public set maxTempCool(value: number) {
		this._maxTempCool = value;
        this._reported.maxTempCool = value;
	}

	public get maxTempHeat(): number {
		return this._maxTempHeat;
	}
	public set maxTempHeat(value: number) {
		this._maxTempHeat = value;
        this._reported.maxTempHeat = value;
	}

	public get minTempAuto(): number {
		return this._minTempAuto;
	}
	public set minTempAuto(value: number) {
		this._minTempAuto = value;
        this._reported.minTempAuto = value;
	}

	public get minTempCool(): number {
		return this._minTempCool;
	}
	public set minTempCool(value: number) {
		this._minTempCool = value;
        this._reported.minTempCool = value;
	}

	public get minTempHeat(): number {
		return this._minTempHeat;
	}
	public set minTempHeat(value: number) {
		this._minTempHeat = value;
        this._reported.minTempHeat = value;
	}

	public get nestCheck(): boolean {
		return this._nestCheck;
	}
	public set nestCheck(value: boolean) {
		this._nestCheck = value;
        this._reported.nestCheck = value;
	}

	public get nestNeedChange(): boolean {
		return this._nestNeedChange;
	}
	public set nestNeedChange(value: boolean) {
		this._nestNeedChange = value;
        this._reported.nestNeedChange = value;
	}

	public get oneKeyNoWindOnMe(): boolean {
		return this._oneKeyNoWindOnMe;
	}
	public set oneKeyNoWindOnMe(value: boolean) {
		this._oneKeyNoWindOnMe = value;
        this._reported.oneKeyNoWindOnMe = value;
	}

	public get powerCal(): boolean {
		return this._powerCal;
	}
	public set powerCal(value: boolean) {
		this._powerCal = value;
        this._reported.powerCal = value;
	}

	public get powerCalSetting(): boolean {
		return this._powerCalSetting;
	}
	public set powerCalSetting(value: boolean) {
		this._powerCalSetting = value;
        this._reported.powerCalSetting = value;
	}

	public get silkyCool(): boolean {
		return this._silkyCool;
	}
	public set silkyCool(value: boolean) {
		this._silkyCool = value;
        this._reported.silkyCool = value;
	}

	public get smartEye(): boolean {
		return this._smartEye;
	}
	public set smartEye(value: boolean) {
		this._smartEye = value;
        this._reported.smartEye = value;
	}

	public get specialEco(): boolean {
		return this._specialEco;
	}
	public set specialEco(value: boolean) {
		this._specialEco = value;
        this._reported.specialEco = value;
	}

	public get turboCool(): boolean {
		return this._turboCool;
	}
	public set turboCool(value: boolean) {
		this._turboCool = value;
        this._reported.turboCool = value;
	}

	public get turboHeat(): boolean {
		return this._turboHeat;
	}
	public set turboHeat(value: boolean) {
		this._turboHeat = value;
        this._reported.turboHeat = value;
	}

	public get unitChangeable(): boolean {
		return this._unitChangeable;
	}
	public set unitChangeable(value: boolean) {
		this._unitChangeable = value;
        this._reported.unitChangeable = value;
	}

	public get updownFan(): boolean {
		return this._updownFan;
	}
	public set updownFan(value: boolean) {
		this._updownFan = value;
        this._reported.updownFan = value;
	}

	public get upNoWindFeel(): boolean {
		return this._upNoWindFeel;
	}
	public set upNoWindFeel(value: boolean) {
		this._upNoWindFeel = value;
        this._reported.upNoWindFeel = value;
	}

	public get windOffMe(): boolean {
		return this._windOffMe;
	}
	public set windOffMe(value: boolean) {
		this._windOffMe = value;
        this._reported.windOffMe = value;
	}

	public get windOnMe(): boolean {
		return this._windOnMe;
	}
	public set windOnMe(value: boolean) {
		this._windOnMe = value;
        this._reported.windOnMe = value;
	}
}
