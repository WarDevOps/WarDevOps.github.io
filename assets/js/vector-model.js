// Geometry stays in image percentages. Groups retain immutable source geometry
// and an affine matrix so repeated edits never round or clip the original path.
export const IDENTITY = [1, 0, 0, 1, 0, 0];
export const point = (m, p) => ({ x: m[0]*p.x+m[2]*p.y+m[4], y: m[1]*p.x+m[3]*p.y+m[5] });
export const multiply = (a,b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
export const around = (cx,cy,scale=1,angle=0,flipX=1,flipY=1) => {
  const c=Math.cos(angle)*scale, s=Math.sin(angle)*scale;
  return multiply([1,0,0,1,cx,cy],multiply([c*flipX,s*flipX,-s*flipY,c*flipY,0,0],[1,0,0,1,-cx,-cy]));
};
export const ref = (kind,id) => `${kind}:${id}`;
export function entries(layout,key) {
  return [...(layout.markers?.[key]||[]).map(value=>({kind:'m',value})),...(layout.annotations?.[key]||[]).map(value=>({kind:'a',value}))];
}
export function geometry(v) {
  if (Array.isArray(v.points)) return {points:v.points.map(p=>({x:p.x,y:p.y}))};
  if (Number.isFinite(v.startX)) return {startX:v.startX,startY:v.startY,endX:v.endX,endY:v.endY};
  return {x:v.x,y:v.y};
}
export function vertices(v) {
  if (v.points) return v.points;
  if (Number.isFinite(v.startX)) return [{x:v.startX,y:v.startY},{x:v.endX,y:v.endY}];
  return [{x:v.x,y:v.y}];
}
export function mapped(g,m) {
  if (g.points) return {points:g.points.map(p=>point(m,p))};
  if (Number.isFinite(g.startX)) { const a=point(m,{x:g.startX,y:g.startY}),b=point(m,{x:g.endX,y:g.endY}); return {startX:a.x,startY:a.y,endX:b.x,endY:b.y}; }
  return point(m,g);
}
export function bounds(layout,key,selection) {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const {kind,value} of entries(layout,key)) if (!selection||selection.has(ref(kind,value.id))) {
    for (const p of vertices(value)) { minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y); }
  }
  return Number.isFinite(minX)?{minX,minY,maxX,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2}:null;
}
export function expandSelection(layout,key,selection) {
  const result=new Set(selection), all=entries(layout,key);
  let changed=true;
  while(changed) {
    const size=result.size;
    for(const {kind,value} of all) if(value.parentTankId && (result.has(ref(kind,value.id))||result.has(ref('m',value.parentTankId)))) {
      result.add(ref(kind,value.id)); result.add(ref('m',value.parentTankId));
    }
    changed=size!==result.size;
  }
  const existing=new Set(all.map(({kind,value})=>ref(kind,value.id)));
  return new Set([...result].filter(r=>existing.has(r)));
}
export function snapshot(layout,key) {
  return structuredClone({markers:layout.markers?.[key]||[],annotations:layout.annotations?.[key]||[],groups:layout.vectorGroups?.[key]||[]});
}
export function copySelection(layout,key,selection) {
  const selected=expandSelection(layout,key,selection);
  return structuredClone({version:2,
    markers:{[key]:(layout.markers[key]||[]).filter(v=>selected.has(ref('m',v.id)))},
    annotations:{[key]:(layout.annotations[key]||[]).filter(v=>selected.has(ref('a',v.id)))},
    vectorGroups:{[key]:(layout.vectorGroups?.[key]||[]).map(g=>({...g,members:g.members.filter(m=>selected.has(ref(m.kind,m.id)))})).filter(g=>g.members.length)}
  });
}
export function deleteSelection(layout,key,selection) {
  const removed=expandSelection(layout,key,selection);
  layout.markers[key]=(layout.markers[key]||[]).filter(v=>!removed.has(ref('m',v.id)));
  layout.annotations[key]=(layout.annotations[key]||[]).filter(v=>!removed.has(ref('a',v.id)));
  pruneGroups(layout,key);
}
export function restore(layout,key,s) {
  layout.markers[key]=structuredClone(s.markers);layout.annotations[key]=structuredClone(s.annotations);
  (layout.vectorGroups??={})[key]=structuredClone(s.groups);
}
export function transform(layout,key,selection,matrix,base) {
  const work={markers:{[key]:base.markers},annotations:{[key]:base.annotations},vectorGroups:{[key]:base.groups}};
  const selected=expandSelection(work,key,selection), grouped=new Set();
  const current=new Map(entries(layout,key).map(({kind,value})=>[ref(kind,value.id),value]));
  const groups=structuredClone(base.groups);
  for(const g of groups) if(g.members.every(p=>selected.has(ref(p.kind,p.id)))) {
    g.matrix=multiply(matrix,g.matrix);
    for(const member of g.members) {
      const r=ref(member.kind,member.id),v=current.get(r);
      if(v) Object.assign(v,mapped(member.original,g.matrix));
      grouped.add(r);
    }
  }
  for(const {kind,value} of entries(work,key)) {
    const r=ref(kind,value.id);
    if(selected.has(r)&&!grouped.has(r)&&current.has(r)) Object.assign(current.get(r),mapped(geometry(value),matrix));
  }
  (layout.vectorGroups??={})[key]=groups;
  pruneGroups(layout,key);
}
export function fitsTransform(layout,key,selection,matrix) {
  for(const g of layout.vectorGroups?.[key]||[]) if(g.members.some(m=>selection.has(ref(m.kind,m.id)))) {
    const next=multiply(matrix,g.matrix);
    if(!next.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e7)||Math.abs(next[0]*next[3]-next[1]*next[2])<1e-12)return false;
  }
  return entries(layout,key).filter(({kind,value})=>selection.has(ref(kind,value.id))).every(({value})=>vertices(value).every(p=>{
    const q=point(matrix,p);return Number.isFinite(q.x)&&Number.isFinite(q.y)&&q.x>=0&&q.x<=100&&q.y>=0&&q.y<=100;
  }));
}
export function makeGroup(layout,key,selection,id,name='Group') {
  const selected=expandSelection(layout,key,selection), prior=layout.vectorGroups?.[key]||[];
  const basis=prior.find(g=>g.members.some(m=>selected.has(ref(m.kind,m.id))));
  if(basis&&basis.members.length===selected.size&&basis.members.every(m=>selected.has(ref(m.kind,m.id))))return basis;
  const matrix=basis?[...basis.matrix]:[...IDENTITY];
  const [a,b,c,d,e,f]=matrix,det=a*d-b*c;
  const inverse=[d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det];
  const group={id,name,matrix,members:entries(layout,key).filter(({kind,value})=>selected.has(ref(kind,value.id))).map(({kind,value})=>{
    const existing=basis?.members.find(m=>m.kind===kind&&m.id===value.id);
    return {kind,id:value.id,original:existing?structuredClone(existing.original):mapped(geometry(value),inverse)};
  })};
  if(basis?.source)group.source=structuredClone(basis.source);
  if(!group.members.length) throw new Error('Empty group');
  (layout.vectorGroups??={})[key]=[...prior.filter(g=>!g.members.some(m=>selected.has(ref(m.kind,m.id)))),group];
  return group;
}
export function pruneGroups(layout,key) {
  const objects=new Map(entries(layout,key).map(({kind,value})=>[ref(kind,value.id),value]));
  if(!layout.vectorGroups?.[key]) return;
  layout.vectorGroups[key]=layout.vectorGroups[key].map(g=>({...g,members:g.members.filter(m=>objects.has(ref(m.kind,m.id)))})).filter(g=>g.members.length);
  // Legacy single-object edits rebase only changed members, preserving other sources.
  for(const g of layout.vectorGroups[key]) for(const member of g.members) {
    const v=objects.get(ref(member.kind,member.id));
    const projected=vertices(mapped(member.original,g.matrix)), actual=vertices(v);
    if(projected.length!==actual.length || actual.some((p,i)=>Math.abs(p.x-projected[i].x)>1e-7||Math.abs(p.y-projected[i].y)>1e-7)) {
      const [a,b,c,d,e,f]=g.matrix,det=a*d-b*c;
      member.original=mapped(geometry(v),[d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det]);
    }
  }
}
const finite = v => Number.isFinite(v)&&Math.abs(v)<=1e7;
export function validateVectorGroups(data,layout,validKeys) {
  if(data===undefined) return {};
  if(!data||typeof data!=='object'||Array.isArray(data)) throw new Error('Invalid vector groups');
  const output={};let count=0,points=0;
  for(const [key,groups] of Object.entries(data)) {
    if(!validKeys.has(key)||!Array.isArray(groups)) throw new Error('Invalid vector map');
    const ids=new Set(),members=new Set(),objects=new Map(entries(layout,key).map(({kind,value})=>[ref(kind,value.id),value]));
    output[key]=groups.map(g=>{
      if(++count>5000||!g||typeof g.id!=='string'||!g.id||ids.has(g.id)||typeof g.name!=='string'||g.name.length>160||!Array.isArray(g.matrix)||g.matrix.length!==6||!g.matrix.every(finite)||Math.abs(g.matrix[0]*g.matrix[3]-g.matrix[1]*g.matrix[2])<1e-12||!Array.isArray(g.members)||!g.members.length) throw new Error('Invalid vector group');
      ids.add(g.id);
      const clean={id:g.id,name:g.name,matrix:[...g.matrix],members:g.members.map(m=>{
        if(!m||!['m','a'].includes(m.kind)||typeof m.id!=='string'||!m.original) throw new Error('Invalid group member');
        const r=ref(m.kind,m.id),v=objects.get(r);
        if(!v||members.has(r)) throw new Error('Duplicate or missing group member');
        members.add(r);
        const source=m.original, expected=geometry(v);
        if((!!source.points)!=(!!expected.points)||Number.isFinite(source.startX)!==Number.isFinite(expected.startX)) throw new Error('Geometry mismatch');
        if(source.points&&!Array.isArray(source.points)) throw new Error('Invalid source path');
        const ps=vertices(source);points+=ps.length;
        if(points>50000||!ps.length||!ps.every(p=>p&&finite(p.x)&&finite(p.y))) throw new Error('Invalid source coordinates');
        const original=geometry(source),projected=vertices(mapped(original,g.matrix)),target=vertices(v);
        if(projected.length!==target.length||projected.some((p,i)=>!finite(p.x)||!finite(p.y)||Math.abs(p.x-target[i].x)>1e-6||Math.abs(p.y-target[i].y)>1e-6)) throw new Error('Source/transform mismatch');
        return {kind:m.kind,id:m.id,original};
      })};
      if(g.source) {
        if(typeof g.source!=='object'||Array.isArray(g.source)||JSON.stringify(g.source).length>12000) throw new Error('Invalid source metadata');
        clean.source=structuredClone(g.source);
      }
      return clean;
    });
  }
  return output;
}
export function appendLayout(target,key,source,sourceKey,idFactory) {
  const incoming=structuredClone({markers:source.markers[sourceKey]||[],annotations:source.annotations[sourceKey]||[],groups:source.vectorGroups?.[sourceKey]||[]});
  if(!incoming.markers.length&&!incoming.annotations.length) throw new Error('No objects for this map');
  const ids=new Map();
  for(const [kind,items] of [['m',incoming.markers],['a',incoming.annotations]]) for(const v of items) { const old=v.id;v.id=idFactory();ids.set(ref(kind,old),v.id); }
  for(const v of [...incoming.markers,...incoming.annotations]) if(v.parentTankId) v.parentTankId=ids.get(ref('m',v.parentTankId));
  for(const g of incoming.groups) {g.id=idFactory();for(const m of g.members)m.id=ids.get(ref(m.kind,m.id));}
  (target.markers[key]??=[]).push(...incoming.markers);(target.annotations[key]??=[]).push(...incoming.annotations);
  (target.vectorGroups??={})[key]=[...(target.vectorGroups[key]||[]),...incoming.groups];
  const selected=new Set([...incoming.markers.map(v=>ref('m',v.id)),...incoming.annotations.map(v=>ref('a',v.id))]);
  return selected;
}
