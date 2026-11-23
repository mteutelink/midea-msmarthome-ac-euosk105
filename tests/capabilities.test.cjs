const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DeviceCapabilities, GetCapabilitiesResponse } = require('../dist');

function page(entries, more = false) {
  const payload = Buffer.from([0xb5, entries.length,
    ...entries.flatMap(([id, values]) => [id & 255, id >> 8, values.length, ...values]),
    more ? 1 : 0, 0]);
  return Buffer.concat([Buffer.alloc(10), payload, Buffer.alloc(2)]);
}

test('missing and explicitly false capabilities are distinct; legacy getters remain compatible', () => {
  const caps = new DeviceCapabilities();
  assert.equal(caps.heatMode, false);
  assert.equal(caps.fanSpeedControl, true);
  assert.equal(caps.getSupport('heatMode'), 'unknown');
  assert.equal(caps.getSupport('fanSpeedControl'), 'unknown');
  caps.heatMode = false;
  assert.equal(caps.getSupport('heatMode'), 'unsupported');
  caps.heatMode = true;
  assert.equal(caps.getSupport('heatMode'), 'supported');
});

test('cool-only model, vertical-only swing, temperature bounds and half degrees', () => {
  const caps = new GetCapabilitiesResponse(page([
    [0x0214, [0]], [0x0215, [0]], [0x0225, [32, 60, 34, 60, 32, 60, 1]],
  ]));
  assert.equal(caps.getSupport('heatMode'), 'unsupported');
  assert.equal(caps.getSupport('coolMode'), 'supported');
  assert.equal(caps.getSupport('updownFan'), 'supported');
  assert.equal(caps.getSupport('leftrightFan'), 'unsupported');
  assert.equal(caps.getReportedValue('minTempCool'), 16);
  assert.equal(caps.getSupport('decimals'), 'supported');
  assert.equal(caps.getSupport('activeClean'), 'unknown');
});

test('unknown TLVs survive snapshot round-trip without inventing feature support', () => {
  const caps = new GetCapabilitiesResponse(page([[0x7fab, [1, 2, 3]]]));
  const snapshot = JSON.parse(JSON.stringify(caps.toSnapshot()));
  assert.deepEqual(DeviceCapabilities.fromSnapshot(snapshot).toSnapshot(), snapshot);
  assert.deepEqual(snapshot.raw, [{ id: '7fab', value: [1, 2, 3] }]);
  assert.equal(caps.getSupport('activeClean'), 'unknown');
  snapshot.raw[0].value[0] = 99;
  assert.equal(caps.toSnapshot().raw[0].value[0], 1);
});

test('additional capability pages preserve first-page information', () => {
  const caps = new GetCapabilitiesResponse(page([[0x0214, [1]]], true));
  assert.equal(caps.hasMoreCapabilities, true);
  caps.parse(caps, page([[0x0039, [1]]]));
  assert.equal(caps.getSupport('heatMode'), 'supported');
  assert.equal(caps.getSupport('activeClean'), 'supported');
  assert.equal(caps.hasMoreCapabilities, false);
});

test('partial updates preserve known fields, explicit updates replace them', () => {
  const old = new GetCapabilitiesResponse(page([[0x0214, [1]], [0x0039, [1]]]));
  const partial = new GetCapabilitiesResponse(page([[0x0215, [2]]]));
  const merged = old.merge(partial);
  assert.equal(merged.getSupport('heatMode'), 'supported');
  assert.equal(merged.getSupport('activeClean'), 'supported');
  const changed = new GetCapabilitiesResponse(page([[0x0214, [0]]]));
  assert.equal(merged.merge(changed).getSupport('heatMode'), 'unsupported');
  assert.equal(old.getSupport('heatMode'), 'supported');
});

test('truncated pages are rejected before changing known support', () => {
  const caps = new GetCapabilitiesResponse(page([[0x0214, [1]]]));
  const before = caps.toSnapshot();
  const bad = Buffer.concat([Buffer.alloc(10),
    Buffer.from([0xb5, 2, 0x14, 2, 1, 0, 0x39, 0, 8, 1]), Buffer.alloc(2)]);
  assert.throws(() => caps.parse(caps, bad), /Truncated/);
  assert.deepEqual(caps.toSnapshot(), before);
  assert.throws(() => new GetCapabilitiesResponse(Buffer.alloc(4)), /Truncated/);
});

test('six-byte temperature capability does not guess decimal support', () => {
  const caps = new GetCapabilitiesResponse(page([[0x0225, [32, 60, 34, 60, 32, 60]]]));
  assert.equal(caps.getSupport('decimals'), 'unknown');
});

test('extended feature advertisements are decoded independently', () => {
  const caps = new GetCapabilitiesResponse(page([
    [0x0009, [1]], [0x000a, [0]], [0x021e, [1]], [0x0067, [4]],
    [0x00cd, [3]], [0x0039, [1]], [0x0048, [2]], [0x004b, [1]],
    [0x0059, [1]], [0x0018, [1]], [0x0058, [2]], [0x0217, [4]],
  ]));
  for (const name of ['swingVerticalAngle', 'anionMode', 'jetCool', 'outSilent',
    'selfClean', 'activeClean', 'rateSelect5Level', 'freshAir', 'cascade',
    'breezeless', 'breezeAwayDirection', 'filterReminder', 'filterCleanReminder']) {
    assert.equal(caps.getSupport(name), 'supported', name);
  }
  assert.equal(caps.getSupport('swingHorizontalAngle'), 'unsupported');
  assert.equal(caps.getSupport('rateSelect2Level'), 'unsupported');
  for (const name of ['followMe', 'defrostSensor', 'outdoorFanSpeedSensor']) {
    assert.equal(caps.getSupport(name), 'unknown', name);
  }
});

test('iECO generation bytes distinguish cooling, heating and ECOMaster', () => {
  for (const [bytes, cool, heat, number] of [
    [[1], true, false, undefined], [[4], false, true, undefined],
    [[3], true, true, undefined], [[0, 1], true, false, 3],
    [[0, 3], false, true, 3], [[0, 8], true, true, 8],
    [[0, 0], false, false, 1],
  ]) {
    const caps = new GetCapabilitiesResponse(page([[0x00e3, bytes]]));
    assert.equal(caps.iEcoCool, cool);
    assert.equal(caps.iEcoHeat, heat);
    assert.equal(caps.getSupport('iEcoMode'), cool || heat ? 'supported' : 'unsupported');
    assert.equal(caps.getReportedValue('iEcoNumber'), number);
    assert.equal(caps.getSupport('ecoMode'), 'unknown');
  }
  const unknown = new GetCapabilitiesResponse(page([[0x00e3, [99]]]));
  assert.equal(unknown.getSupport('iEcoMode'), 'unknown');
});

test('energy format variants include BCD and binary without guessing values', () => {
  for (const [value, supported, setting, bcd] of [
    [0, false, false, false], [1, false, false, false],
    [2, true, false, true], [3, true, true, true],
    [4, true, false, false], [5, true, true, false],
  ]) {
    const caps = new GetCapabilitiesResponse(page([[0x0216, [value]]]));
    assert.equal(caps.energyStats, supported);
    assert.equal(caps.powerCal, supported);
    assert.equal(caps.energySetting, setting);
    assert.equal(caps.energyBcd, bcd);
  }
});

test('fixed angle support is independent of swing; zero-length is unknown', () => {
  const caps = new GetCapabilitiesResponse(page([[0x0215, [1]], [0x0009, [0]], [0x0067, []]]));
  assert.equal(caps.getSupport('updownFan'), 'supported');
  assert.equal(caps.getSupport('swingVerticalAngle'), 'unsupported');
  assert.equal(caps.getSupport('jetCool'), 'unknown');
});

test('custom fan control and newer HVAC combinations are recognized', () => {
  const custom = new GetCapabilitiesResponse(page([[0x0210, [1]], [0x0214, [9]]]));
  for (const name of ['fanSpeedControl', 'fanCustom', 'fanLow', 'fanMedium',
    'fanHigh', 'fanSilent', 'fanAuto', 'auxHeatMode', 'auxMode', 'heatMode', 'coolMode']) {
    assert.equal(custom.getSupport(name), 'supported', name);
  }
  const fixed = new GetCapabilitiesResponse(page([[0x0210, [3]]]));
  assert.equal(fixed.getSupport('fanLow'), 'supported');
  assert.equal(fixed.getSupport('fanMedium'), 'unsupported');
  assert.equal(fixed.getSupport('fanCustom'), 'unsupported');
});

test('extended support survives serialization and summary includes unknowns', () => {
  const c = new GetCapabilitiesResponse(page([[0x00e3, [0, 8]], [0x021e, [0]]]));
  const restored = DeviceCapabilities.fromSnapshot(JSON.parse(JSON.stringify(c.toSnapshot())));
  assert.equal(restored.getSupport('iEcoHeat'), 'supported');
  assert.equal(restored.getSupport('anionMode'), 'unsupported');
  const summary = restored.getSupportSummary();
  assert.equal(summary.followMe, 'unknown');
  assert.equal(summary.iEcoMode, 'supported');
  assert.equal(summary.anionMode, 'unsupported');
});
