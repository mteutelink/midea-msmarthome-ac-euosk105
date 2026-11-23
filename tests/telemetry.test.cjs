const {test}=require('node:test');const assert=require('node:assert/strict');const lib=require('../dist');
function frame(group,n){const p=Buffer.alloc(n);p[0]=0xC1;p[3]=0x40|group;return Buffer.concat([Buffer.alloc(10),p,Buffer.alloc(2)]);}
test('diagnostic groups decode distinct fields and validate response identity/length',()=>{
 let f=frame(1,15);f[14]=60;f[20]=80;f[22]=90;f[24]=100;
 let v=new lib.GetTelemetryResponse(f,1).values;assert.equal(v.compressorFrequency,60);assert.equal(v.indoorTemperature,25);assert.equal(v.outdoorCoilTemperature,20);assert.equal(v.dischargePipeTemperature,100);
 f=frame(2,9);f[14]=10;f[15]=9;f[18]=0x10;v=new lib.GetTelemetryResponse(f,2).values;assert.equal(v.indoorFanSpeed,72);assert.equal(v.waterPumpRunning,true);
 f=frame(7,12);f.writeUInt16LE(1250,20);assert.equal(new lib.GetTelemetryResponse(f,7).values.outdoorUnitPower,1250);
 f=frame(0,19);f.writeUInt16BE(2,14);f[16]=3;assert.equal(new lib.GetTelemetryResponse(f,0).values.poweredHours,51);
 f=frame(11,13);f[19]=40;f[22]=60;v=new lib.GetTelemetryResponse(f,11).values;assert.equal(v.horizontalSwingAngle,40);assert.equal(v.verticalSwingAngle,60);
 assert.throws(()=>new lib.GetTelemetryResponse(f,1),/Truncated|group/);assert.throws(()=>new lib.GetTelemetryResponse(frame(3,4),3),/Truncated/);
});
test('energy formats are explicit and do not silently infer ambiguous encodings',()=>{
 const f=frame(4,19);f.writeUInt32BE(12345,14);f.writeUIntBE(2345,26,3);
 assert.equal(new lib.GetPowerUsageResponse(f,'binary100').totalEnergy,123.45);
 assert.equal(new lib.GetPowerUsageResponse(f,'binary').totalEnergy,1234.5);
 f.set([0,1,23,45],14);assert.equal(new lib.GetPowerUsageResponse(f,'mixed').totalEnergy,123.45);
 f.set([0,1,0x23,0x45],14);assert.equal(new lib.GetPowerUsageResponse(f,'bcdEnergyBinaryPower').totalEnergy,123.45);
 assert.equal(new lib.GetPowerUsageResponse(f,'bcdEnergyBinaryPower').realTimePower,234.5);
 f[14]=100;assert.throws(()=>new lib.GetPowerUsageResponse(f,'mixed'),/mixed/);
});
