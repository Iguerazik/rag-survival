'use strict';

const Coop = (() => {
  const el = id => document.getElementById(id);
  // HTTPS na internet; HTTP permitido apenas para localhost e redes locais de teste.
  const privateHost = /^(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname);
  const protocol = location.protocol === 'https:' || (location.protocol === 'http:' && privateHost);
  let session;
  let busy = false;
  let pending = false;
  let lastSuccess = 0;
  let nextPoll;
  let members = [];
  let roomConfig = null;
  let ready = false;
  let syncConfig = false;
  let hostId = null;
  // V22.1: WebSocket (o servidor empurra o mundo ~20x/s). O HTTP fica como reserva automática.
  let socket = null, socketLive = 0, socketRetry = 0, socketTimer = 0, inputTimer = 0, pingTimer = 0, wsRtt = 0;
  const socketOk = () => socket && socket.readyState === 1 && performance.now() - socketLive < 1600;

  async function api(path, data) {
    const response = await fetch('/api/coop/rooms' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || 'O serviço de salas está indisponível.');
      error.status = response.status;
      throw error;
    }
    return result;
  }
  const profile = () => ({ job: selected, classId:selectedJob().id, name: window.MidgardAccount?.user()?.nickname || 'Aventureiro' });
  const currentConfig = () => ({ map: selectedMap, difficulty: selectedDifficulty });
  const canPlay = () => !roomConfig || journeyMode !== 'career' ||
    (Campaign.mapUnlocked(saved, selected, roomConfig.map) && Campaign.difficultyUnlocked(saved, selected, roomConfig.difficulty));
  function allowedText() {
    return canPlay() ? '' : 'Você precisa desbloquear esse mapa e essa dificuldade com a linhagem escolhida antes de confirmar.';
  }
  const status = message => { el('coop-status').textContent = message; };
  const isHost = () => !!session && (hostId ? hostId === session.id : session.host);
  function sessionUi() {
    if (session) session.host = isHost();
    el('coop-setup').hidden = !!session;
    el('coop-panel').classList.toggle('in-room',!!session);
    el('coop-room').hidden = !session;
    el('start').hidden = !!session;
    el('coop-room-code').textContent = session ? 'Sala ' + session.code : '';
    el('coop-start').hidden = !session?.host;
    el('coop-start').disabled = members.length < 2 || !assetsReady || !members.every(m=>m.ready);
    el('coop-ready').hidden = !session || session.host;
    el('coop-ready').textContent = ready ? 'Cancelar pronto' : 'Estou pronto';
    el('coop-ready').disabled = !canPlay();
    el('coop-lobby-map').textContent = roomConfig ?
      (expeditions[roomConfig.map]?.name || roomConfig.map) + ' · ' + (RunDifficulty.get(roomConfig.difficulty)?.name || roomConfig.difficulty) : 'Sincronizando escolha da equipe…';
    el('coop-lobby-warning').textContent = allowedText();
    const list = members.map(member => {
      const item = document.createElement('li');
      item.textContent = member.profile.name + ' · ' + (jobs[member.profile.classId||member.profile.job]?.name || 'Aventureiro') +
        (member.id === session?.id ? ' (você)' : '') + (member.id === hostId ? ' · líder' : '') +
        (member.ready ? ' · ✓ pronto' : ' · aguardando');
      return item;
    });
    for(let i=list.length;i<6;i++){const empty=document.createElement('li');empty.className='online-empty-slot';empty.textContent='✧ Vaga '+(i+1)+' · aguardando aventureiro';list.push(empty);}
    el('coop-members').replaceChildren(...list);
  }
  function schedule(delay) {
    clearTimeout(nextPoll);
    if (session) nextPoll = setTimeout(poll, delay);
  }
  async function connect(code) {
    if (session || busy) return;
    if(!window.MidgardAccount?.signedIn()){status('Entre na sua conta para jogar online.');window.MidgardAccount?.open();return;}
    if (window.MIDGARD_OFFLINE || !protocol) {
      status('Para jogar online, abra a versão de navegador.');
      return;
    }
    busy = true;
    status(code ? 'Entrando na sala…' : 'Criando sala…');
    try {
      const result = await api(code ? '/' + code + '/join' : '', { profile: profile(), config:currentConfig() });
      session = { ...result, host: !code };
      lastSuccess = Date.now();
      members = [{ id: session.id, profile: profile(), ready:!code }];
      roomConfig = currentConfig();ready = !code;
      sessionUi();
      status(session.host ? 'Compartilhe o convite e aguarde o grupo.' : 'Aguardando o anfitrião iniciar.');
      startTransport();
      schedule(0);
    } catch (error) {
      status(error.message || 'Sem conexão com o servidor.');
    } finally { busy = false; }
  }
  function handle(current, response, rtt) {
      const active = !!run?.coop;
      if(response.world && active)response.world.net={rtt};
      if (session !== current) return;
      lastSuccess = Date.now();
      members = response.members || members;
      roomConfig = response.config || roomConfig;
      hostId = response.hostId || hostId;
      ready = !!members.find(m=>m.id===current.id)?.ready;
      if(!active && isHost() && response.phase==='lobby' && !syncConfig) {
        const config=currentConfig();
        if(config.map!==roomConfig?.map || config.difficulty!==roomConfig?.difficulty){
          syncConfig=true;
          api('/'+current.code+'/settings',{token:current.token,config}).then(result=>{roomConfig=result.config;members=result.members;sessionUi();})
            .catch(err=>status(err.message)).finally(()=>{syncConfig=false;});
        }
      }
      if (!active && !isHost() && response.world && response.phase === 'playing' && response.world.phase === 'play' && assetsReady) {
        const slot = Math.max(1, members.findIndex(member => member.id === current.id));
        if(!canPlay()){status(allowedText()); return;}
        selectedDifficulty = roomConfig?.difficulty || selectedDifficulty;
        start(true, slot, roomConfig?.map || response.world.map);
      }
      // Líder escolheu o próximo mapa (ou nova tentativa): todos recomeçam juntos no mundo novo.
      if (run?.coop && response.phase === 'playing' && response.world?.id && run.worldId && response.world.id !== run.worldId && assetsReady) {
        const slot = Math.max(0, members.findIndex(member => member.id === current.id));
        selectedDifficulty = response.config?.difficulty || selectedDifficulty;
        start(true, slot, response.config?.map || response.world.map);
      }
      if (run?.coop) {
        const views = response.world?.players;
        run.party = members.filter(member => member.id !== current.id)
          .map(member => views?.[member.id] ? { ...member, input: views[member.id] } : member).filter(member => member.input);
        if(response.world)receiveWorld(response.world);
        el('ping-text').textContent = run.hostPaused ? 'Partida pausada pelo anfitrião' :
          'Sala ' + current.code + ' · ' + (run.party.length + 1) + ' jogadores · '+Math.round(rtt)+' ms' + (socketOk() ? '' : ' · HTTP');
      } else sessionUi();
  }
  function openSocket() {
    const current = session;
    if (!current || typeof WebSocket === 'undefined' || (socket && socket.readyState <= 1)) return;
    clearTimeout(socketTimer);
    let ws;
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/coop/ws'); }
    catch { return; }
    socket = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ t: 'hello', code: current.code, token: current.token, eventSeq: run?.coop ? (run.authorityEventSeq || 0) : 0 }));
    };
    ws.onmessage = event => {
      if (session !== current || socket !== ws) return;
      let msg; try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.t === 'pong') { wsRtt = Math.min(1400, Math.max(0, performance.now() - msg.c)); return; }
      if (msg.t === 'error') {
        status(msg.error || 'Conexão com a sala encerrada.');
        if ([401, 404].includes(msg.status)) { const active = !!run?.coop; leave(false); if (active) menu(); status('Conexão com a sala encerrada.'); }
        return;
      }
      if (msg.t !== 's') return;
      socketLive = performance.now(); socketRetry = 0;
      try { handle(current, msg, wsRtt || run?.netRtt || 0); } catch (error) { console.error('[Midgard] snapshot', error); }
    };
    ws.onclose = () => {
      if (socket === ws) socket = null;
      if (session === current) socketTimer = setTimeout(openSocket, Math.min(5000, 600 * 2 ** socketRetry++));
    };
    ws.onerror = () => {};
  }
  function sendInput() {
    if (!session || !socketOk()) return;
    try {
      if (run?.coop && mode !== 'ended') socket.send(JSON.stringify({ t: 'in', input: packPlayer() }));
    } catch {}
  }
  function sendPing() { if (socket && socket.readyState === 1) try { socket.send(JSON.stringify({ t: 'ping', c: performance.now() })); } catch {} }
  function closeSocket() {
    clearTimeout(socketTimer); clearInterval(inputTimer); clearInterval(pingTimer); inputTimer = pingTimer = 0;
    const ws = socket; socket = null; if (ws) try { ws.close(); } catch {}
  }
  async function poll() {
    const current = session;
    if (!current || pending) return;
    if (socketOk()) { lastSuccess = Date.now(); return; } // o WebSocket já está entregando tudo
    pending = true;
    const active = !!run?.coop;
    try {
      const sentAt=performance.now();
      const sample=active ? packPlayer() : undefined;
      const response = await api('/' + current.code + '/sync', {
        token: current.token, profile: active ? undefined : profile(),
        // Mundo e fase são controlados apenas pelo servidor (inclusive para o líder).
        input: sample,
      });
      const rtt=Math.min(1400,Math.max(0,performance.now()-sentAt));
      handle(current, response, rtt);
    } catch (error) {
      if (session !== current) return;
      status(error.message || 'Reconectando…');
      if (active) el('ping-text').textContent = 'Conexão instável · reconectando…';
      if ([401, 404, 410].includes(error.status) || Date.now() - lastSuccess > 22_000) {
        leave(false);
        if (active) menu();
        status('Conexão com a sala encerrada.');
      }
    } finally {
      pending = false;
      if (session) schedule(socketOk() ? 500 : run?.coop && mode !== 'ended' ? 45 : 950);
    }
  }
  function startTransport() {
    openSocket();
    clearInterval(inputTimer); clearInterval(pingTimer);
    inputTimer = setInterval(sendInput, 33);
    pingTimer = setInterval(sendPing, 2000);
  }
  function leave(notify = true) {
    const current = session;
    if (!current) return;
    session = undefined;
    members = [];
    roomConfig = null; ready = false; hostId=null;
    clearTimeout(nextPoll); closeSocket();
    if (notify) api('/' + current.code + '/leave', { token: current.token }).catch(() => {});
    sessionUi();
    status('Você saiu da sala.');
  }
  // V23.6: salas abertas (no lobby, com vaga). Atualiza a cada 5 s enquanto o painel está visível e você não está numa sala.
  let openTimer = 0;
  async function refreshOpen() {
    const list = el('coop-open-list'); if (!list) return;
    clearTimeout(openTimer);
    if (session || el('coop-panel').hidden || document.hidden || mode !== 'menu') { openTimer = setTimeout(refreshOpen, 5000); return; }
    try {
      const response = await fetch('/api/coop/rooms', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Lista indisponível.');
      const rooms = Array.isArray(data.rooms) ? data.rooms : [];
      if (!rooms.length) { const li = document.createElement('li'); li.className = 'coop-open-empty'; li.textContent = 'Nenhuma sala aberta agora. Crie uma!'; list.replaceChildren(li); }
      else list.replaceChildren(...rooms.map(room => {
        const li = document.createElement('li');
        const info = document.createElement('span');
        info.textContent = room.host + ' · ' + (expeditions[room.map]?.name || room.map) + ' · ' + (RunDifficulty.get(room.difficulty)?.name || room.difficulty) + ' · ' + room.players + '/' + room.capacity;
        const join = document.createElement('button'); join.type = 'button'; join.className = 'sound'; join.textContent = 'Entrar';
        join.addEventListener('click', () => { el('coop-code').value = room.code; connect(room.code); });
        li.append(info, join); return li;
      }));
    } catch (error) {
      const li = document.createElement('li'); li.className = 'coop-open-empty';
      li.textContent = /login/i.test(error.message) ? 'Entre na sua conta para ver as salas abertas.' : 'Não foi possível carregar as salas.';
      list.replaceChildren(li);
    }
    openTimer = setTimeout(refreshOpen, 5000);
  }
  function init() {
    const account=window.MidgardAccount?.user();if(account)el('coop-name').value=account.nickname;
    el('coop-toggle').addEventListener('click', () => {
      const panel = el('coop-panel');panel.hidden=false;
      el('coop-toggle').setAttribute('aria-expanded','true');
      panel.scrollIntoView({behavior:'smooth',block:'center'});
      (session ? el('coop-copy') : el('coop-code')).focus({preventScroll:true});
    });
    el('coop-create').addEventListener('click', () => connect());
    el('coop-open-refresh')?.addEventListener('click', refreshOpen);
    refreshOpen();
    el('coop-join').addEventListener('submit', event => {
      event.preventDefault();
      const code = el('coop-code').value.trim().toUpperCase();
      if (!/^[A-Z2-9]{6}$/.test(code)) { status('Digite o código de seis caracteres.'); return; }
      connect(code);
    });
    el('coop-ready').addEventListener('click',async()=>{
      if(!session || session.host || !canPlay())return;
      el('coop-ready').disabled=true;
      try{
        const response=await api('/'+session.code+'/ready',{token:session.token,ready:!ready});
        ready=!!response.members.find(m=>m.id===session.id)?.ready;
        members=response.members; sessionUi();
      }catch(error){status(error.message);el('coop-ready').disabled=false}
    });
    el('coop-start').addEventListener('click', async () => {
      if (!session?.host || members.length<2 || !assetsReady || !members.every(m=>m.ready))return;
      el('coop-start').disabled = true;
      try {
        // Persist the host's final map/difficulty before freezing the lobby.
        const result=await api('/'+session.code+'/settings',{token:session.token,config:currentConfig()});
        roomConfig=result.config;members=result.members;sessionUi();
        if(!members.every(m=>m.ready)){
          status('Mapa ou dificuldade alterados: os convidados devem confirmar novamente.');return;
        }
        await api('/'+session.code+'/start',{token:session.token});
        start(true,0,roomConfig.map);schedule(0);
      }catch(error){status(error.message)}finally{if(session)sessionUi()}
    });
    el('coop-copy').addEventListener('click', async () => {
      const invite = new URL(location.pathname, location.origin);
      invite.searchParams.set('sala', session.code);
      try { await navigator.clipboard.writeText(invite.href); status('Convite copiado.'); }
      catch { status('Compartilhe o código ' + session.code + '.'); }
    });
    el('coop-leave').addEventListener('click', () => leave());
    const invite = new URL(location.href).searchParams.get('sala')?.toUpperCase();
    if (/^[A-Z2-9]{6}$/.test(invite ?? '')) {
      el('coop-toggle').click();
      el('coop-code').value = invite;
      status('Convite para a sala ' + invite + '. Escolha a classe e clique em Entrar.');
    }
    window.addEventListener('pagehide', () => {
      if (session) navigator.sendBeacon('/api/coop/rooms/' + session.code + '/leave', JSON.stringify({ token: session.token }));
    });
    // Re-render the lobby when a class or expedition selection changes.
    for(const node of ['classes','expedition-options','difficulty']) el(node)?.addEventListener('change',()=>{if(session)sessionUi()});
    if (window.MIDGARD_OFFLINE) {
      el('coop-toggle').hidden = true;
      el('coop-panel').hidden=true;
    }
  }
  /** Fim de partida: volta para o lobby SEM desfazer a sala (todos continuam nela para a próxima). */
  function lobby() {
    const current = session;
    if (!current) return;
    ready = current.id === hostId;
    api('/' + current.code + '/lobby', { token: current.token })
      .then(result => { if (session !== current) return; members = result.members || members; roomConfig = result.config || roomConfig; hostId = result.hostId || hostId; sessionUi(); })
      .catch(() => {});
    const panel = el('coop-panel'); panel.hidden = false; el('coop-toggle').setAttribute('aria-expanded', 'true');
    sessionUi();
    status(isHost() ? 'Sala mantida. Escolha o mapa e inicie quando todos estiverem prontos.' : 'Sala mantida. Clique em "Estou pronto" para a próxima partida.');
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    schedule(200);
  }
  async function next(modeName) {
    if (!session || !isHost()) return;
    await api('/' + session.code + '/next', { token: session.token, mode: modeName });
  }
  return { init, leave, lobby, next, refresh: sessionUi, id: () => session?.id, host: isHost, config:()=>roomConfig, transport: () => socketOk() ? 'websocket' : 'http' };
})();
