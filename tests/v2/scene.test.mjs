import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StlViewer} from '../../src/viewer.js';
import {geometryMemory,MEMORY_OVERHEAD,TRIANGLE_MEMORY} from '../../src/memory.js';
function fake(){const v=Object.create(StlViewer.prototype);Object.assign(v,{_models:new Map(),_memoryReservations:new Map(),_derived:new Set(),_generation:0,limits:{max_memory_bytes:100*1024**2},options:{max_memory_bytes:100*1024**2},_loadTail:Promise.resolve(),_invalidate(){},_error(){},renderer:{remove(){}}});return v;}
test('scene accounting includes every resident model and cached view geometry',()=>{
  const v=fake(),a={geometry:{triangles:10,smoothNormals:new Float32Array(90)}},b={geometry:{triangles:20,edges:new Float32Array(24)}};
  v._models.set(0,a);v._models.set(1,b);
  assert.equal(v._occupiedMemory(),30*TRIANGLE_MEMORY+90*4*4+24*4*2);
  assert.equal(v._occupiedMemory(a),geometryMemory(b.geometry));
  const release=v._reserveMemory(b,50000);assert.equal(v._occupiedMemory(a),50000);release();assert.equal(v._memoryReservations.size,0);
});
test('finite budget parsing serializes workers and recovers from a failed load',async()=>{
  const v=fake();let finish;const first=new Promise(r=>finish=r),started=[];
  v._readModel=async m=>{started.push(m);if(m===1)await first;if(m===2)throw Error('bad file');};
  const a=v._loadModel(1,{},0),b=v._loadModel(2,{},0),c=v._loadModel(3,{},0);
  const failed=assert.rejects(b,/bad file/);await Promise.resolve();assert.deepEqual(started,[1]);finish();await Promise.all([a,failed,c]);assert.deepEqual(started,[1,2,3]);
});
test('failed allocation or worker dispatch releases its scene memory reservation',()=>{
  const v=fake(),m={geometry:{triangles:1,positions:{slice(){throw Error('allocation');}}}};v._models.set(0,m);
  assert.throws(()=>v._derive(m,{}),/allocation/);assert.equal(v._memoryReservations.size,0);
  m.geometry.positions=new Float32Array(9);v._pool={run(){throw Error('dispatch');}};
  assert.throws(()=>v._derive(m,{}),/dispatch/);assert.equal(v._memoryReservations.size,0);
});
test('view preparation accounts for another model before starting its worker',()=>{
  const v=fake(),m={geometry:{triangles:12,positions:new Float32Array(108)}};
  v._models.set(0,m);v._models.set(1,{geometry:{triangles:100000}});v.limits.max_memory_bytes=MEMORY_OVERHEAD+10000;
  assert.throws(()=>v._derive(m,{smooth:true}),/safety budget/);assert.equal(v._memoryReservations.size,0);
});
