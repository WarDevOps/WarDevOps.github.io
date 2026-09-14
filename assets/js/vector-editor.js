import {around,ref,entries,vertices,bounds,expandSelection,snapshot,restore,transform,makeGroup,appendLayout,fitsTransform} from './vector-model.js?v=replay-vectors-20260915';

const words={
  ko:{select:'영역 선택',add:'현재 지도에 JSON 추가',lock:'기존 객체 잠금',all:'전체 선택',group:'그룹 묶기',ungroup:'그룹 해제',undo:'되돌리기',redo:'다시 실행',rotate:'회전',flipX:'좌우 반전',flipY:'상하 반전',fit:'지도 안에 맞춤',clear:'선택 해제',hint:'빈 곳 드래그: 영역 선택 · 모서리: 비율 유지 크기 조절 · 위 손잡이: 회전 · Shift: 추가 선택',count:'개 객체 선택',invalid:'추가할 수 없는 JSON입니다. 지도·구역·팀과 파일 형식을 확인하세요.',added:'현재 지도에 추가했습니다. 선택 영역을 드래그해 위치를 맞추세요.',outside:'지도 밖 좌표 포함',degrees:'각도(°)',apply:'회전 적용',scale:'크기(%)',resize:'크기 적용',locked:'잠금 해제 시 기존 객체도 선택할 수 있습니다.'},
  en:{select:'Select area',add:'Add JSON to current map',lock:'Lock existing objects',all:'Select all',group:'Group',ungroup:'Ungroup',undo:'Undo',redo:'Redo',rotate:'Rotate',flipX:'Flip horizontal',flipY:'Flip vertical',fit:'Fit to map',clear:'Clear selection',hint:'Drag empty space to select · Corners scale uniformly · Top handle rotates · Shift adds to selection',count:'objects selected',invalid:'Cannot add this JSON. Check the map, variation, team, and format.',added:'Added to the current map. Drag the selection to align it.',outside:'Includes off-map coordinates',degrees:'Angle (°)',apply:'Apply rotation',scale:'Size (%)',resize:'Apply size',locked:'Unlock to select existing objects.'}
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
  function announce(text) { bars.forEach(b=>b.status.textContent=text); }
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
  function setSelection(value) {selected=expandSelection(h.layout(),key,value);refresh();}
  function act(action,bar) {
    if(action==='select'){active=!active;h.cancelDrawing();selected.clear();refresh();return;}
    if(action==='add'){file.value='';file.click();return;}
    if(action==='undo'||action==='redo'){history(action==='undo');return;}
    if(action==='all'){active=true;setSelection(new Set(eligibleEntries().map(({kind,value})=>ref(kind,value.id))));return;}
    if(action==='clear'){selected.clear();refresh();return;}
    const b=bounds(h.layout(),key,selected);if(!b)return;
    if(action==='group'){mutate(()=>makeGroup(h.layout(),key,selected,id(),h.language()==='ko'?'선택 그룹':'Selection'));return;}
    if(action==='ungroup'){mutate(()=>{h.layout().vectorGroups[key]=groups().filter(g=>!g.members.some(m=>selected.has(ref(m.kind,m.id))));});return;}
    if(action==='fit'){
      const factor=80/Math.max(b.maxX-b.minX,b.maxY-b.minY,1);
      matrixAction([factor,0,0,factor,50-factor*b.cx,50-factor*b.cy]);return;
    }
    if(action==='flipX'||action==='flipY')matrixAction(around(b.cx,b.cy,1,0,action==='flipX'?-1:1,action==='flipY'?-1:1));
    if(action==='rotate'){const angle=Number(bar.angle.value);if(Number.isFinite(angle))matrixAction(around(b.cx,b.cy,1,angle*Math.PI/180));}
    if(action==='scale'){const scale=Number(bar.scale.value)/100;if(scale>=.001&&scale<=1000)matrixAction(around(b.cx,b.cy,scale));}
  }
  const file=document.createElement('input');file.id='vector-import-file';file.type='file';file.accept='.json,application/json';file.hidden=true;document.body.append(file);
  file.addEventListener('change',async()=>{
    const targetKey=key,layout=h.layout(),chosen=file.files[0];if(!chosen)return;
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
      selected=added;editable=new Set([...editable,...added]);active=true;h.cancelDrawing();save(before);h.render();announce(msg().added);
    }catch(error){announce(msg().invalid);}
  });
  for(const container of h.toolbars) {
    const panel=document.createElement('div');panel.className='vector-editor-tools';panel.hidden=true;
    const buttons={};const controls=document.createElement('div');controls.className='vector-actions';
    const bar={panel,buttons};
    for(const action of ['add','all','group','ungroup','undo','redo','flipX','flipY','fit','clear']) {
      const button=document.createElement('button');button.type='button';button.className='marker-tool';button.dataset.vectorAction=action;
      button.addEventListener('click',()=>act(action,bar));buttons[action]=button;controls.append(button);
    }
    const lockLabel=document.createElement('label');lockLabel.className='vector-lock';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=lock;
    const lockText=document.createElement('span');lockLabel.append(checkbox,lockText);controls.append(lockLabel);
    checkbox.addEventListener('change',()=>{lock=checkbox.checked;selected.clear();refresh();});
    const numeric=document.createElement('div');numeric.className='vector-actions';
    for(const [type,defaultValue,action] of [['angle','0','rotate'],['scale','100','scale']]) {
      const label=document.createElement('label'),text=document.createElement('span'),input=document.createElement('input');input.type='number';input.value=defaultValue;input.step=type==='angle'?'1':'5';
      if(type==='scale'){input.min='.1';input.max='100000';}
      label.append(text,input);const apply=document.createElement('button');apply.className='marker-tool';apply.type='button';apply.addEventListener('click',()=>act(action,bar));numeric.append(label,apply);
      bar[type]=input;bar[`${type}Label`]=text;bar[`${type}Button`]=apply;
    }
    const hint=document.createElement('span');hint.className='vector-hint';
    const status=document.createElement('span');status.className='vector-status';status.setAttribute('role','status');
    panel.append(controls,numeric,hint,status);container.append(panel);
    Object.assign(bar,{checkbox,lockText,hint,status,numeric});bars.push(bar);
  }
  function position(event,surface) {const r=surface.layer.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*100,y:(event.clientY-r.top)/r.height*100};}
  for(const config of h.surfaces) {
    const overlay=document.createElement('div');overlay.className='vector-selection-layer';config.stage.append(overlay);
    const surface={...config,overlay};surfaces.push(surface);
    config.stage.addEventListener('pointerdown',event=>{
      if(!active||!h.editing()||h.drawing()||event.button!==0||event.target.closest('button:not([data-vector-handle]):not(.map-marker),input,textarea,.marker-context-menu'))return;
      const r=config.layer.getBoundingClientRect();if(!r.width||!r.height)return;
      const p=position(event,surface),handle=event.target.closest('[data-vector-handle]')?.dataset.vectorHandle;
      const target=event.target.closest('[data-marker-id],[data-annotation-id]');
      let hit=target?(target.dataset.markerId?ref('m',target.dataset.markerId):ref('a',target.dataset.annotationId)):null;
      if(hit&&!allowed(hit))hit=null;
      if(hit&&!selected.has(hit))setSelection(new Set([...(event.shiftKey?selected:[]),hit]));
      const b=bounds(h.layout(),key,selected);
      let mode=handle|| (hit?'move':'marquee');
      if(mode!=='marquee'&&!b)return;
      gesture={mode,start:p,last:p,surface,bounds:b,base:snapshot(h.layout(),key),selection:new Set(selected),append:event.shiftKey,pointerId:event.pointerId,moved:false};
      if(mode==='marquee'&&!event.shiftKey)selected.clear();
      event.preventDefault();event.stopImmediatePropagation();config.stage.setPointerCapture(event.pointerId);refresh();
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
        selected=expandSelection(h.layout(),key,new Set([...(g.append?g.selection:[]),...hits]));
      }else if(g.moved&&g.transformed)save(g.base);
      else restore(h.layout(),key,g.base);
      if(config.stage.hasPointerCapture(event.pointerId))config.stage.releasePointerCapture(event.pointerId);
      event.preventDefault();event.stopImmediatePropagation();h.render();refresh();
    }
    config.stage.addEventListener('pointerup',event=>finish(event),true);
    config.stage.addEventListener('pointercancel',event=>finish(event,true),true);
    config.stage.addEventListener('click',event=>{if(active&&h.editing()&&!event.target.closest('.marker-context-menu,.modal-map-close')){event.preventDefault();event.stopImmediatePropagation();}},true);
    config.stage.addEventListener('dragstart',event=>{if(active&&h.editing()){event.preventDefault();event.stopImmediatePropagation();}},true);
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
        button.textContent=w[action];button.disabled=!key||(['group','ungroup','flipX','flipY','fit','clear'].includes(action)&&!selected.size)||(action==='undo'&&!undo.length)||(action==='redo'&&!redo.length);
      }
      bar.checkbox.checked=lock;bar.lockText.textContent=w.lock;
      bar.angleLabel.textContent=w.degrees;bar.scaleLabel.textContent=w.scale;bar.angleButton.textContent=w.apply;bar.scaleButton.textContent=w.resize;
      bar.angleButton.disabled=bar.scaleButton.disabled=!selected.size;bar.numeric.hidden=!active;bar.hint.hidden=!active;bar.hint.textContent=w.hint;
      bar.status.textContent=active?`${selected.size} ${w.count}${b&&(b.minX<0||b.maxX>100||b.minY<0||b.maxY>100)?` · ${w.outside}`:''}`:'';
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
      else if(b) {
        const box=rectangle(b,'vector-box');box.dataset.vectorHandle='move';
        for(const name of ['nw','ne','sw','se','rotate']) {
          const handle=document.createElement('button');handle.type='button';handle.dataset.vectorHandle=name;handle.className=`vector-handle vector-${name}`;handle.setAttribute('aria-label',name==='rotate'?w.rotate:`${w.resize} ${name}`);box.append(handle);
        }
      }
    }
    reading=false;
  }
  document.addEventListener('keydown',event=>{
    if(!h.editing()||!active||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if((event.ctrlKey||event.metaKey)&&['z','y','a'].includes(event.key.toLowerCase())) {
      event.preventDefault();event.stopImmediatePropagation();const k=event.key.toLowerCase();if(k==='a')act('all');else history(k==='z'&&!event.shiftKey);
    }else if(event.key==='Escape') {
      if(gesture){restore(h.layout(),key,gesture.base);gesture=null;h.render();}else selected.clear();refresh();
    }else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&selected.size) {
      event.preventDefault();const n=event.shiftKey?1:.1;matrixAction([1,0,0,1,event.key==='ArrowLeft'?-n:event.key==='ArrowRight'?n:0,event.key==='ArrowUp'?-n:event.key==='ArrowDown'?n:0]);
    }
  },true);
  new ResizeObserver(refresh).observe(h.surfaces[0].stage);
  refresh();
  return {refresh,onExternalCommit(){
    const current=new Set(entries(h.layout(),key).map(({kind,value})=>ref(kind,value.id)));
    if(!internal){undo=[];redo=[];for(const r of current)if(!known.has(r))editable.add(r);}
    known=current;
  },isActive:()=>active&&h.editing()};
}
