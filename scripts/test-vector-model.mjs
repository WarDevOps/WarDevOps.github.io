import assert from 'node:assert/strict';
import test from 'node:test';
import {around,point,multiply,IDENTITY,ref,snapshot,restore,transform,makeGroup,expandSelection,validateVectorGroups,appendLayout,fitsTransform} from '../assets/js/vector-model.js';
import {mergeMapLayouts,markLayoutAsLocalEdits,sourceRevision} from '../assets/js/marker-merge.js';
const key='Alpha::domination-1|Red',keys=new Set([key]);
function fixture(){return {version:2,markers:{[key]:[{id:'start',type:'mainBattleTank',x:20,y:30,label:'1 시작'},{id:'end',type:'mainBattleTank',x:40,y:50}]},annotations:{[key]:[{id:'route',type:'route',points:[{x:20,y:30},{x:25,y:48},{x:40,y:50}]}]},vectorGroups:{}};}
const select=new Set(['m:start','m:end','a:route']);
test('uniform transform keeps endpoint markers attached and preserves original sources',()=>{
  const l=fixture(),g=makeGroup(l,key,select,'g'),original=structuredClone(g.members),base=snapshot(l,key);
  transform(l,key,select,around(30,40,.7,.4),base);
  assert.deepEqual(l.markers[key][0].x,l.annotations[key][0].points[0].x);
  assert.deepEqual(l.vectorGroups[key][0].members,original);
  assert.deepEqual(validateVectorGroups(l.vectorGroups,l,keys),l.vectorGroups);
  restore(l,key,base);assert.deepEqual(l.markers[key][0].x,20);
});
test('repeated previews always derive from gesture start, not accumulated coordinates',()=>{
  const l=fixture();makeGroup(l,key,select,'g');const base=snapshot(l,key);
  for(let i=0;i<100;i++)transform(l,key,select,[1,0,0,1,3,4],base);
  assert.equal(l.markers[key][0].x,23);assert.equal(l.markers[key][0].y,34);
});
test('groups and role/aim attachments expand atomically',()=>{
  const l=fixture();makeGroup(l,key,select,'g');
  assert.deepEqual(expandSelection(l,key,new Set(['m:start'])),select);
  l.markers[key].push({id:'role',parentTankId:'start',x:20,y:30});
  l.annotations[key].push({id:'aim',parentTankId:'start',startX:20,startY:30,endX:24,endY:35});
  assert.equal(expandSelection(l,key,new Set(['a:aim'])).size,5);
});
test('boundary validation rejects whole transformation instead of clipping points',()=>{
  const l=fixture();assert.equal(fitsTransform(l,key,select,[1,0,0,1,61,0]),false);
  assert.equal(fitsTransform(l,key,select,[1,0,0,1,60,0]),true);
  assert.equal(fitsTransform(l,key,select,[NaN,0,0,1,0,0]),false);
  assert.deepEqual(l,fixture());
});
test('rotation and reflection keep distances and work around chosen pivot',()=>{
  const m=around(20,30,1,Math.PI/2),p=point(m,{x:30,y:30});
  assert.ok(Math.abs(p.x-20)<1e-10&&Math.abs(p.y-40)<1e-10);
  const flipped=around(30,40,1,0,-1,1);assert.deepEqual(point(flipped,{x:20,y:30}),{x:40,y:30});
  assert.deepEqual(multiply(IDENTITY,flipped),flipped);
});
test('reject transforms too small to preserve an invertible export matrix',()=>{
  const l=fixture();makeGroup(l,key,select,'g');
  assert.equal(fitsTransform(l,key,select,around(30,40,1e-8)),false);
});
test('append keeps existing objects and remaps group/member/parent identifiers',()=>{
  const l=fixture(),source=fixture();makeGroup(source,key,select,'g');let seq=0;
  const added=appendLayout(l,key,source,key,()=>`new-${++seq}`);
  assert.equal(l.markers[key].length,4);assert.equal(l.annotations[key].length,2);
  assert.equal(l.markers[key][0].id,'start');assert.equal(added.size,3);
  assert.doesNotThrow(()=>validateVectorGroups(l.vectorGroups,l,keys));
});
test('reject malformed or forged transform sources and duplicate membership',()=>{
  const l=fixture();makeGroup(l,key,select,'g');
  const mismatch=structuredClone(l.vectorGroups);mismatch[key][0].matrix[4]=1;
  assert.throws(()=>validateVectorGroups(mismatch,l,keys));
  const duplicate=structuredClone(l.vectorGroups);duplicate[key].push({...duplicate[key][0],id:'duplicate'});
  assert.throws(()=>validateVectorGroups(duplicate,l,keys));
  const singular=structuredClone(l.vectorGroups);singular[key][0].matrix=[0,0,0,0,0,0];
  assert.throws(()=>validateVectorGroups(singular,l,keys));
});
test('map source synchronization retains locally edited vector groups on reload',()=>{
  const upstream=fixture(),local=fixture();makeGroup(local,key,select,'g');
  markLayoutAsLocalEdits(local,upstream,['Alpha']);
  const result=mergeMapLayouts(local,upstream,['Alpha'],{sourceRevision:sourceRevision(upstream)});
  assert.equal(result.layout.vectorGroups[key][0].id,'g');
});
