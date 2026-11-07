import {checkMesh} from '../src/print-check.js';
import {identity} from '../src/math.js';
import {writeFile} from 'node:fs/promises';
const torus=(major,minor)=>{
 const p=new Float32Array(major*minor*18);let i=0;
 const point=(u,v)=>{const a=(u%major)/major*Math.PI*2,b=(v%minor)/minor*Math.PI*2,r=23+8*Math.cos(b);return [r*Math.cos(a),r*Math.sin(a),8*Math.sin(b)];};
 for(let u=0;u<major;u++)for(let v=0;v<minor;v++)for(const [a,b] of [[u,v],[u+1,v],[u+1,v+1],[u,v],[u+1,v+1],[u,v+1]]){p.set(point(a,b),i);i+=3;}return p;
};
const measurements=[];
for(const [major,minor] of [[80,64],[250,200]]) {
 const positions=torus(major,minor),baseline=process.memoryUsage().heapUsed;let sampledPeak=baseline;
 const report=checkMesh({id:0,name:'closed torus',positions,matrix:identity(),source_units:'mm'},{level:'detailed',max_time_ms:30000},{max_memory_bytes:1024**3},()=>{sampledPeak=Math.max(sampledPeak,process.memoryUsage().heapUsed);});
 measurements.push({triangles:positions.length/9,elapsed_ms:report.elapsed_ms,summary:report.summary,volume_valid:report.volume_valid,heapBaseline:baseline,sampledHeapPeak:sampledPeak,issues:report.checks.filter(c=>c.status!=='pass'&&c.status!=='not_run').map(c=>[c.code,c.status,c.count,c.triangle_ids]),limit_reason:report.limit_reason});
}
await writeFile('test-results/print-performance.json',JSON.stringify({runtime:process.version,note:'Node desktop synthetic closed tori. Sampled JS heap is not total or peak browser/GPU memory; no physical mobile measurement.',measurements},null,2));
console.log(JSON.stringify(measurements,null,2));
