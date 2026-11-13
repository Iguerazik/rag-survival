'use strict';
/*
 * Rune-Midgard audio router. Ragnarok Online tracks are NOT redistributed.
 * Drop personally authorized MP3s in assets/bgm/ro/ with the numeric names below,
 * then select "BGM de Ragnarok (arquivos locais)" in the menu.
 * The bundled .ogg loops are independent, original prototype compositions.
 */
const BGM = (() => {
  const catalogue = Object.freeze({
    menu:       { id:'08', title:'Theme of Prontera', map:'Tela inicial de Rune-Midgard' },
    sewer:      { id:'19', title:'Under the Ground', map:'Esgotos de Prontera' },
    payon:      { id:'47', title:'Welcome Mr. Hwang', map:'Caverna de Payon, 4º andar' },
    maze:       { id:'16', title:'Labyrinth', map:'Labirinto da Floresta' },
    orc:        { id:'48', title:'Help Yourself', map:'Calabouço dos Orcs' },
    geffen:     { id:'21', title:'Through the Tower', map:'Torre de Geffen, 2º andar' },
    payonfield: { id:'03', title:'Peaceful Forest', map:'Floresta de Payon, 11' },
    glast: { id:'21', title:'Through the Tower', map:'Prisão de Glast Heim', ambient:'geffen' },
    mine: { id:'19', title:'Under the Ground', map:'Mina Abandonada', ambient:'sewer' },
    temple: { id:'47', title:'Welcome Mr. Hwang', map:'Templo Esquecido', ambient:'payon' },
    shadow: { id:'16', title:'Labyrinth', map:'Bosque das Sombras', ambient:'maze' },
  });
  let channel=null, currentMap=null, enabled=false, generation=0;
  let localMenuUrl=null;
  const stored=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
  let menuSelection=stored('midgard-menu-track','menu');
  if(!catalogue[menuSelection])menuSelection='menu';
  let pausedMusic=stored('midgard-bgm-paused','false')==='true';
  const save=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};
  let volume=Math.min(1, Math.max(0, Number(stored('midgard-bgm-volume','.32'))));
  let roMode=stored('midgard-bgm-ro','true')==='true';
  const element=id=>document.getElementById(id);
  const meta=map=>catalogue[map]||catalogue.sewer;
  function status(note='') {
    const toggle=element('menu-bgm-source');
    if(toggle){toggle.textContent=roMode?'Originais: ativados':'Originais: desativados';toggle.setAttribute('aria-pressed',String(roMode));}
    for(const id of ['bgm-volume','game-music-volume']) {const slider=element(id);if(slider)slider.value=Math.round(volume*100);}
    for(const id of ['menu-music-play','game-music-play']) {const btn=element(id);if(btn){btn.textContent=pausedMusic?'▶':'❚❚';btn.setAttribute('aria-pressed',String(!pausedMusic));btn.title=pausedMusic?'Tocar música':'Pausar música';}}
    const sel=element('menu-track');if(sel)sel.value=menuSelection;
  }
  const actualTrack=map=>map==='menu'?menuSelection:map;
  async function authorizedTrack(map){
    if(!roMode)return null;
    const path='assets/bgm/ro/'+meta(map).id+'.mp3';
    try{
      const response=await fetch(path,{method:'HEAD',cache:'no-store'});
      return response.ok ? path:null;
    }catch {return null;}
  }
  function fadeOut(sound){
    if(!sound)return;
    let remaining=10;const original=sound.volume;
    const timer=setInterval(()=>{
      remaining--;
      if(!remaining){clearInterval(timer);sound.pause();sound.removeAttribute('src');sound.load();return;}
      try{sound.volume=Math.max(0,original*remaining/10);}catch{clearInterval(timer);sound.pause();}
    },32);
  }
  async function enter(map, shouldPlay=true){
    if(!catalogue[map])return;
    currentMap=map;enabled=!!shouldPlay;
    const request=++generation;
    if(!enabled||pausedMusic){if(channel)channel.pause();status('pausada');return;}
    const track=actualTrack(map);
    const url=(map==='menu' && menuSelection==='menu' && localMenuUrl) || (await authorizedTrack(track)) || 'assets/bgm/ambient/'+(meta(track).ambient||track)+'.ogg';
    if(request!==generation||currentMap!==map||!enabled||pausedMusic)return;
    if(channel?.dataset?.url===url){
      channel.volume=volume;channel.play().catch(()=>status('toque em Som para ativar'));status(url.startsWith('blob:')?'arquivo local de Prontera':url.includes('/ro/')?'BGM do RO':'composição alternativa');return;
    }
    const previous=channel;
    const sound=new Audio(url);
    sound.dataset.url=url;
    sound.preload='auto';sound.loop=true;sound.volume=0;
    channel=sound;
    let source=url.startsWith('blob:')?'arquivo local de Prontera':url.includes('/ro/')?'BGM do RO':'composição alternativa';
    let target=volume;
    if(previous)fadeOut(previous);
    sound.addEventListener('error',()=>{
      if(channel!==sound)return;
      if(source==='BGM do RO'||source==='arquivo local de Prontera'){
        // If one provided original fails, fall back gracefully.
        sound.src='assets/bgm/ambient/'+(meta(track).ambient||track)+'.ogg';sound.dataset.url=sound.src;
        source='composição alternativa';
        sound.play().catch(()=>{});
        status('arquivo RO inválido · faixa alternativa');
      }else status('arquivo de música indisponível');
    },{once:true});
    try{await sound.play();}catch{status('clique em Som para ouvir');return;}
    let steps=0;const timer=setInterval(()=>{
      if(channel!==sound||!enabled){clearInterval(timer);return;}
      sound.volume=Math.max(0,Math.min(1,target*(++steps/10)));
      if(steps>=10)clearInterval(timer);
    },38);
    status(source);
  }
  function setMuted(muted){enabled=!muted;if(!currentMap)return;if(muted){channel?.pause();status('pausada');}else enter(currentMap,true);}
  function toggleMusic(){pausedMusic=!pausedMusic;save('midgard-bgm-paused',pausedMusic);if(pausedMusic){channel?.pause();status('pausada');}else if(currentMap)enter(currentMap,enabled);else status();return pausedMusic;}
  function setMenuTrack(map){if(!catalogue[map])return;menuSelection=map;save('midgard-menu-track',map);if(currentMap==='menu')enter('menu',enabled);else status();}
  function stop(){generation++;currentMap=null;enabled=false;if(channel){channel.pause();channel.removeAttribute('src');channel.load();channel=null;}status();}
  function changeVolume(newVolume){volume=Math.max(0,Math.min(1,Number(newVolume)/100));save('midgard-bgm-volume',volume);if(channel)channel.volume=volume;status();}
  function toggleOriginal(){roMode=!roMode;save('midgard-bgm-ro',roMode);if(currentMap&&enabled)enter(currentMap,true);else status();}
  function setMenuFile(file){
    if(!file)return false;
    if(file.size>45*1024*1024)return false;
    if(!(/\.(mp3|ogg)$/i.test(file.name)||/^audio\//i.test(file.type)))return false;
    if(localMenuUrl)URL.revokeObjectURL(localMenuUrl);
    localMenuUrl=URL.createObjectURL(file);
    menuSelection='menu';save('midgard-menu-track','menu');
    if(currentMap==='menu')enter('menu',enabled);
    return true;
  }
  function getMeta(map){return meta(map);}
  function debug(){return {map:currentMap,enabled,originalRequested:roMode,url:channel?.currentSrc||'',volume:channel?.volume||0,playing:!!channel&&!channel.paused};}
  status();
  return {enter,setMuted,stop,changeVolume,toggleOriginal,getMeta,debug,setMenuFile,toggleMusic,setMenuTrack};
})();
