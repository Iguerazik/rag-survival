 'use strict';
/* V10: input routing. A saved logical action map avoids menu hotkeys stealing WASD. */
const Controls = (() => {
  const storageKey = 'midgard-controls-v10';
  const defaults = Object.freeze({up:'w',left:'a',down:'s',right:'d',inventory:'i',cards:'c',codex:'k',pets:'p',stats:'alt+s',equipment:'alt+e',tree:'t',portal:'e',pause:'escape'});
  const descriptions = Object.freeze({up:'Caminhar para cima',left:'Caminhar para a esquerda',down:'Caminhar para baixo',right:'Caminhar para a direita',inventory:'Inventário',cards:'Álbum de cartas',codex:'Códex',pets:'Pets e loja',stats:'Atributos do personagem',equipment:'Equipamentos',tree:'Árvore de habilidades',portal:'Entrar no portal',pause:'Pausar / continuar'});
  const dialog = document.getElementById('controls-dialog');
  const list = document.getElementById('controls-bindings');
  const message = document.getElementById('controls-message');
  let binding = { ...defaults }; let capture = null; let resumeMode = null;
  const normalize = raw => String(raw || '').toLowerCase().replace(/\s+/g, '');
  function valid(v){return /^(?:alt\+|ctrl\+|shift\+)?(?:[a-z0-9]|arrowup|arrowdown|arrowleft|arrowright|escape|tab|enter|space|f[1-9]|f1[0-2])$/.test(v)}
  try {
    const loaded=JSON.parse(localStorage.getItem(storageKey)||'{}');
    if(loaded && typeof loaded==='object') {
      const next={...defaults};for(const key of Object.keys(defaults)){if(valid(loaded[key]))next[key]=loaded[key]}
      if(new Set(Object.values(next)).size===Object.values(next).length)binding=next;
    }
  } catch {};
  const keyFor=e=>{
    const name=e.key===' '?'space':normalize(e.key);
    if(!name || ['control','shift','alt','meta','dead','unidentified'].includes(name))return null;
    if(e.metaKey)return null;
    return (e.altKey?'alt+':e.ctrlKey?'ctrl+':e.shiftKey?'shift+':'')+name;
  };
  const label=value=>String(value||'').replace('alt+','Alt + ').replace('ctrl+','Ctrl + ').replace('shift+','Shift + ').replace(/^arrow/,'Seta ').replace('escape','Esc').replace('space','Espaço').toUpperCase();
  const get=action=>binding[action];
  const matches=(e,action)=>keyFor(e)===binding[action];
  function moveKey(e){
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return null;
    const k=keyFor(e);
    const canonical={up:'w',left:'a',down:'s',right:'d'};
    for(const [action,to] of Object.entries(canonical))if(binding[action]===k)return to;
    if(['arrowup','arrowleft','arrowdown','arrowright'].includes(k)) return {arrowup:'w',arrowleft:'a',arrowdown:'s',arrowright:'d'}[k];
    return null;
  }
  function updateLabels(){
    const shortcuts={ 'hud-status':'stats','hud-equipment':'equipment','run-inventory':'inventory','run-cards':'cards','run-codex':'codex','run-pets':'pets','tree-button':'tree','portal-button':'portal','pause':'pause'};
    for(const [id,action] of Object.entries(shortcuts)){
      const btn=document.getElementById(id);if(!btn)continue;
      btn.dataset.key=label(binding[action]); const kbd=btn.querySelector('kbd');if(kbd)kbd.textContent=label(binding[action]);
      btn.title=descriptions[action]+' · '+label(binding[action]);
    }
    const help=document.getElementById('hud-hint');if(help)help.textContent=`${label(binding.stats)}: status · ${label(binding.equipment)}: equip. · ${label(binding.inventory)}: inventário · ${label(binding.pause)}: pausa`;
  }
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(binding))}catch{};updateLabels();}
  function redraw(){
    list.replaceChildren();
    for(const [heading,groups] of [['Movimentação',['up','left','down','right']],['Janelas e ações',['inventory','cards','codex','pets','stats','equipment','tree','portal','pause']]]){
      const group=document.createElement('section');group.className='controls-section';
      const title=document.createElement('h3');title.textContent=heading;group.append(title);
      for(const action of groups){
        const line=document.createElement('div');line.className='controls-line';
        const name=document.createElement('span');name.textContent=descriptions[action];
        const key=document.createElement('button');key.type='button';key.className='controls-key';key.dataset.action=action;key.textContent=capture===action?'Pressione uma tecla…':label(binding[action]);
        key.setAttribute('aria-label','Alterar tecla de '+descriptions[action]);
        key.addEventListener('click',()=>{capture=action;message.textContent='Pressione uma tecla para '+descriptions[action]+'. Esc cancela.';redraw();});
        line.append(name,key);group.append(line);
      }
      list.append(group);
    }
    // V27: qualidade gráfica (resolução adaptativa) e contador de FPS.
    if (typeof Graphics !== 'undefined') {
      const group=document.createElement('section');group.className='controls-section graphics-section';
      const title=document.createElement('h3');title.textContent='Gráficos';group.append(title);
      const line=document.createElement('div');line.className='controls-line graphics-modes';
      const name=document.createElement('span');name.textContent='Qualidade';line.append(name);
      const wrap=document.createElement('div');wrap.className='graphics-choice';wrap.setAttribute('role','radiogroup');wrap.setAttribute('aria-label','Qualidade gráfica');
      for(const [id,text,tip] of [['auto','Automático','Ajusta a resolução sozinho se o jogo engasgar'],['high','Alta','Resolução cheia e todos os brilhos'],['low','Leve','Para PC fraco: menos pixels e sem brilhos extras']]){
        const b=document.createElement('button');b.type='button';b.className='controls-key graphics-mode'+(Graphics.mode()===id?' active':'');b.textContent=text;b.title=tip;
        b.setAttribute('role','radio');b.setAttribute('aria-checked',String(Graphics.mode()===id));
        b.addEventListener('click',()=>{Graphics.setMode(id);message.textContent=text==='Leve'?'Gráficos leves ativados.':text==='Alta'?'Gráficos em qualidade alta.':'Qualidade automática: baixa a resolução só se o jogo engasgar.';redraw();});
        wrap.append(b);
      }
      line.append(wrap);group.append(line);
      const fps=document.createElement('label');fps.className='controls-line graphics-fps';
      const fpsName=document.createElement('span');fpsName.textContent='Mostrar FPS na partida';
      const box=document.createElement('input');box.type='checkbox';box.checked=Graphics.fps();box.addEventListener('change',()=>Graphics.setFps(box.checked));
      fps.append(fpsName,box);group.append(fps);
      const note=document.createElement('small');note.className='graphics-note';note.textContent='Se o jogo engasgar no seu PC, use Leve. Não muda a velocidade da partida nem o online.';group.append(note);
      list.prepend(group);
    }
  }
  const isOpen=()=>!!dialog?.open;
  function open(){if(!dialog || dialog.open)return;capture=null;message.textContent='';
    if(typeof mode!=='undefined' && mode==='play' && typeof run!=='undefined' && run && !run.coop){resumeMode='play';mode='options';}
    redraw();dialog.showModal();}
  function close(){capture=null;if(dialog?.open)dialog.close();}
  document.getElementById('nav-settings')?.addEventListener('click',open);
  document.getElementById('run-settings')?.addEventListener('click',open);
  document.getElementById('controls-close')?.addEventListener('click',close);
  document.getElementById('controls-done')?.addEventListener('click',close);
  document.getElementById('controls-reset')?.addEventListener('click',()=>{binding={...defaults};capture=null;save();message.textContent='Controles originais restaurados.';redraw();});
  dialog?.addEventListener('click',e=>{if(e.target===dialog)close()});
  dialog?.addEventListener('close',()=>{capture=null;if(resumeMode && typeof mode!=='undefined' && mode==='options')mode=resumeMode;resumeMode=null;redraw();});
  document.addEventListener('keydown',e=>{
    if(!isOpen())return;
    if(capture){
      e.stopImmediatePropagation();e.preventDefault();
      if(e.key==='Escape'){capture=null;message.textContent='Alteração cancelada.';redraw();return;}
      const chord=keyFor(e);
      if(!chord||!valid(chord)){message.textContent='Tecla inválida. Escolha outra.';return;}
      const conflict=Object.entries(binding).find(([act,v])=>act!==capture&&v===chord);
      if(conflict){message.textContent='Essa tecla já está atribuída a '+descriptions[conflict[0]]+'. Escolha outra.';return;}
      if(['up','down','left','right'].includes(capture)&&chord.includes('+')){message.textContent='Movimento deve usar uma tecla simples, sem Alt, Ctrl ou Shift.';return;}
      if(!['up','down','left','right'].includes(capture) && (['w','a','s','d'].includes(chord) && Object.values(binding).includes(chord))){message.textContent='Tecla de movimento reservada.';return;}
      binding[capture]=chord;capture=null;save();message.textContent='Atalho atualizado e salvo.';redraw();return;
    }
    if(e.key!=='Escape' && e.key!=='Tab') {e.stopImmediatePropagation();}
  },true);
  updateLabels();
  return {open,close,isOpen,moveKey,matches,get,keyFor,label,defaults,descriptions};
})();
