const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const crypto = require('node:crypto');
const lib = require('../dist');
lib._LOGGER.silent = true;
function context() { const c=new lib.LANSecurityContext('11'.repeat(32),'22'.repeat(32)); c.accessToken='33'.repeat(32); return c; }
function rawFrame() { const f=Buffer.alloc(20);f[0]=0xAA;f[1]=19;f[2]=0xAC;f[9]=3;f[10]=0xC0;f[19]=(-f.subarray(1,19).reduce((a,b)=>a+b,0))&255;return f; }
function packet(frame=rawFrame()) {const h=Buffer.alloc(40);h[0]=h[1]=0x5A;const c=lib.Security.aesEncrypt(frame);h.writeUInt16LE(56+c.length,4);const data=Buffer.concat([h,c]);return Buffer.concat([data,lib.Security.encode32(data)]);}
class FakeSocket extends EventEmitter {
 constructor(reply){super();this.reply=reply;this.destroyed=false;this.writes=[];}
 connect(port,host,cb){queueMicrotask(cb);return this;}
 write(data,cb){this.writes.push(data);this.reply?.(this,data);cb?.();return true;}
 destroy(){if(!this.destroyed){this.destroyed=true;this.emit('close');}return this;}
}
function connection(socket, version=2) {const c=new lib.DeviceContext();c.version=version;c.host='127.0.0.1';c.port=6444;const d=new lib.Device(c);return new lib.LANConnection(d,{socketFactory:()=>socket,requestTimeoutMs:20,connectTimeoutMs:20});}
test('all payload alignments have valid 8370 lengths and round-trip',()=>{
 for(let n=0;n<65;n++){const p=Buffer.alloc(n,0x42);const c=context();const e=lib.Security.encode8370(c,p,65535,6);assert.equal(e.count,0);assert.equal(e.data.readUInt16BE(2)+8,e.data.length);assert.deepEqual(lib.Security.decode8370(c,e.data),[p]);}
});
test('8370 streaming separates complete, partial and concatenated messages',()=>{
 const c=context(), a=lib.Security.encode8370(c,Buffer.alloc(14,7),1,3).data;
 const b=lib.Security.encode8370(c,Buffer.from('second'),2,3).data;
 const r=lib.Security.decode8370Packets(c,Buffer.concat([a,b.subarray(0,15)]));
 assert.equal(r.packets.length,1);assert.deepEqual(r.incomplete,b.subarray(0,15));
 assert.deepEqual(lib.Security.decode8370(c,Buffer.concat([a,b])),[Buffer.alloc(14,7),Buffer.from('second')]);
 const bad=Buffer.from(a);bad[bad.length-1]^=1;assert.throws(()=>lib.Security.decode8370(c,bad),/sign/);
});
test('packet stream accepts one-byte chunks and mixed v2/v3 packets',()=>{
 const a=packet(),b=lib.Security.encode8370(context(),Buffer.alloc(20),0,3).data;
 const s=new lib.PacketStream(),out=[];for(const byte of Buffer.concat([a,b])) out.push(...s.push(Buffer.from([byte])));
 assert.deepEqual(out,[a,b]);assert.equal(s.pendingBytes,0);assert.throws(()=>new lib.PacketStream().push(Buffer.from([1,2])),/header/);
});
test('handshake validates size, signature and error without mutating credentials',async()=>{
 const c=context(),old=c.accessToken;await assert.rejects(lib.Security.tcpKey(c,Buffer.from('ERROR')),/Authentication/);
 await assert.rejects(lib.Security.tcpKey(c,Buffer.alloc(63)),/length/);
 await assert.rejects(lib.Security.tcpKey(c,Buffer.alloc(64)),/Sign/);assert.equal(c.accessToken,old);
 const p=Buffer.alloc(32,0x12);const r=Buffer.concat([lib.Security.aesCbcEncrypt(p,Buffer.from(c.key,'hex')),crypto.createHash('sha256').update(p).digest()]);
 await lib.Security.tcpKey(c,r);assert.equal(c.accessToken,'30'.repeat(32));
});
test('LAN reads fragmented early responses and removes per-request listeners',async()=>{
 const p=packet();const s=new FakeSocket(s=>{s.emit('data',p.subarray(0,7));queueMicrotask(()=>s.emit('data',p.subarray(7)));});
 const c=connection(s);assert.deepEqual(await c.executeCommand(Buffer.alloc(1)),[rawFrame()]);
 assert.equal(s.listenerCount('data'),0);assert.equal(s.listenerCount('end'),0);assert.equal(s.listenerCount('error'),1);c.close();
});
test('LAN timeout and closed sockets reject, clean up and never replay writes',async()=>{
 const s=new FakeSocket(),c=connection(s);await assert.rejects(c.executeCommand(Buffer.alloc(1)),/timed out/);
 assert.equal(s.writes.length,1);assert.equal(s.listenerCount('data'),0);assert(s.destroyed);
 const s2=new FakeSocket(s=>s.emit('end'));await assert.rejects(connection(s2).executeCommand(Buffer.alloc(1)),/closed/);
});
test('LAN verifies inner signatures and appliance checksum',async()=>{
 const bad=packet();bad[bad.length-1]^=1;await assert.rejects(connection(new FakeSocket(s=>s.emit('data',bad))).executeCommand(Buffer.alloc(1)),/signature/);
 const f=rawFrame();f[12]^=1;await assert.rejects(connection(new FakeSocket(s=>s.emit('data',packet(f)))).executeCommand(Buffer.alloc(1)),/checksum/);
});
test('LAN v3 authenticates then returns its first command without recursive hanging',async()=>{
 const d=new lib.Device(new lib.DeviceContext());const ctx=context();d.lanSecurityContext=ctx;
 const s=new FakeSocket((s,data)=>{
  if((data[5]&15)===0){const plain=Buffer.alloc(32,0x12);const h=Buffer.concat([lib.Security.aesCbcEncrypt(plain,Buffer.from(ctx.key,'hex')),crypto.createHash('sha256').update(plain).digest()]);s.emit('data',lib.Security.encode8370(ctx,h,0,1).data);}
  else s.emit('data',lib.Security.encode8370(ctx,packet(),0,3).data);
 });
 const c=new lib.LANConnection(d,{socketFactory:()=>s,requestTimeoutMs:30});
 assert.deepEqual(await c.executeCommand(Buffer.alloc(1)),[rawFrame()]);assert.equal(s.writes.length,2);c.close();
});
test('direct concurrent LAN commands serialize and a failure does not poison the queue',async()=>{
 let active=0,max=0;const s=new FakeSocket(s=>{active++;max=Math.max(max,active);setImmediate(()=>{active--;s.emit('data',packet());});});const c=connection(s);
 await Promise.all([c.executeCommand(Buffer.alloc(1)),c.executeCommand(Buffer.alloc(1))]);assert.equal(max,1);c.close();
});
test('connect timeout rejects even when the socket emits no events',async()=>{
 const s=new FakeSocket();s.connect=()=>s;await assert.rejects(connection(s).executeCommand(Buffer.alloc(1)),/connect timed out/);assert(s.destroyed);
});
