const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../dist');
const { encodeProperty, createSetPropertiesPayload } = require('../dist/command/PropertyCodec');
lib._LOGGER.silent = true;
function frame(payload) { return Buffer.concat([Buffer.alloc(10), Buffer.from(payload), Buffer.alloc(2)]); }
function basic() {
    const p = Buffer.alloc(22); p[0] = 0xC0; p[1] = 1; p[2] = (2 << 5) | 7 | 0x10;
    p[3] = 40; p[7] = 12; p[8] = 0x80; p[9] = 0x30; p[10] = 1;
    p[11] = 97; p[12] = 0xFF; p[14] = 0x70; p[15] = 5;
    return frame(p);
}
function property(id, bytes, result = 0) { return frame([0xB1, 1, id & 255, id >> 8, result, bytes.length, ...bytes]); }
function device() { const c = new lib.DeviceContext(); c.id = 123; return new lib.Device(c); }
function payload(command) {
    const encrypted = command._request.subarray(40, command._request.length - 16);
    return lib.Security.aesDecrypt(encrypted).subarray(10, -3);
}
test('basic state preserves unknown readings and decodes optional state bits', () => {
    const state = new lib.GetStateResponse(basic());
    const values = state.toStateSnapshot();
    assert.equal(values.followMe, true); assert.equal(values.anionMode, true);
    assert.equal(values.displayOn, false); assert.equal(values.sleepMode, true);
    assert.equal(values.indoorTemperature, 23.5); assert.equal(values.outdoorTemperature, undefined);
    assert.equal(values.targetTemperature, 23.5);
    const short = frame(basic().subarray(10, 27));
    assert.equal(new lib.GetStateResponse(short).toStateSnapshot().freezeProtectionMode, undefined);
    assert.throws(() => new lib.GetStateResponse(frame([0xC0])), /Truncated/);
});
test('basic writes encode Follow Me, ionisation, humidity and alternate temperature', () => {
    const s = new lib.GetStateResponse(basic()); s.targetTemperature = 15.5; s.targetHumidity = 45;
    const p = payload(new lib.SetStateCommand(device(), s));
    assert.equal(p[8] & 0x80, 0x80); assert.equal(p[9] & 0x20, 0x20);
    assert.equal(p[9] & 0x80, 0x80); // ECO SET bit differs from response bit.
    assert.equal(p[18], 3); assert.equal(p[19], 45);
    assert.equal(p[2] & 0x10, 0x10);
    s.targetTemperature = 18.25;
    assert.throws(() => new lib.SetStateCommand(device(), s), /temperature/);
});
test('property writes use requested values, correct headers and iECO generation', () => {
    const ids = lib.PROPERTY_ID;
    const map = new Map([[ids.SWING_UD_ANGLE, 75], [ids.OUT_SILENT, true]]);
    assert.deepEqual([...createSetPropertiesPayload(map)], [0xB0, 2, 9, 0, 1, 75, 0xCD, 0, 1, 3]);
    const ieco = encodeProperty(ids.IECO, { enabled: true, number: 8 });
    assert.deepEqual([...ieco], [0, 8, 1, ...Array(10).fill(0)]);
    const c = new lib.DeviceCapabilities(); c.iEcoNumber = 8; c.iEcoMode = true;
    assert.equal(encodeProperty(ids.IECO, true, c)[1], 8);
    assert.throws(() => encodeProperty(ids.INDOOR_HUMIDITY, 50), /read-only/);
    assert.throws(() => encodeProperty(ids.SWING_UD_ANGLE, 99), /Invalid/);
    c.outSilent = false;
    assert.throws(() => encodeProperty(ids.OUT_SILENT, true, c), /unsupported/);
});
test('long property requests are encrypted completely instead of truncated at 48 bytes', () => {
    const ids = lib.PROPERTY_ID;
    const command = new lib.SetPropertiesCommand(device(), new Map([
        [ids.IECO, {enabled:true, number:8}], [ids.SWING_UD_ANGLE, 100], [ids.SWING_LR_ANGLE, 25],
        [ids.JET_COOL, true], [ids.OUT_SILENT, true], [ids.SELF_CLEAN, true], [ids.FRESH_AIR, 60],
    ]));
    const p = payload(command);
    assert(p.length > 35); assert.equal(p[1], 7);
    assert.equal(p.at(-1), 0xFF);
});
test('property responses distinguish actual false, missing values and rejected properties', () => {
    const ids = lib.PROPERTY_ID;
    assert.equal(new lib.GetPropertiesResponse(property(ids.OUT_SILENT, [0])).get(ids.OUT_SILENT), false);
    const ieco = new lib.GetPropertiesResponse(property(ids.IECO, [8, 0]));
    assert.deepEqual(ieco.get(ids.IECO), {number:8, enabled:false});
    const rejected = new lib.GetPropertiesResponse(property(ids.JET_COOL, [1], 0x10));
    assert.equal(rejected.has(ids.JET_COOL), false); assert.equal(rejected.errors.get(ids.JET_COOL), 0x10);
    assert.throws(() => new lib.GetPropertiesResponse(property(ids.IECO, [1])), /Truncated/);
    assert.equal(new lib.GetPropertiesResponse(property(ids.BUZZER, [1])).has(ids.BUZZER), false);
});
test('sensors and energy expose real values including zero and reject bad formats', () => {
    const p = Buffer.alloc(19); p[0] = 0xC1; p[3] = 0x44;
    p.set([0, 0x01, 0x23, 0x45], 4); p.set([0, 0, 1, 0x25], 12); p.set([0, 0x12, 0x34], 16);
    const e = new lib.GetPowerUsageResponse(frame(p), 'bcd');
    assert.equal(e.totalEnergy, 123.45); assert.equal(e.currentEnergy, 1.25);
    assert.equal(e.realTimePower, 123.4);
    p.fill(0, 4); assert.equal(new lib.GetPowerUsageResponse(frame(p), 'bcd').realTimePower, 0);
    p.writeUInt32BE(1234, 4); assert.equal(new lib.GetPowerUsageResponse(frame(p), 'binary').totalEnergy, 123.4);
    p[4] = 0xFA; assert.throws(() => new lib.GetPowerUsageResponse(frame(p), 'bcd'), /BCD/);
    const g = Buffer.alloc(11); g[0] = 0xC1; g[3] = 0x45; g[4] = 55; g[8] = 20;
    const sensors = new lib.GetSensorStateResponse(frame(g));
    assert.equal(sensors.humidity, 55); assert.equal(sensors.defrost, false); assert.equal(sensors.outdoorFanSpeed, 160);
    assert.throws(() => new lib.GetSensorStateResponse(frame([0xC1])), /Truncated/);
});
test('failed writes are rejected and successful writes return actual read-back', async () => {
    const original = lib.LANCommand.prototype.execute;
    const id = lib.PROPERTY_ID.OUT_SILENT;
    try {
        lib.LANCommand.prototype.execute = async () => [property(id, [1], 0x10)];
        await assert.rejects(new lib.SetPropertiesCommand(device(), new Map([[id,true]])).execute(), /rejected/);
        let count = 0;
        lib.LANCommand.prototype.execute = async () => [property(id, [count++ ? 0 : 3])];
        const actual = await new lib.SetPropertiesCommand(device(), new Map([[id,true]])).execute();
        assert.equal(actual.get(id), false); assert.equal(count,2);
    } finally { lib.LANCommand.prototype.execute = original; }
});
test('all-states reads retain successful results when an optional query fails', async () => {
    const original = lib.LANCommand.prototype.execute;
    const caps = new lib.DeviceCapabilities(); caps.jetCool = true; caps.outSilent = false;
    try {
        let calls=0;
        lib.LANCommand.prototype.execute = async function() {
            calls++;
            if(this instanceof lib.GetStateCommand) return [basic()];
            throw Error('Optional property timeout');
        };
        const result = await new lib.GetAllStatesCommand(device(),caps).execute();
        assert.equal(result.values.powerOn,true);
        assert.equal(result.values.jetCool,null); assert.equal(result.values.outSilent,null);
        assert.equal(result.errors.jetCool,'Optional property timeout'); assert.equal(calls,2);
    } finally { lib.LANCommand.prototype.execute = original; }
});
test('commands sharing one device execute serially and recover after rejection', async () => {
    const d = device(); const start=[], finish=[];
    d.lanConnection.executeCommand = async () => {
        const n=start.length; start.push(n);
        await new Promise(resolve => setTimeout(resolve, 5));
        finish.push(n); if(n===0) throw Error('failed'); return [basic()];
    };
    const first = new lib.LANCommand(d,Buffer.from([0x41])).execute();
    const second = new lib.LANCommand(d,Buffer.from([0x41])).execute();
    await assert.rejects(first,/failed/); await second;
    assert.deepEqual(start,[0,1]); assert.deepEqual(finish,[0,1]);
});
test('display toggle and external temperature commands encode distinct query messages', () => {
    const p=payload(new lib.ToggleDisplayCommand(device()));
    assert.deepEqual([...p.subarray(0,5)],[0x41,2,0,0xFF,2]);
    assert.equal(p[6],2); // Legacy toggle marker.
    const t=payload(new lib.SetFollowMeTemperatureCommand(device(),22.5));
    assert.equal(t[1],0x23); assert.equal(t[5],95);
    assert.throws(() => new lib.SetFollowMeTemperatureCommand(device(),200), /range/);
});

test('property capability gates match advertised breeze, display and ECO values', () => {
    const caps = new lib.GetCapabilitiesResponse(frame([0xB5, 4,
        0x33, 0, 1, 1, 0x43, 0, 1, 1, 0x24, 2, 1, 100, 0x12, 2, 1, 2]));
    for(const name of ['windOffMe','breezeControl','lightControl','ecoMode']) {
        assert.equal(caps.getSupport(name),'supported',name);
    }
    assert.equal(caps.getSupport('iEcoMode'),'unknown');
});

test('invalid basic state values are rejected instead of wrapped into wire fields', () => {
    for(const [key,value] of [['targetHumidity',101],['targetHumidity',-1],['operationalMode',9],['swingMode',7],['fanSpeed',103]]) {
        const s = new lib.GetStateResponse(basic()); s[key]=value;
        assert.throws(() => new lib.SetStateCommand(device(),s), /Invalid/);
    }
});

test('standard extra flags round-trip and auxiliary heat never resets filter counters', () => {
 const f=basic(); f[18]|=8; f[19]|=6;
 const s=new lib.GetStateResponse(f);
 assert.equal(s.powerSaving,true); assert.equal(s.naturalWind,true); assert.equal(s.dryFunction,true);
 s.comfortMode=true;
 const p=payload(new lib.SetStateCommand(device(),s));
 assert.equal(p[8]&8,8);assert.equal(p[9]&4,4);assert.equal(p[17]&0x40,0x40);
 assert.equal(p[22],1);assert.equal(p[10]&0x80,0);
 const reset=payload(new lib.SetStateCommand(device(),s,{resetFilter:true}));
 assert.equal(reset[10]&0x80,0x80);assert.equal(reset[22]&8,8);
 s.independentAuxHeat=true;
 assert.throws(()=>new lib.SetStateCommand(device(),s),/explicit model profile/);
 s.protocolProfile='msmartAuxHeat';
 assert.equal(payload(new lib.SetStateCommand(device(),s))[22]&8,8);
 assert.throws(()=>new lib.SetStateCommand(device(),s,{resetFilter:true}),/standard state profile/);
});
