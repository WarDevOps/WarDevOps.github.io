import {around,ref,entries,vertices,bounds,expandSelection,snapshot,restore,transform,deleteSelection,appendLayout,fitsTransform} from './vector-model.js?v=compact-editor-20260915';

const words={
  ko:{lock:'기존 객체 잠금',undo:'되돌리기',redo:'다시 실행',delete:'선택 삭제',rotate:'선택 회전',resize:'선택 크기 조절',move:'선택 이동',invalid:'JSON을 추가할 수 없습니다. 지도와 파일 형식을 확인하세요.',added:'리플레이를 추가했습니다.'},
  en:{lock:'Lock existing objects',undo:'Undo',redo:'Redo',delete:'Delete selected',rotate:'Rotate selection',resize:'Resize selection',move:'Move selection',invalid:'Cannot add this JSON. Check the map and file format.',added:'Replay added.'}
};
export function createVectorEditor(h) {
  let active=false,lock=true,key=null,selected=new Set(),editable=new Set(),known=new Set(),gesture=null,undo=[],redo=[],internal=false;
  let frame=0,reading=false;
  const bars=[], surfaces=[];
  const msg=()=>words[h.language()==='ko'?'ko':'en'];
  const id=()=>`vector-${crypto.randomUUID()}`;
  const groups=()=>h.layout().vectorGroups?.[key]||[];
  const groupFor=r=>groups().find(g=>g.members.some(m=>ref(m.kind,m.id)===r));
  const allowed=r=>!lock||editable.has(r)||!!groupFor(r)?.source?.replayId;
  function announce(text) { bars.forEach(b=>{b.status.textContent=text;b.status.hidden=!text;}); }
  function save(before) {
    undo.push(before);if(undo.length>16)undo.shift();redo=[];
    internal=true;const persisted=h.commit();internal=false;refresh();
    if(!persisted)announce(h.language()==='ko'?'브라우저 저장에 실패했습니다. JSON으로 내보내 보관하세요.':'Browser storage failed. Export JSON to keep your changes.');
  }
  function mutate(fn) {if(!selected.size||!key)return;const before=snapshot(h.layout(),key);fn();save(before);h.render();}
  function matrixAction(matrix) {
    if(!fitsTransform(h.layout(),key,selected,matrix)){announce(h.language()==='ko'?'그룹 전체가 지도 안에 있어야 합니다.':'The whole selection must remain inside the map.');return;}
    mutate(()=>transform(h.layout(),key,selected,matrix,snapshot(h.layout(),key)));
  }
  function history(back) {
    const from=back?undo:redo,to=back?redo:undo;if(!key||!from.length)return;
    to.push(snapshot(h.layout(),key));restore(h.layout(),key,from.pop());selected=expandSelection(h.layout(),key,selected);
    internal=true;h.commit();internal=false;h.render();refresh();
  }
  function eligibleEntries() {return entries(h.layout(),key).filter(({kind,value})=>allowed(ref(kind,value.id))&&h.visible(kind,value));}
  function removeSelected() {
    if(!selected.size||gesture)return;
    mutate(()=>deleteSelection(h.layout(),key,selected));
    selected.clear();h.render();refresh();
  }
  async function addFile(chosen) {
    const targetKey=h.key(),layout=h.layout();if(!chosen||!targetKey||!h.editing())return;
    try {
      if(chosen.size>16*1024*1024)throw new Error('Too large');
      const imported=h.validate(JSON.parse(await chosen.text()));
      if(targetKey!==h.key()||!h.editing())return;
      // A replay package is portable; a normal layout adds only the current view.
      let sourceKey=targetKey;
      const keys=[...new Set([...Object.keys(imported.markers),...Object.keys(imported.annotations)])];
      if(!imported.markers[sourceKey]?.length&&!imported.annotations[sourceKey]?.length) {
        if(keys.length!==1||!imported.vectorGroups?.[keys[0]]?.some(g=>g.source?.replayId))throw new Error('Map mismatch');
        sourceKey=keys[0];
      }
      const before=snapshot(layout,targetKey),candidate=structuredClone(layout);
      const added=appendLayout(candidate,targetKey,imported,sourceKey,id);
      h.validate(candidate); // Enforce combined limits before changing any data.
      restore(layout,targetKey,snapshot(candidate,targetKey));
      selected.clear();editable=new Set([...editable,...added]);active=true;h.cancelDrawing();save(before);h.render();announce(msg().added);
    }catch(error){announce(msg().invalid);}
  }
  for(const container of h.toolbars) {
    const panel=document.createElement('div');panel.className='vector-editor-tools';panel.hidden=true;
    const buttons={};
    for(const action of ['undo','redo','delete']) {
      const button=document.createElement('button');button.type='button';button.className='marker-tool';button.dataset.vectorAction=action;
      button.addEventListener('click',()=>action==='delete'?removeSelected():history(action==='undo'));
      buttons[action]=button;panel.append(button);
    }
    const lockLabel=document.createElement('label');lockLabel.className='vector-lock';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=lock;
    const lockText=document.createElement('span');lockLabel.append(checkbox,lockText);panel.append(lockLabel);
    checkbox.addEventListener('change',()=>{lock=checkbox.checked;selected.clear();refresh();});
    const status=document.createElement('span');status.className='vector-status';status.setAttribute('role','status');status.hidden=true;
    panel.append(status);container.append(panel);bars.push({panel,buttons,checkbox,lockText,status});
  }
  function position(event,surface) {const r=surface.layer.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*100,y:(event.clientY-r.top)/r.height*100};}
  for(const config of h.surfaces) {
    const overlay=document.createElement('div');overlay.className='vector-selection-layer';config.stage.append(overlay);
    const surface={...config,overlay};surfaces.push(surface);config.stage.tabIndex=-1;
    config.stage.addEventListener('pointerdown',event=>{
      if(!active||!h.editing()||h.drawing()||event.button!==0||event.target.closest('button:not([data-vector-handle]):not(.map-marker),input,textarea,.marker-context-menu,.annotation-context-menu'))return;
      const r=config.layer.getBoundingClientRect();if(!r.width||!r.height)return;
      const p=position(event,surface),handle=event.target.closest('[data-vector-handle]')?.dataset.vectorHandle;
      const target=event.target.closest('[data-marker-id],[data-annotation-id]');
      // Leave native marker drag/drop in charge, even inside a selected group.
      if(target){selected.clear();refresh();return;}
      const b=bounds(h.layout(),key,selected);
      const mode=handle||'marquee';
      if(mode!=='marquee'&&!b)return;
      gesture={mode,start:p,last:p,surface,bounds:b,base:snapshot(h.layout(),key),selection:new Set(selected),append:event.shiftKey,pointerId:event.pointerId,moved:false};
      if(mode==='marquee'&&!event.shiftKey)selected.clear();
      event.preventDefault();event.stopImmediatePropagation();config.stage.setPointerCapture(event.pointerId);config.stage.focus({preventScroll:true});refresh();
    },true);
    config.stage.addEventListener('pointermove',event=>{
      if(!gesture||gesture.surface!==surface||gesture.pointerId!==event.pointerId)return;
      const p=position(event,surface);gesture.last=p;gesture.moved||=Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>.15;
      event.preventDefault();event.stopImmediatePropagation();
      if(!frame)frame=requestAnimationFrame(()=>{frame=0;preview();});
    },true);
    function finish(event,cancel=false) {
      if(!gesture||gesture.surface!==surface||gesture.pointerId!==event.pointerId)return;
      if(frame){cancelAnimationFrame(frame);frame=0;}if(!cancel)preview();
      const g=gesture;gesture=null;
      if(cancel){restore(h.layout(),key,g.base);selected=g.selection;}
      else if(g.mode==='marquee') {
        const box={minX:Math.min(g.start.x,g.last.x),maxX:Math.max(g.start.x,g.last.x),minY:Math.min(g.start.y,g.last.y),maxY:Math.max(g.start.y,g.last.y)};
        const hits=eligibleEntries().filter(({value})=>vertices(value).every(p=>p.x>=box.minX&&p.x<=box.maxX&&p.y>=box.minY&&p.y<=box.maxY)).map(({kind,value})=>ref(kind,value.id));
        const picked=new Set([...(g.append?g.selection:[]),...hits]);
        selected=picked.size>=2?expandSelection(h.layout(),key,picked):new Set();
      }else if(g.moved&&g.transformed)save(g.base);
      else restore(h.layout(),key,g.base);
      if(config.stage.hasPointerCapture(event.pointerId))config.stage.releasePointerCapture(event.pointerId);
      event.preventDefault();event.stopImmediatePropagation();h.render();refresh();
    }
    config.stage.addEventListener('pointerup',event=>finish(event),true);
    config.stage.addEventListener('pointercancel',event=>finish(event,true),true);
    config.stage.addEventListener('click',event=>{if(active&&h.editing()&&!event.target.closest('.marker-context-menu,.annotation-context-menu,.modal-map-close,.map-marker')){event.preventDefault();event.stopImmediatePropagation();}},true);
    config.stage.addEventListener('dragstart',event=>{if(active&&h.editing()&&!event.target.closest('.map-marker')){event.preventDefault();event.stopImmediatePropagation();}},true);
  }
  function preview() {
    if(!gesture)return;
    const g=gesture,p=g.last,b=g.bounds;
    if(g.mode==='marquee'){refresh();return;}
    let matrix;
    if(g.mode==='move')matrix=[1,0,0,1,p.x-g.start.x,p.y-g.start.y];
    else if(g.mode==='rotate') {
      const a=Math.atan2(p.y-b.cy,p.x-b.cx)-Math.atan2(g.start.y-b.cy,g.start.x-b.cx);
      matrix=around(b.cx,b.cy,1,a);
    }else {
      const anchor={x:g.mode.includes('w')?b.maxX:b.minX,y:g.mode.includes('n')?b.maxY:b.minY};
      const vx=g.start.x-anchor.x,vy=g.start.y-anchor.y;
      const scale=Math.max(.001,Math.min(1000,((p.x-anchor.x)*vx+(p.y-anchor.y)*vy)/(vx*vx+vy*vy||1)));
      matrix=around(anchor.x,anchor.y,scale);
    }
    const original={markers:{[key]:g.base.markers},annotations:{[key]:g.base.annotations},vectorGroups:{[key]:g.base.groups}};
    if(!fitsTransform(original,key,g.selection,matrix))return;
    transform(h.layout(),key,g.selection,matrix,g.base);g.transformed=true;h.render();refresh();
  }
  function refresh() {
    if(reading)return;reading=true;
    const next=h.key();
    if(key!==next){key=next;selected.clear();editable.clear();known=new Set(entries(h.layout(),key).map(({kind,value})=>ref(kind,value.id)));undo=[];redo=[];gesture=null;}
    active=h.editing()&&!h.drawing();
    if(!h.editing())selected.clear();
    selected=expandSelection(h.layout(),key,selected);
    const b=bounds(h.layout(),key,selected),w=msg();
    for(const bar of bars) {
      bar.panel.hidden=!h.editing()||!key;
      for(const [action,button] of Object.entries(bar.buttons)) {
        button.textContent=w[action];button.disabled=!key||!!gesture||(action==='delete'&&!selected.size)||(action==='undo'&&!undo.length)||(action==='redo'&&!redo.length);
      }
      bar.checkbox.checked=lock;bar.lockText.textContent=w.lock;
    }
    for(const surface of surfaces) {
      const {overlay,layer,stage}=surface;
      stage.classList.toggle('is-vector-selecting',active&&h.editing());
      overlay.hidden=!active||!h.editing();overlay.replaceChildren();
      const r=layer.getBoundingClientRect(),s=stage.getBoundingClientRect();
      Object.assign(overlay.style,{left:`${r.left-s.left-stage.clientLeft}px`,top:`${r.top-s.top-stage.clientTop}px`,width:`${r.width}px`,height:`${r.height}px`});
      layer.querySelectorAll('[data-marker-id]').forEach(node=>node.classList.toggle('is-vector-selected',selected.has(ref('m',node.dataset.markerId))));
      if(overlay.hidden||!r.width)continue;
      function rectangle(box,className) {const el=document.createElement('div');el.className=className;Object.assign(el.style,{left:`${box.minX}%`,top:`${box.minY}%`,width:`${box.maxX-box.minX}%`,height:`${box.maxY-box.minY}%`});overlay.append(el);return el;}
      if(gesture?.mode==='marquee'&&gesture.surface===surface){const a=gesture.start,c=gesture.last;rectangle({minX:Math.min(a.x,c.x),minY:Math.min(a.y,c.y),maxX:Math.max(a.x,c.x),maxY:Math.max(a.y,c.y)},'vector-marquee');}
      else if(b&&selected.size>=2) {
        const box=rectangle(b,'vector-box');
        for(const name of ['nw','ne','sw','se','rotate','move']) {
          const handle=document.createElement('button');handle.type='button';handle.dataset.vectorHandle=name;handle.className=`vector-handle vector-${name}`;handle.setAttribute('aria-label',name==='rotate'?w.rotate:name==='move'?w.move:`${w.resize} ${name}`);box.append(handle);
        }
      }
    }
    reading=false;
  }
  document.addEventListener('keydown',event=>{
    if(!h.editing()||!active||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())) {
      event.preventDefault();event.stopImmediatePropagation();const k=event.key.toLowerCase();history(k==='z'&&!event.shiftKey);
    }else if(event.key==='Delete'&&selected.size&&!gesture) {
      event.preventDefault();event.stopImmediatePropagation();removeSelected();
    }else if(event.key==='Escape') {
      if(gesture){restore(h.layout(),key,gesture.base);gesture=null;h.render();}else selected.clear();refresh();
    }else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&selected.size) {
      event.preventDefault();const n=event.shiftKey?1:.1;matrixAction([1,0,0,1,event.key==='ArrowLeft'?-n:event.key==='ArrowRight'?n:0,event.key==='ArrowUp'?-n:event.key==='ArrowDown'?n:0]);
    }
  },true);
  new ResizeObserver(refresh).observe(h.surfaces[0].stage);
  refresh();
  return {refresh,addFile,onExternalCommit(){
    const current=new Set(entries(h.layout(),key).map(({kind,value})=>ref(kind,value.id)));
    if(!internal){undo=[];redo=[];for(const r of current)if(!known.has(r))editable.add(r);}
    known=current;
  },isActive:()=>active&&h.editing()};
}
