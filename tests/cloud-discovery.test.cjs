const {test}=require('node:test');const assert=require('node:assert/strict');
let reply;
// Stub both HTTP implementations before loading library; no network requests are sent.
const cross=require.resolve('cross-fetch');require(cross);const originalCross=require.cache[cross].exports;
require.cache[cross].exports=async()=>reply;
const lib=require('../dist');lib._LOGGER.silent=true;
function device(){const c=new lib.DeviceContext();c.id=123;return new lib.Device(c);}
const {MSmartHomeCloudConnection}=require('../dist/MSmartHomeCloudConnection');
const {NetHomePlusCloudConnection}=require('../dist/NetHomePlusCloudConnection');
test('cloud providers report code/msg consistently including string error codes',async()=>{
 const original=global.fetch;global.fetch=async()=>reply;
 try{
  for(const Cloud of [MSmartHomeCloudConnection,NetHomePlusCloudConnection]){
   const c=new Cloud(device());reply={ok:true,json:async()=>({errorCode:'3004',msg:'value is illegal.'})};
   await assert.rejects(c._executeRequest('/test','',{}),/3004: value is illegal/);
   reply={ok:false,status:503};await assert.rejects(c._executeRequest('/test','',{}),/HTTP error: 503/);
  }
 }finally{global.fetch=original;}
});
test('cloud empty sessions, missing metadata and missing token pairs are explicit errors',async()=>{
 assert.equal(new NetHomePlusCloudConnection(device()).isAuthenticated(new lib.CloudSecurityContext('a','b')),false);
 for(const Cloud of [MSmartHomeCloudConnection,NetHomePlusCloudConnection]){
  const c=new Cloud(device());c._executeRequest=async()=>({code:0,data:{},result:{}});
  await assert.rejects(c._getLoginId('test'),/no loginId/);
  await assert.rejects(c._getTokenAndKey('token','id'),/not found/);
 }
});
function discovery(v3){
 const p=Buffer.alloc(100);p.writeUInt32LE(6444,4);p[40]=3;p.set(Buffer.from('net'),41);p[58]=0xAC;
 p.set([0,1,2,3,4,5],66);p.set([9,33,34],75);
 const h=Buffer.alloc(40);h[0]=h[1]=0x5A;h.writeUIntLE(123456789,20,6);
 const encrypted=lib.Security.aesEncrypt(p);h.writeUInt16LE(56+encrypted.length,4);
 const raw=Buffer.concat([h,encrypted,Buffer.alloc(16)]);
 return v3?Buffer.concat([Buffer.from([0x83,0x70,0,0,0,0,0,0]),raw,Buffer.alloc(16)]):raw;
}
test('discovery accepts v2/v3, pads MAC octets and rejects false header matches/truncation',()=>{
 for(const v3 of [false,true]){
  const c=lib.Driver.parseDiscoveryResponse(discovery(v3),'192.0.2.1');
  assert.equal(c.version,v3?3:2);assert.equal(c.id,123456789);assert.equal(c.macAddress,'00:01:02:03:04:05');assert.equal(c.firmware,'9.33.34');assert.equal(c.port,6444);
 }
 const p=discovery(false);p[1]=0;assert.throws(()=>lib.Driver.parseDiscoveryResponse(p,'host'),/header/);
 assert.throws(()=>lib.Driver.parseDiscoveryResponse(Buffer.from([0x83,0x70]),'host'),/Truncated/);
});
test('public enums exist for JavaScript callers',()=>{
 assert.equal(lib.CONNECTION_TYPE.MSMARTHOME,0);assert.equal(lib.OPERATIONAL_MODE.COOL,2);assert.equal(lib.FRAME_TYPE.REQUEST,3);
});
