import assert from 'node:assert/strict';
import {parseOBJ,parseSTL,makeExample,smooth,brushSmooth,stats,simplify,exportOBJ,exportSTL,cloneMesh,bounds} from '../mesh-core.js';
const obj=`# test\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n`;
const q=parseOBJ(obj,'quad.obj');assert.equal(q.indices.length/3,2);assert.equal(stats(q).vertices,4);
const ascii=`solid sample\nfacet normal 0 0 1\n outer loop\n vertex 0 0 0\n vertex 1 0 0\n vertex 0 1 0\n endloop\nendfacet\nendsolid sample\n`;
assert.equal(parseSTL(new TextEncoder().encode(ascii).buffer).indices.length/3,1);
const binary=await exportSTL(q).arrayBuffer(),round=parseSTL(binary,'round.stl');assert.equal(round.indices.length/3,2);assert.equal(stats(round).vertices,4);
const objOut=exportOBJ(q),objAgain=parseOBJ(await objOut.text(),'round.obj');assert.equal(objAgain.indices.length/3,2);
const model=makeExample(),before=cloneMesh(model),sm=smooth(model,{strength:.45,iterations:3});assert.equal(sm.indices.length,model.indices.length);assert.ok(sm.positions.some((v,i)=>Math.abs(v-before.positions[i])>1e-7));assert.deepEqual([...model.positions],[...before.positions]);
function roughness(m){const adj=Array.from({length:m.positions.length/3},()=>new Set());for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3);for(const [u,v] of [[a,b],[a,c],[b,a],[b,c],[c,a],[c,b]])adj[u].add(v);}let total=0;for(let i=0;i<adj.length;i++){const ns=adj[i];if(!ns.size)continue;let sum=0;for(let k=0;k<3;k++){let avg=0;for(const j of ns)avg+=m.positions[j*3+k]/ns.size;sum+=(avg-m.positions[i*3+k])**2;}total+=sum;}return Math.sqrt(total/adj.length);}
assert.ok(roughness(sm)<roughness(model),'сглаживание должно уменьшать локальную шероховатость');
const b0=bounds(model),b1=bounds(sm);for(let k=0;k<3;k++)assert.ok(Math.abs(b1.size[k]-b0.size[k])/b0.size[k]<.05,'габариты не должны заметно измениться на тестовом шаре');
const brush=brushSmooth(model,[0,1,0],{radius:.35,strength:.7});assert.ok(brush.changed>0);for(let i=0;i<model.positions.length;i+=3){const d=Math.hypot(model.positions[i],model.positions[i+1]-1,model.positions[i+2]);if(d>.35)assert.deepEqual([...brush.mesh.positions.slice(i,i+3)],[...model.positions.slice(i,i+3)]);}
const open= q, protectedOpen=smooth(open,{strength:.8,iterations:2,preserveBoundary:true});assert.deepEqual([...protectedOpen.positions],[...open.positions]);
const target=Math.floor(model.indices.length/3*.45),reduced=simplify(model,target);assert.ok(reduced.indices.length/3<model.indices.length/3);assert.ok(reduced.indices.length/3>=4);assert.ok(Math.abs(reduced.indices.length/3-target)<Math.max(20,target*.04));for(const v of reduced.positions)assert.ok(Number.isFinite(v));
let rejected=false;try{parseOBJ('v NaN 0 0\nf 1 1 1\n');}catch{rejected=true;}assert.ok(rejected);
console.log(JSON.stringify({result:'PASS',checks:['STL ASCII/Binary','OBJ polygon triangulation and export','Taubin-like smoothing reduces measured roughness','smoothing preserves test bounds and source copy','brush falloff modifies only its radius','open-boundary protection','simplification approaches target','non-finite OBJ rejection'],sourceTriangles:model.indices.length/3,smoothedRoughness:+roughness(sm).toFixed(6),originalRoughness:+roughness(model).toFixed(6),simplificationTarget:target,simplificationActual:reduced.indices.length/3},null,2));
