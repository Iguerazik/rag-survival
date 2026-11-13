'use strict';
/**
 * RAG SURVIVAL — Menu principal na praça de Prontera (somente visual).
 *
 * - Fundo: assets/menu/prontera-praca.webp (cena limpa, sem personagem, HUD, botões ou textos pintados).
 * - O personagem é o sprite REAL da classe selecionada, desenhado com Art.draw (o mesmo pipeline do jogo),
 *   no quadro de idle que o jogo usa (ação 0, quadro 0, virado para a câmera). Sem balanço, giro ou
 *   deformação artificial e sem arma sobreposta.
 * - Os pés ficam ancorados num ponto fixo da praça da imagem (FEET) e a escala acompanha a da imagem,
 *   para o personagem ficar no mesmo plano dos NPCs pintados.
 * - Todos os botões chamam as funções que o menu já tinha (os botões antigos continuam no DOM).
 * - Não altera nenhuma regra de jogo: só lê seleção, jornada, equipamento e Zeny para exibir.
 */
const MenuHome = (() => {
  const $ = id => document.getElementById(id);
  const stage = $('menu-home');
  if (!stage) return { refresh() {} };
  const canvas = $('menu-home-canvas');
  const ctx = canvas.getContext('2d');

  // Coordenadas na imagem de fundo (1300 × 724).
  const IMG_W = 1300, IMG_H = 724;
  const FEET = { x: 836, y: 640 };     // centro da praça, onde ficava o personagem da referência
  const SPRITE_SCALE = 1.9;            // escala do sprite em pixels da imagem (≈ altura dos NPCs na praça)
  const bg = new Image();
  bg.decoding = 'async';
  bg.src = 'assets/menu/prontera-praca.webp?v=1';

  let width = 0, height = 0, dpr = 1, drawn = '', raf = 0;
  const visible = () => !document.hidden && typeof mode !== 'undefined' && mode === 'menu' && stage.offsetParent !== null;

  /** Encaixe da imagem: no computador a praça ocupa a área à esquerda do painel (a borda direita da imagem
   *  encosta no painel, como na referência); no celular, "cover" centralizado no personagem. */
  function fit() {
    if (width < 820) {
      const s = Math.max(width / IMG_W, height / IMG_H);
      const ox = Math.min(0, Math.max(width - IMG_W * s, width / 2 - FEET.x * s));
      return { s, ox, oy: (height - IMG_H * s) * .5, sceneW: width };
    }
    const panel = document.querySelector('#menu-home .mh-panel');
    const sceneW = Math.max(320, width - (panel ? panel.getBoundingClientRect().width + 20 : 0));
    const s = Math.max(sceneW / IMG_W, height / IMG_H);
    // se ainda sobrar imagem dos lados, corta mais da direita do que da esquerda (a loja da NPC fica à vista)
    // corta mais do céu que do chão: os pés do personagem ficam sempre à vista, com espaço para o nome da classe
    const oy = Math.min((height - IMG_H * s) * .5, height - 74 - FEET.y * s);
    return { s, ox: (sceneW - IMG_W * s) * .3, oy: Math.min(0, oy), sceneW };
  }
  function heroInfo() {
    try { const job = selectedJob(); return { id: job.id, job, journey: journeyOf(selected) }; } catch { return null; }
  }
  function draw() {
    raf = 0;
    if (!visible()) return;
    const box = canvas.getBoundingClientRect();
    const w = Math.max(280, Math.round(box.width)), h = Math.max(200, Math.round(box.height));
    const d = Math.min(2, window.devicePixelRatio || 1);
    const info = heroInfo();
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const key = [w, h, d, info?.id, bg.complete && bg.naturalWidth, theme, typeof roSpriteData !== 'undefined'].join('|');
    if (key === drawn) return;
    drawn = key;
    if (w !== width || h !== height || d !== dpr) { width = w; height = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const { s, ox, oy, sceneW } = fit();
    if (bg.complete && bg.naturalWidth) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      if (sceneW < width) { // atrás do painel: continuação desfocada da borda da praça (o painel cobre esta faixa)
        ctx.save(); ctx.filter = 'blur(10px) brightness(.55)';
        ctx.drawImage(bg, IMG_W - 140, 0, 140, IMG_H, sceneW - 30, oy, width - sceneW + 60, IMG_H * s);
        ctx.restore();
      }
      ctx.drawImage(bg, ox, oy, IMG_W * s, IMG_H * s);
    }
    if (theme === 'dark') { ctx.fillStyle = 'rgba(14,20,48,.34)'; ctx.fillRect(0, 0, width, height); }
    // Personagem: sprite real, pés no chão da praça.
    if (info && typeof roSpriteData !== 'undefined' && roSpriteData[info.id] && typeof Art !== 'undefined') {
      const fx = ox + FEET.x * s, fy = oy + FEET.y * s, k = SPRITE_SCALE * s;
      // sombra de contato (mesma ideia da sombra do jogo)
      ctx.fillStyle = 'rgba(40,26,14,.32)';
      ctx.beginPath(); ctx.ellipse(fx, fy, 15 * k, 4.6 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      Art.draw(ctx, info.id, 0, 0, fx, fy, k);   // ação 0 = parado, virado para a câmera; quadro 0 = idle do jogo
      ctx.restore();
      placeTag(fx, fy, k);
    }
  }
  /** Posiciona o nome da classe (com setas e Emotes, se houver) logo abaixo dos pés. */
  function placeTag(fx, fy, k) {
    const tag = $('mh-hero-tag'); if (!tag) return;
    if (width < 820) { tag.style.left = fx + 'px'; tag.style.top = Math.min(height - 36, fy + 14) + 'px'; return; }
    tag.style.left = fx + 'px';
    tag.style.top = Math.min(height - 40, fy + 18) + 'px';
  }
  function kick() { if (!raf) raf = requestAnimationFrame(draw); }

  /* ---------- cartão do personagem (dados reais) ---------- */
  function text(id, value) { const el = $(id); if (el && el.textContent !== value) el.textContent = value; }
  function itemLabel(uid) {
    const item = uid ? itemByUid(uid) : null; if (!item) return null;
    return (item.refine ? '+' + item.refine + ' ' : '') + (itemDb[item.id]?.name || item.id);
  }
  function meter(id, value) { const el = $(id); if (el) { const v = Math.max(0, Math.min(1, value || 0)); el.style.width = (v * 100).toFixed(1) + '%'; el.parentElement.title = Math.round(v * 100) + '%'; } }
  let server = null;
  async function probe() {
    try { const h = await (await fetch('/api/health', { cache: 'no-store' })).json(); server = { ok: !!h.ok, players: h.players || 0 }; }
    catch { server = { ok: false }; }
    refresh();
  }
  function refresh() {
    const info = heroInfo(); if (!info) return;
    const p = info.journey, rule = stages[p.stage] || {};
    const user = window.MidgardAccount?.user?.();
    text('mh-name', user?.nickname || 'Visitante');
    text('mh-class', info.job.name);
    text('mh-stage', rule.name || '');
    text('mh-base', 'Nv. base ' + (p.base || 1));
    text('mh-job', 'Nv. classe ' + (p.job || 1));
    try {
      meter('mh-base-exp', p.base >= rule.baseCap ? 1 : p.baseXp / levelCost(p.base));
      meter('mh-job-exp', p.job >= rule.jobCap ? 1 : p.jobXp / levelCost(p.job, true));
    } catch {}
    const weapon = itemLabel(p.gear?.weapon), armor = itemLabel(p.gear?.armor);
    text('mh-gear', [weapon, armor].filter(Boolean).join(' · ') || 'Sem equipamento');
    const gear = $('mh-gear'); if (gear) gear.title = 'Arma: ' + (weapon || '—') + '\nArmadura: ' + (armor || '—');
    text('mh-zeny', (saved.zeny || 0).toLocaleString('pt-BR') + ' z');
    const online = $('mh-online');
    if (online) {
      online.dataset.state = user && server?.ok ? 'on' : server?.ok === false ? 'off' : 'guest';
      text('mh-online-text', (user ? 'Conta conectada' : 'Visitante') + ' · ' + (server ? (server.ok ? 'servidor online' : 'servidor indisponível') : 'verificando…'));
      online.title = user ? 'Progresso salvo no servidor.' : 'Sem conta o progresso fica só neste navegador.';
    }
    text('mh-hero-name', info.job.name);
    kick();
  }
  function cycleClass(step) {
    const list = Object.keys(jobLines), i = list.indexOf(selected);
    try { selectClass(list[(i + step + list.length) % list.length]); } catch {}
    refresh();
  }

  /* ---------- botões: sempre as ações reais que o menu já tinha ---------- */
  const click = id => () => $(id)?.click();
  const scrollTo = id => () => $(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  function openOnline() {
    const hub = $('online-hub'); if (!hub) return;
    hub.classList.add('is-open');
    const panel = $('coop-panel'); if (panel?.hidden) $('coop-toggle')?.click();
    hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function dialog(id) { const d = $(id); if (d) d.showModal ? d.showModal() : d.setAttribute('open', ''); }
  const actions = {
    'mh-play': scrollTo('match-prep'),
    'mh-solo': click('start'),
    'mh-online-btn': openOnline,
    'mh-character': click('nav-status'),
    'mh-equipment': click('nav-equipment'),
    'mh-inventory': click('nav-inventory'),
    'mh-cards': click('nav-cards'),
    'mh-forge': () => { try { inventoryCategory = 'services'; } catch {} openInventory(); },
    'mh-bestiary': click('nav-bestiary'),
    'mh-progress': click('nav-progression'),
    'mh-codex': click('nav-codex'),
    'mh-settings': click('nav-settings'),
    'mh-help': click('online-help-open'),
    'mh-updates': () => dialog('updates-dialog'),
    'mh-credits': () => dialog('credits-dialog'),
    'mh-prev': () => cycleClass(-1),
    'mh-next': () => cycleClass(1),
  };
  for (const [id, fn] of Object.entries(actions)) $(id)?.addEventListener('click', fn);
  for (const id of ['credits-dialog', 'updates-dialog']) $(id)?.querySelector('[data-close]')?.addEventListener('click', () => $(id).close());
  // O lobby online fica recolhido até pedir Multiplayer (ou se já estiver numa sala).
  for (const id of ['nav-online', 'coop-toggle']) $(id)?.addEventListener('click', () => $('online-hub')?.classList.add('is-open'));
  const room = $('coop-room');
  if (room) new MutationObserver(() => { if (!room.hidden) $('online-hub')?.classList.add('is-open'); }).observe(room, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(kick).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  $('classes')?.addEventListener('click', () => setTimeout(refresh, 0));
  bg.addEventListener('load', kick);
  window.addEventListener('resize', kick);
  document.addEventListener('visibilitychange', kick);
  setInterval(() => { if (visible()) refresh(); }, 1500);   // pega trocas feitas em outras janelas (evolução, equipamento)
  setInterval(() => { if (visible()) probe(); }, 30000);
  (typeof Art !== 'undefined' ? Art.ready() : Promise.resolve()).catch(() => {}).finally(() => { drawn = ''; refresh(); });
  probe();
  return { refresh, redraw: () => { drawn = ''; kick(); }, state: () => ({ width, height, hero: heroInfo()?.id, bg: bg.complete && bg.naturalWidth > 0, feet: (() => { const f = fit(); return { x: Math.round(f.ox + FEET.x * f.s), y: Math.round(f.oy + FEET.y * f.s), scale: +(SPRITE_SCALE * f.s).toFixed(2) }; })() }) };
})();
