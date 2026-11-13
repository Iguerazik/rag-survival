/* V18: account UX + per-account progression, same-origin authenticated cookie. */
'use strict';
window.MidgardAccount = (() => {
  const boot=window.MIDGARD_BOOTSTRAP||{account:null,progress:null};
  const user=boot.account||null;
  const localKey=user?'midgard-account:'+user.id:'';
  const dirtyKey=user?'midgard-cloud-dirty:'+user.id:'';
  let revision=boot.progress?.revision??0;
  let pending=null, uploading=false, timer=null, conflicted=false;
  const el=id=>document.getElementById(id);
  function signedIn(){return !!user}
  function initialSave(){
    if(!user)return {};
    let data=boot.progress?.data||{};
    try{
      const dirty=JSON.parse(localStorage.getItem(dirtyKey));
      if(dirty?.revision===revision && dirty?.data && typeof dirty.data==='object'){
        data=dirty.data;pending=dirty; // Offline changes from this device, same server revision.
        setTimeout(()=>flush(),2000);
      }
    }catch{}
    return data;
  }
  function saveKey(){return user?localKey:'midgard-survivors-v1'}
  function syncMessage(message,error=false){
    if(!el('account-cloud-status'))return;
    const node=el('account-cloud-status');node.textContent=message;node.dataset.error=String(error);
    if(user&&el('account-welcome'))el('account-welcome').textContent=error?'⚠ Nuvem pendente':message.startsWith('✓')?'☁ Salvo online':'☁ Salvando…';
  }
  function queueSave(data){
    if(!user||conflicted)return;
    try{
      const copy=JSON.parse(JSON.stringify(data));
      pending={revision,data:copy};
      localStorage.setItem(dirtyKey,JSON.stringify(pending));
      syncMessage('Progresso aguardando sincronização…');
      clearTimeout(timer);timer=setTimeout(()=>flush(),1700);
    }catch{syncMessage('Sem espaço local para sincronizar. Confira seu navegador.',true)}
  }
  async function request(path,body,method='POST'){
    const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify(body||{}),signal:AbortSignal.timeout(10000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){const error=new Error(result.error||'Não foi possível acessar o servidor.');error.status=response.status;throw error}
    return result;
  }
  async function flush(){
    if(!pending||uploading||conflicted||!user)return;
    uploading=true;
    const sending=pending;
    try{
      const response=await request('/api/account/progress',{revision,data:sending.data},'PUT');
      revision=response.revision;
      if(pending===sending){
        pending=null;localStorage.removeItem(dirtyKey);
        syncMessage('✓ Progresso salvo online.');
      }else{
        pending.revision=revision;
        localStorage.setItem(dirtyKey,JSON.stringify(pending));
        clearTimeout(timer);timer=setTimeout(()=>flush(),100);
      }
    }catch(error){
      if(error.status===409&&!sending.rebased){
        // V22.3: o servidor mudou o progresso (partida online ou outro aparelho). Junta os dois sem perder níveis e tenta de novo.
        try{
          const server=await refresh();
          const data=mergeProgress(sending.data,server);
          pending={revision,data,rebased:true};localStorage.setItem(dirtyKey,JSON.stringify(pending));
          window.dispatchEvent(new CustomEvent('midgard-progress-merged',{detail:data}));
          clearTimeout(timer);timer=setTimeout(()=>flush(),200);
        }catch{conflicted=true;syncMessage('Outra aba modificou seu progresso. Cópia local preservada; feche outras abas antes de recarregar.',true)}
      }
      else if(error.status===409){conflicted=true;syncMessage('Outra aba modificou seu progresso. Cópia local preservada; feche outras abas antes de recarregar.',true)}
      else if(error.status===403){syncMessage(error.message+' (cópia local preservada neste navegador).',true)}
      else {syncMessage('Sem conexão com a nuvem. Progresso mantido neste dispositivo; tentando novamente…',true);clearTimeout(timer);timer=setTimeout(()=>flush(),6500)}
    }finally{uploading=false}
  }
  function open(){
    const dialog=el('account-dialog');if(!dialog.open)dialog.showModal();
    el('account-login-form').querySelector('input').focus();
  }
  function status(message,isError=false){el('account-feedback').textContent=message;el('account-feedback').dataset.error=String(isError)}
  function tab(register){
    el('account-login-form').hidden=register;
    el('account-register-form').hidden=!register;
    el('account-tab-login').setAttribute('aria-pressed',String(!register));
    el('account-tab-register').setAttribute('aria-pressed',String(register));
    status('');
  }
  async function submit(form,path){
    const data=Object.fromEntries(new FormData(form));
    if(data.confirm!==undefined){if(data.password!==data.confirm){status('As senhas são diferentes.',true);return;}delete data.confirm}
    const button=form.querySelector('[type="submit"]');button.disabled=true;status('Conectando…');
    try{await request(path,data);rememberTab();location.reload()}catch(error){status(error.message,true);button.disabled=false}
  }
  function bind(){
    const openButton=el('account-open');
    if(!openButton)return;
    if(user){
      openButton.textContent='♙ '+user.nickname+' · Perfil';
      el('account-welcome').textContent='Conta online';
      el('account-logout').hidden=false;
      const progress=initialSave();const characters=Object.values(progress.journeys||{});
      el('account-profile-info').textContent='Nick: '+user.nickname+' · Usuário: '+user.username+' · Linhagens: '+characters.length+' · Zeny: '+(progress.zeny||0)+' · Pontos de Códex: '+(progress.codexCoins||0);
      openButton.addEventListener('click',()=>{el('account-profile-dialog').showModal();});
      el('account-import-local').addEventListener('click',async()=>{
        let guest;try{guest=JSON.parse(localStorage.getItem('midgard-survivors-v1'))}catch{}
        if(!guest||typeof guest!=='object'){syncMessage('Nenhum progresso de visitante encontrado.',true);return}
        if(!confirm('IMPORTANTE: substituir o progresso online desta conta pelo progresso de visitante deste navegador? Esta ação não pode ser desfeita.'))return;
        try{
          if(pending)await flush();
          const response=await request('/api/account/progress',{revision,data:guest},'PUT');
          revision=response.revision;localStorage.removeItem(dirtyKey);
          location.reload();
        }catch(error){syncMessage(error.message,true)}
      });
    }else{
      openButton.textContent='♙ Entrar / Criar conta';
      openButton.addEventListener('click',open);
    }
    el('account-close').addEventListener('click',()=>el('account-dialog').close());
    el('account-profile-close').addEventListener('click',()=>el('account-profile-dialog').close());
    el('account-tab-login').addEventListener('click',()=>tab(false));
    el('account-tab-register').addEventListener('click',()=>tab(true));
    el('account-login-form').addEventListener('submit',event=>{event.preventDefault();submit(event.currentTarget,'/api/auth/login')});
    el('account-register-form').addEventListener('submit',event=>{event.preventDefault();submit(event.currentTarget,'/api/auth/register')});
    el('account-logout').addEventListener('click',async()=>{
      if(pending){await flush();if(pending&&!confirm('Seu progresso ainda não foi salvo online. Sair assim mesmo?'))return}
      try{await request('/api/auth/logout',{});location.reload()}catch(error){alert(error.message)}
    });
    // Guests may play solo. Account is required for online room creation / joining.
    if(!user&&location.search.includes('sala='))setTimeout(()=>open(),500);
    if(user&&pending)setTimeout(()=>flush(),2500);
  }
  /** Junta progresso local e do servidor mantendo o que estiver mais avançado em cada personagem. */
  function mergeProgress(local,server){
    const key=j=>[j?.stage||0,j?.base||0,j?.baseXp||0,j?.job||0,j?.jobXp||0];
    const ahead=(a,b)=>{const x=key(a),y=key(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]>y[i];return true};
    const journeys={...(server.journeys||{})};
    for(const [line,j] of Object.entries(local.journeys||{})){
      const remote=journeys[line];
      if(!remote){journeys[line]=j;continue;}
      const chosen=ahead(j,remote)?j:remote;
      if((j.stage||0)!==(remote.stage||0)){journeys[line]=chosen;continue;}
      const runRecords={...(chosen.runRecords||{})};
      for(const source of [j,remote])for(const [stage,r] of Object.entries(source.runRecords||{})){const old=runRecords[stage]||{};runRecords[stage]={bestLevel:Math.max(old.bestLevel||0,r.bestLevel||0),rifts:Math.max(old.rifts||0,r.rifts||0)};}
      journeys[line]={...chosen,runRecords,guildTrials:{...(j.guildTrials||{}),...(remote.guildTrials||{})},proofs:Math.max(j.proofs||0,remote.proofs||0)};
    }
    const album={...(server.album||{})};
    for(const [id,c] of Object.entries(local.album||{}))album[id]=Math.max(Number(album[id])||0,Number(c)||0);
    const campaign=JSON.parse(JSON.stringify(server.campaign||{}));
    for(const [line,c] of Object.entries(local.campaign||{})){
      const t=campaign[line]||(campaign[line]={});t.cleared={...(c.cleared||{}),...(t.cleared||{})};
      const bd={...(t.clearsByDifficulty||{})};for(const [d,m] of Object.entries(c.clearsByDifficulty||{}))bd[d]={...m,...(bd[d]||{})};
      t.clearsByDifficulty=bd;for(const [k,v] of Object.entries(c))if(!(k in t))t[k]=v;
    }
    return {...server,...local,journeys,album,campaign,zeny:Math.max(Number(server.zeny)||0,Number(local.zeny)||0),
      best:Math.max(Number(server.best)||0,Number(local.best)||0)};
  }
  /** V22.2: relê o progresso verificado do servidor (após uma partida online) e alinha a revisão. */
  async function refresh(){
    if(!user)return null;
    const response=await fetch('/api/account/progress',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
    const snap=await response.json().catch(()=>null);
    if(!response.ok||!snap)throw new Error(snap?.error||'Não foi possível ler o progresso online.');
    revision=snap.revision;conflicted=false;
    if(pending){pending.revision=revision;try{localStorage.setItem(dirtyKey,JSON.stringify(pending))}catch{}}
    return snap.data||{};
  }
  // V23.6: fechar o jogo encerra a sessão. Cada aba marca no sessionStorage (que some ao fechar a aba) que está aberta;
  // ao abrir de novo sem essa marca e sem outra aba do jogo aberta, a conta é deslogada. F5 e uma 2ª aba continuam logados.
  // Progresso que ainda não subiu fica guardado neste navegador e é enviado no próximo login.
  function rememberTab(){try{sessionStorage.setItem('midgard-tab-open','1')}catch{}}
  let tabs=null;try{tabs=new BroadcastChannel('midgard-tabs');tabs.addEventListener('message',e=>{if(e.data==='ping')tabs.postMessage('pong');});}catch{}
  if(user){
    let known=false;try{known=sessionStorage.getItem('midgard-tab-open')==='1'}catch{}
    if(known)rememberTab();
    else{
      let other=false;const answer=e=>{if(e.data==='pong')other=true;};
      tabs?.addEventListener('message',answer);tabs?.postMessage('ping');
      setTimeout(async()=>{
        tabs?.removeEventListener('message',answer);
        if(other){rememberTab();return;}
        try{await request('/api/auth/logout',{});}catch{}
        location.reload();
      },400);
    }
  }
  bind();
  return {user:()=>user,signedIn,initialSave,saveKey,queueSave,flush,open,refresh};
})();
