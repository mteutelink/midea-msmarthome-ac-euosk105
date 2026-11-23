import { Device } from '../Device';
import { DeviceCapabilities } from '../DeviceCapabilities';
import { GetStateCommand } from './GetStateCommand';
import { GetCapabilitiesCommand } from './GetCapabilitiesCommand';
import { GetPropertiesCommand } from './GetPropertiesCommand';
import { PropertyValue, PROPERTY_ID, PROPERTY_FEATURES } from './PropertyCodec';
import { GetPowerUsageCommand } from './GetPowerUsageCommand';
import { EnergyDecodeMode } from './GetPowerUsageResponse';
import { GetSensorStateCommand } from './GetSensorStateCommand';

export interface AllStatesOptions {
    /** Explicit opt-in to read optional functions not advertised in B5. Never writes. */
    probeUnknown?: boolean;
    energyFormat?: EnergyDecodeMode;
}
export interface AllStatesSnapshot {
    values: Record<string, boolean | number | PropertyValue | null>;
    errors: Record<string, string>;
}
const PROPERTIES: Array<[string, PROPERTY_ID]> = [
    ['verticalSwingAngle', PROPERTY_ID.SWING_UD_ANGLE],
    ['horizontalSwingAngle', PROPERTY_ID.SWING_LR_ANGLE],
    ['breezeless', PROPERTY_ID.BREEZELESS], ['selfClean', PROPERTY_ID.SELF_CLEAN],
    ['indirectWind', PROPERTY_ID.INDIRECT_WIND], ['breezeControl', PROPERTY_ID.BREEZE_CONTROL],
    ['rateSelect', PROPERTY_ID.RATE_SELECT], ['freshAirSpeed', PROPERTY_ID.FRESH_AIR],
    ['breezeAwayDirection', PROPERTY_ID.BREEZE_AWAY_DIRECTION], ['cascade', PROPERTY_ID.CASCADE],
    ['jetCool', PROPERTY_ID.JET_COOL], ['outSilent', PROPERTY_ID.OUT_SILENT],
    ['iEco', PROPERTY_ID.IECO], ['sound', PROPERTY_ID.SOUND],
];
export class GetAllStatesCommand {
    constructor(private readonly device: Device, private capabilities?: DeviceCapabilities,
        private readonly options: AllStatesOptions = {}) {}

    public async execute(): Promise<AllStatesSnapshot> {
        const values: AllStatesSnapshot['values'] = {};
        const errors: Record<string, string> = {};
        const message = (error: unknown) => error instanceof Error ? error.message : String(error);
        try { Object.assign(values, (await new GetStateCommand(this.device).execute()).toStateSnapshot()); }
        catch (error) { errors.basic = message(error); }
        if (!this.capabilities) {
            try { this.capabilities = await new GetCapabilitiesCommand(this.device).execute(); }
            catch (error) { errors.capabilities = message(error); }
        }
        const caps = this.capabilities;
        const mayRead = (names: string[]) => {
            const support = names.map(name => caps?.getSupport(name as any) ?? 'unknown');
            return support.includes('supported') || (Boolean(this.options.probeUnknown) && support.includes('unknown'));
        };
        for (const [name, id] of PROPERTIES) {
            values[name] = null; // Not obtained, never pretend an unread value is false.
            if (!mayRead(PROPERTY_FEATURES[id]!)) continue;
            try {
                const result = await new GetPropertiesCommand(this.device, [id], caps).execute();
                if (result.errors.has(id)) throw new Error('Property rejected: ' + result.errors.get(id));
                values[name] = result.get(id) ?? null;
            } catch (error) { errors[name] = message(error); }
        }
        values.totalEnergy = values.currentEnergy = values.realTimePower = null;
        if (mayRead(['energyStats', 'powerCal'])) {
            const support = caps?.getSupport('energyBcd') ?? 'unknown';
            const format = this.options.energyFormat ?? (support === 'supported' ? 'bcd'
                : support === 'unsupported' ? 'binary' : undefined);
            if (!format) errors.energy = 'Energy format unknown; specify energyFormat';
            else try {
                const result = await new GetPowerUsageCommand(this.device, format).execute();
                values.totalEnergy = result.totalEnergy; values.currentEnergy = result.currentEnergy;
                values.realTimePower = result.realTimePower;
            } catch (error) { errors.energy = message(error); }
        }
        values.humidity = values.defrost = values.outdoorFanSpeed = null;
        if (mayRead(['indoorHumidity', 'defrostSensor', 'outdoorFanSpeedSensor'])) {
            try {
                const result = await new GetSensorStateCommand(this.device).execute();
                values.humidity = result.humidity; values.defrost = result.defrost;
                values.outdoorFanSpeed = result.outdoorFanSpeed;
            } catch (error) { errors.sensors = message(error); }
        }
        return { values, errors };
    }
}
