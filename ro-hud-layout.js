 'use strict';
/* Ragnarok client HUD: draggable windows and menu, without gameplay or save-data changes. */
(() => {
  const prefix='midgard-hud-layout-v9-';
  const screen=()=>window.innerWidth<=510?'phone':window.innerWidth<=900?'tablet':'desktop';
  const KEY=()=>prefix+screen();
  const fields=[
    { selector:'.hud-player', handle:'.ro-title', name:'character'},
    { selector:'.map-window', handle:'.ro-title', name:'map'},
    { selector:'.quest-window', handle:'.ro-title', name:'quest'},
    { selector:'.shortcut-window', handle:'.ro-title', name:'skills'},
    { selector:'.ro-quickbar', handle:'.ro-toolbar-grip', name:'menu'},
    { selector:'#game-music-panel', handle:'.ro-music-game-caption', name:'music'},
    { selector:'#party-status', handle:'.ro-ping-grip', name:'ping'},
  ];
  const elements=fields.map(f=>({...f,el:document.querySelector(f.selector)})).filter(x=>x.el);
  const store=obj=>{try{localStorage.setItem(KEY(),JSON.stringify(obj));}catch{}};
  const load=()=>{try{const obj=JSON.parse(localStorage.getItem(KEY())||'{}');return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{};}catch{return {};}};
  let state=load(),locked=false;
  const mobileMenu=document.querySelector('.ro-quickbar');
  let expandedOnPhone=false;try{expandedOnPhone=localStorage.getItem('midgard-menu-expanded-phone-v10')==='true';}catch{}
  if(window.innerWidth<=510 && !expandedOnPhone){
    mobileMenu?.classList.add('ro-quickbar-collapsed');
    const trigger=document.getElementById('quickbar-collapse');
    if(trigger){trigger.textContent='+';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','Expandir menu de janelas');}
  }

  const clamp=(n,a,b)=>Math.max(a,Math.min(Math.max(a,b),n));
  function dims(name){const e=elements.find(x=>x.name===name)?.el;const r=e?.getBoundingClientRect();const w=window.innerWidth;const phone=w<=510;const small=w<=900;const fallback={character:phone?178:small?191:257,map:phone?139:small?157:201,quest:phone?146:small?157:201,skills:phone?330:267,menu:phone?Math.min(w-12,378):small?448:258,music:phone?159:small?163:184,ping:phone?159:small?170:204};return {w:r?.width||fallback[name]||160,h:r?.height||65};}
  function defaults(){
    const w=window.innerWidth,h=window.innerHeight;
    const d={};
    if(w<=510){
      d.character={left:7,top:7};d.map={left:w-dims('map').w-7,top:7};
      d.quest={left:w-dims('quest').w-7,top:171};
      d.skills={left:(w-dims('skills').w)/2,top:h-169};
      d.menu={left:7,top:h-69};
      d.music={left:7,top:167};d.ping={left:7,top:221};
    }else if(w<=900){
      d.character={left:10,top:10};d.map={left:w-dims('map').w-10,top:10};
      d.quest={left:w-dims('quest').w-10,top:214};
      d.skills={left:(w-dims('skills').w)/2,top:h-176};
      d.menu={left:(w-dims('menu').w)/2,top:h-91};
      d.music={left:10,top:145};d.ping={left:10,top:191};
    }else{
      d.character={left:13,top:13};d.map={left:w-dims('map').w-14,top:13};
      d.quest={left:w-dims('quest').w-14,top:247};
      d.skills={left:(w-dims('skills').w)/2,top:h-110};
      d.menu={left:w-dims('menu').w-15,top:h-149};
      d.music={left:14,top:h-76};d.ping={left:14,top:h-126};
      if(w<1120)d.menu.top=346;
    }
    return d;
  }
  function apply(item,loc){
    if(!loc)return;
    const e=item.el, bounds=e.getBoundingClientRect();
    const width=bounds.width||160,height=bounds.height||80;
    let left=Number(loc.left),top=Number(loc.top);
    if(!Number.isFinite(left)||!Number.isFinite(top))return;
    left=clamp(left,4,window.innerWidth-Math.min(width,window.innerWidth)+4);
    top=clamp(top,4,window.innerHeight-Math.min(height,window.innerHeight)+4);
    for(const [k,v] of Object.entries({left:left+'px',top:top+'px',right:'auto',bottom:'auto',margin:'0',transform:'none'}))e.style.setProperty(k,v,'important');
  }
  function redraw(){const d=defaults();for(const item of elements)apply(item,{...d[item.name],...(state[item.name]||{})});}
  function savePositions(){for(const item of elements){const r=item.el.getBoundingClientRect();state[item.name]={left:Math.round(r.left),top:Math.round(r.top)}}store(state);}
  for(const item of elements){
    item.el.dataset.hudWindow=item.name;
    const handle=item.el.querySelector(item.handle);if(!handle)continue;
    handle.classList.add('ro-drag-handle');
    let drag=null;
    handle.addEventListener('pointerdown',event=>{
      if(locked||event.button!==0||event.target.closest('button,a,input,select,[contenteditable]'))return;
      // Mark active window above the others while it is being moved.
      for(const other of elements)other.el.classList.remove('ro-window-active');
      item.el.classList.add('ro-window-active');
      const r=item.el.getBoundingClientRect();drag={id:event.pointerId,dx:event.clientX-r.left,dy:event.clientY-r.top};
      handle.setPointerCapture?.(event.pointerId);
      item.el.classList.add('ro-being-dragged');event.preventDefault();event.stopPropagation();
    });
    handle.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;apply(item,{left:event.clientX-drag.dx,top:event.clientY-drag.dy});event.stopPropagation();});
    function finish(event){if(!drag||event.pointerId!==drag.id)return;drag=null;item.el.classList.remove('ro-being-dragged');savePositions();}
    handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
  }
  document.getElementById('hud-layout-reset')?.addEventListener('click',()=>{state={};store(state);redraw();});
  document.getElementById('hud-layout-lock')?.addEventListener('click',event=>{locked=!locked;event.currentTarget.setAttribute('aria-pressed',String(locked));event.currentTarget.textContent=locked?'🔒':'🔓';document.getElementById('arena')?.classList.toggle('ro-hud-locked',locked);});
  document.getElementById('quickbar-collapse')?.addEventListener('click',function(){
    const q=document.querySelector('.ro-quickbar');const collapsed=q.classList.toggle('ro-quickbar-collapsed');
    this.textContent=collapsed?'+':'−';this.setAttribute('aria-expanded',String(!collapsed));this.setAttribute('aria-label',collapsed?'Expandir atalhos':'Recolher atalhos');
    if(window.innerWidth<=510)try{localStorage.setItem('midgard-menu-expanded-phone-v10',String(!collapsed));}catch{}
    requestAnimationFrame(()=>{const item=elements.find(x=>x.name==='menu');const r=item?.el.getBoundingClientRect();
      if(item && r){
        if(window.innerWidth<=510){
          const left=collapsed?7:Math.max(7,Math.round((window.innerWidth-r.width)/2));
          const top=collapsed?window.innerHeight-69:Math.min(275,Math.round(window.innerHeight*.36));
          apply(item,{left,top});
        } else apply(item,{left:r.left,top:r.top});
      }
      savePositions();
    });
  });
  const questToggle=document.getElementById('quest-toggle');
  questToggle?.addEventListener('click',()=>{const q=document.querySelector('.quest-window');const c=q?.classList.toggle('ro-quest-collapsed');questToggle.textContent=c?'+':'−';questToggle.setAttribute('aria-expanded',String(!c));});
  let lastScreen=screen();
  window.addEventListener('resize',()=>{const next=screen();if(next!==lastScreen){lastScreen=next;state=load();}requestAnimationFrame(redraw);},{passive:true});
  requestAnimationFrame(redraw);
  window.addEventListener('load',()=>requestAnimationFrame(redraw),{once:true});
  const arena=document.getElementById('arena');
  if(arena)new MutationObserver(()=>{if(!arena.hidden)requestAnimationFrame(redraw);}).observe(arena,{attributes:true,attributeFilter:['hidden']});
  window.RuneHudLayout={reset:()=>{state={};store(state);redraw();},positions:()=>({...state}),lock:()=>locked};
})();
