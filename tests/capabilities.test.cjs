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
