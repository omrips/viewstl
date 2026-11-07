import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionFrame} from '../../src/selection-frame.js';
test('Selection frame has 12 unique axis edges enclosing even flat model bounds',()=>{
 for(const bounds of [{min:[-2,-3,-4],max:[4,5,6]},{min:[1,1,0],max:[1,1,0]}]){
  const frame=selectionFrame(bounds),edges=new Set();assert.equal(frame.byteLength,288);
  for(let n=0;n<frame.length;n+=6){
   const a=[...frame.slice(n,n+3)],b=[...frame.slice(n+3,n+6)];
   assert.equal(a.filter((v,i)=>v!==b[i]).length,1);
   edges.add([a.join(','),b.join(',')].sort().join('|'));
  }
  assert.equal(edges.size,12);
  for(let i=0;i<3;i++){
   const coords=[...frame].filter((_,n)=>n%3===i);
   assert.ok(Math.min(...coords)<=bounds.min[i]);assert.ok(Math.max(...coords)>=bounds.max[i]);
  }
 }
});
