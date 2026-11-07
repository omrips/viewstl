import StlViewer from '../../build/viewstl.js';
import {cubePositions} from './fixtures.js';
const out=document.getElementById('results'),container=document.getElementById('test-viewer');
const assert=(v,m)=>{if(!v)throw Error(m);};
let viewer;
async function pixels(){const bitmap=await createImageBitmap(await viewer.get_image_blob()),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();assert(viewer.renderer.gl.getError()===0,'WebGL error');return ctx.getImageData(0,0,canvas.width,canvas.height).data;}
const count=p=>p.reduce((n,v,i)=>n+(i%4===3&&v>0?1:0),0),diff=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
function screen(){const r=viewer.renderer,gl=r.gl;r.draw(viewer.models.filter(Boolean),viewer.camera,viewer.bg_color);const p=new Uint8Array(viewer.canvas.width*viewer.canvas.height*4);gl.readPixels(0,0,viewer.canvas.width,viewer.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);assert(gl.getError()===0,'WebGL frame error');return p;}
const camera=(x=0,y=-6,z=5)=>viewer.set_camera_state({position:{x,y,z},target:{x,y:y+6,z:0},up:{x:0,y:0,z:1}});
document.getElementById('run').onclick=async()=>{
 document.getElementById('run').disabled=true;out.textContent='';let passed=0,failed=0;const errors=[];
 const test=async(name,fn)=>{try{await fn();out.textContent+='PASS '+name+'\n';passed++;}catch(e){out.textContent+='FAIL '+name+': '+e.message+'\n';failed++;}};
 viewer?.dispose();viewer=new StlViewer(container,{center_models:false,bg_color:'transparent',max_memory_bytes:128*1024**2,load_error_callback:e=>errors.push(e)});await viewer.when_ready;
 await test('Models retain source positions and share a single scene',async()=>{
  const a=cubePositions(),b=a.map((v,i)=>v+(i%3===0?6:0));viewer.add_models([{id:0,data:{positions:a,colors:Array(a.length).fill(0).map((_,i)=>i%3===0?1:0)}},{id:1,data:{positions:b},color:'#64a5b2'}]);await viewer.when_idle();
  assert(viewer.models_count===2,'count');assert(viewer.models[0].x===0&&viewer.models[1].x===0&&viewer.models[1].geometry.bounds.min[0]===5,'source origin shifted');
 });
 await test('Tint changes and restores embedded colors without new GPU buffers',async()=>{
  camera();const before=await pixels(),buffer=viewer.renderer.resource(viewer.models[0],'flat');
  viewer.set_color(0,'#00ff00');const tinted=await pixels();assert(diff(before,tinted)>1000,'tint missing');
  assert(viewer.renderer.resource(viewer.models[0],'flat')===buffer,'reuploaded geometry');
  viewer.set_color(0,null);assert(diff(before,await pixels())===0,'file color restore');
 });
 await test('Infinite grid extends past model bounds and stays behind opaque surfaces',async()=>{
  viewer.remove_model(1);camera();const noGrid=await pixels(),buffers=viewer.renderer.liveBuffers;viewer.set_infinite_grid(true,1,-1);const grid=await pixels();
  assert(count(grid)>count(noGrid)+5000,'grid coverage');
  for(let i=0;i<noGrid.length;i+=4)if(noGrid[i+3]===255)assert(grid[i]===noGrid[i]&&grid[i+1]===noGrid[i+1]&&grid[i+2]===noGrid[i+2],'grid over opaque model');
  assert(viewer.renderer.liveBuffers===buffers,'grid geometry allocated');
  camera(1000,-6,5);assert(count(await pixels())>5000,'grid stopped on pan');
  camera(1000,-600,500);assert(count(await pixels())>5000,'grid stopped on zoom');
  camera(0,-6,.02);await pixels();assert(viewer.renderer.liveBuffers===buffers,'grid grew with pan or zoom');
 });
 await test('Background colors change rendered PNG pixels',async()=>{
  viewer.set_infinite_grid(false);viewer.set_bg_color('#202d35');const p=await pixels();assert(p[0]===32&&p[1]===45&&p[2]===53&&p[3]===255,'PNG background');viewer.set_bg_color('transparent');
 });
 await test('Legacy finite grid still works; infinite settings survive VSB round trip',async()=>{
  camera();viewer.set_grid(true,10,10);await pixels();assert(!viewer.renderer.grid.infinite,'legacy grid changed');
  viewer.set_infinite_grid(true,2,-1);const scene=viewer.get_vsj(true);assert(scene.infinite_grid.spacing===2&&scene.infinite_grid.height===-1,'VSJ settings');
  const blob=await viewer.get_vsb_blob();viewer.clean();viewer.load_vsb(new File([blob],'scene.vsb'));await viewer.when_idle();assert(viewer.renderer.grid.infinite&&viewer.renderer.grid.height===-1,'VSB grid restore');await pixels();
 });
 await test('Editing frame adds pixels without changing PNG exports or model buffers',async()=>{
  const clean=await pixels(),before=screen(),buffers=viewer.renderer.liveBuffers,resource=viewer.renderer.resource(viewer.models[0],'flat');
  viewer.set_selection(0);assert(diff(before,screen())>100,'no frame pixels');assert(viewer.renderer.liveBuffers===buffers+1,'frame should use one buffer');
  assert(diff(clean,await pixels())===0,'editing frame leaked into PNG');assert(viewer.renderer.resource(viewer.models[0],'flat')===resource,'model geometry reuploaded');
  const frame=viewer.renderer.selectionResource;viewer.set_rotation(0,.3,.2,.1);viewer.set_position(0,1,1,1);const moved=screen();
  assert(viewer.renderer.selectionResource===frame,'frame rebuilt on transform');viewer.set_selection(null);assert(diff(moved,screen())>100,'frame did not follow transform');
  assert(viewer.renderer.liveBuffers===buffers,'frame buffer leak');viewer.set_rotation(0,0,0,0);viewer.set_position(0,0,0,0);
 });
 await test('Picking selects the front visible model without changing the camera',async()=>{
  viewer.add_model({id:9,data:{positions:cubePositions()},x:0,y:-3,z:2.5});await viewer.when_idle();camera();
  const rect=viewer.canvas.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2,before=JSON.stringify(viewer.get_camera_state());
  assert(viewer.pick_model(x,y)?.id===9,'front model missed');viewer.set_rotation(9,.2,.3,.4);assert(viewer.pick_model(x,y)?.id===9,'transformed model missed');
  viewer.set_opacity(9,0);assert(viewer.pick_model(x,y)?.id===0,'hidden model picked');assert(viewer.pick_model(rect.left-5,y)===null,'outside canvas picked');
  assert(JSON.stringify(viewer.get_camera_state())===before,'picking moved camera');viewer.remove_model(9);
 });
 await test('Selection switches between models and clears when the selected model is removed',async()=>{
  viewer.add_model({id:8,data:{positions:cubePositions()},x:3});await viewer.when_idle();viewer.set_selection(0);screen();const old=viewer.renderer.selectionResource;
  viewer.set_selection(8);screen();assert(viewer.renderer.selection.id===8&&viewer.renderer.selectionResource!==old,'selection did not switch');assert(!viewer.renderer.gl.isBuffer(old.buffers[0]),'previous frame buffer retained');
  viewer.remove_model(8);assert(!viewer.renderer.selection&&!viewer.renderer.selectionResource,'removed model kept frame');viewer.set_selection(0);screen();
 });
 await test('Grid and selection rebuild after context restoration and dispose cleanly',async()=>{
  const ext=viewer.renderer.gl.getExtension('WEBGL_lose_context'),event=name=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('context timeout')),4000);viewer.canvas.addEventListener(name,()=>{clearTimeout(t);resolve();},{once:true});});
  let ready=event('webglcontextlost');ext.loseContext();await ready;await new Promise(r=>setTimeout(r,100));ready=event('webglcontextrestored');ext.restoreContext();await ready;
  assert(count(await pixels())>1000,'grid restore pixels');screen();assert(viewer.renderer.selection?.id===0&&viewer.renderer.selectionResource,'selection lost after restore');viewer.clean();assert(!viewer.renderer.selection&&!viewer.renderer.infiniteGrid&&viewer.renderer.liveBuffers===0,'grid/frame leak');assert(!errors.length,errors.join(';'));
 });
 await test('Combined scene budget rejects an additional model and recovers after removal',async()=>{
  viewer.dispose();errors.length=0;viewer=new StlViewer(container,{center_models:false,max_memory_bytes:64*1024**2+12*224+100,load_error_callback:e=>errors.push(e)});await viewer.when_ready;
  viewer.add_models([{id:0,data:{positions:cubePositions()}},{id:1,data:{positions:cubePositions()}}]);await viewer.when_idle();
  assert(viewer.models_count===1&&viewer.models[0]?.geometry,'existing model lost');assert(errors.some(e=>/safety budget/.test(e)),'aggregate budget bypassed');assert(viewer._memoryReservations.size===0,'parse reservation leaked');
  viewer.remove_model(0);viewer.add_model({id:2,data:{positions:cubePositions()}});await viewer.when_idle();assert(viewer.models_count===1&&viewer.models.find(m=>m?.id===2)?.geometry,'cannot recover after removal');
 });
 await test('Removing a model cancels pending derived work and clears reservations',async()=>{
  viewer.dispose();viewer=new StlViewer(container,{max_memory_bytes:128*1024**2});await viewer.when_ready;viewer.add_model({id:0,data:{positions:cubePositions()}});await viewer.when_idle();
  viewer.set_smooth(0,true);viewer.remove_model(0);await viewer.when_idle();assert(viewer.models_count===0&&viewer._memoryReservations.size===0,'derived work survived removal');viewer.dispose();
 });
 out.textContent+=`RESULT: ${passed} passed, ${failed} failed.`;document.getElementById('run').disabled=false;
};
