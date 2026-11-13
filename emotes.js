'use strict';
/**
 * Emotes (somente visual).
 * - Roda de emotes com os GIFs animados de assets/emotes/<id>.gif.
 * - Menu principal: botão discreto "Emotes" junto ao nome da classe; o emote aparece acima da cabeça do personagem do menu.
 * - Partida: botão "Emotes" na barra de atalhos, logo depois de "Progressão", no mesmo estilo dos outros botões.
 * - Tecla B abre/fecha a roda (no menu e na partida), a menos que B já esteja atribuída a outro atalho.
 * - O emote aparece acima da cabeça do personagem, sem cobrir o rosto (posição calculada pela mesma câmera do jogo).
 * - Online: o emote vai para a sala por uma mensagem curta do WebSocket ({t:'emote'}); o servidor só repassa para os
 *   outros jogadores (lista fechada de emotes, no máximo 1 a cada 0,8 s). Não entra na simulação nem no snapshot.
 */
const Emotes = (() => {
  const $ = id => document.getElementById(id);
  const DIR = 'assets/emotes/';
  const LIST = [
    ['amor', 'Amor'], ['exclamacao', 'Surpresa'], ['interrogacao', 'Dúvida'], ['ideia', 'Ideia'],
    ['gota', 'Suor'], ['grr', 'Raiva'], ['lala', 'Cantarolar'], ['heh', 'Risada'],
    ['reticencias', '...'], ['positivo', 'Positivo'], ['negativo', 'Negativo'],
  ];
  const DURATION = 2800;
  let opened = false, where = 'menu', timer = 0;

  /* ---------- roda ---------- */
  const wheel = document.createElement('div');
  wheel.id = 'emote-wheel'; wheel.className = 'emote-wheel'; wheel.hidden = true;
  wheel.setAttribute('role', 'dialog'); wheel.setAttribute('aria-label', 'Roda de emotes');
  const ring = document.createElement('div'); ring.className = 'emote-ring'; wheel.append(ring);
  const circle = i => { const a = -Math.PI / 2 + (i / LIST.length) * Math.PI * 2; return [Math.cos(a) * 112, Math.sin(a) * 112]; };
  const arc = i => { const a = Math.PI * (-1.08 + (i / (LIST.length - 1)) * 1.16); return [Math.cos(a) * 128, Math.sin(a) * 118]; };
  function layout(kind) {
    ring.querySelectorAll('.emote-option').forEach((b, i) => { const [x, y] = (kind === 'arc' ? arc : circle)(i);
      b.style.setProperty('--x', x.toFixed(1) + 'px'); b.style.setProperty('--y', y.toFixed(1) + 'px'); });
  }
  LIST.forEach(([id, label], i) => {
    const a = -Math.PI / 2 + (i / LIST.length) * Math.PI * 2;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'emote-option'; b.title = label; b.setAttribute('aria-label', label);
    b.style.setProperty('--x', (Math.cos(a) * 112).toFixed(1) + 'px');
    b.style.setProperty('--y', (Math.sin(a) * 112).toFixed(1) + 'px');
    const img = document.createElement('img'); img.src = DIR + id + '.gif'; img.alt = ''; img.decoding = 'async';
    img.onerror = () => { img.remove(); b.classList.add('missing'); };
    const cap = document.createElement('span'); cap.textContent = label;
    b.append(img, cap);
    b.addEventListener('click', () => { show(id); toggle(false); });
    ring.append(b);
  });
  const hint = document.createElement('p'); hint.className = 'emote-hint'; hint.innerHTML = 'Emotes <kbd>B</kbd>';
  const close = document.createElement('button'); close.type = 'button'; close.className = 'emote-close'; close.textContent = '✕'; close.setAttribute('aria-label', 'Fechar emotes');
  close.addEventListener('click', () => toggle(false));
  ring.append(hint, close);
  document.body.append(wheel);

  /* ---------- balões acima da cabeça (o seu e, no online, os dos aliados) ---------- */
  const bubbles = new Map();   // dono ('self' ou id do membro da sala) -> { el, until }
  const inArena = () => { const a = $('arena'); return !!a && !a.hidden; };
  const spriteTop = id => { const d = typeof roSpriteData !== 'undefined' && id ? roSpriteData[id] : null; return d && Number.isFinite(d.oy) ? d.oy : 92; };
  function headPoint(owner) {
    if (inArena()) {
      const field = $('field'); if (!field || typeof run === 'undefined' || !run) return null;
      const r = field.getBoundingClientRect();
      let b; try { b = view(); } catch { return null; }          // mesma câmera do jogo (só leitura)
      let x, y, id, k = .92;
      if (owner === 'self') { x = run.player.x; y = run.player.y; id = run.player.id ?? run.id; }
      else {
        const m = (run.party || []).find(p => p.id === owner);
        if (!m || !m.input || m.input.arena !== run.inMvp) return null;
        x = m.input.x; y = m.input.y; id = m.profile?.job; k = .90;
      }
      const sx = r.left + (x - b.left) * b.scale, sy = r.top + (y - b.top) * b.vertical;
      if (sx < r.left - 40 || sx > r.right + 40 || sy < r.top - 40 || sy > r.bottom + 120) return null;
      return { x: sx, y: sy - spriteTop(id) * k * b.scale - 4 };
    }
    if (owner !== 'self' || typeof MenuHome === 'undefined') return null;
    const st = MenuHome.state(), c = $('menu-home-canvas'); if (!st?.feet || !c || !c.offsetParent) return null;
    const r = c.getBoundingClientRect();
    let id = null; try { id = selectedJob().id; } catch {}
    return { x: r.left + st.feet.x, y: r.top + st.feet.y - spriteTop(id) * st.feet.scale - 6 };
  }
  let raf = 0;
  function frame() {
    raf = 0;
    const now = performance.now();
    for (const [owner, b] of bubbles) {
      const p = now < b.until ? headPoint(owner) : null;
      if (!p) { if (now >= b.until) { b.el.remove(); bubbles.delete(owner); } else b.el.style.opacity = '0'; continue; }
      b.el.style.opacity = '';
      b.el.style.transform = 'translate(' + Math.round(p.x + scrollX) + 'px,' + Math.round(p.y + scrollY) + 'px) translate(-50%,-100%)';
    }
    if (bubbles.size) raf = requestAnimationFrame(frame);
  }
  function bubbleFor(owner, id) {
    if (!LIST.some(e => e[0] === id)) return;
    let b = bubbles.get(owner);
    if (!b) {
      const el = document.createElement('div'); el.className = 'emote-bubble visible'; el.setAttribute('aria-hidden', 'true');
      el.append(Object.assign(document.createElement('img'), { alt: '' }));
      document.body.append(el); b = { el, until: 0 }; bubbles.set(owner, b);
    }
    b.el.firstChild.src = DIR + id + '.gif?t=' + Date.now();   // reinicia a animação do GIF
    b.until = performance.now() + DURATION;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  let lastSend = 0;
  function show(id) {
    bubbleFor('self', id);
    // online: avisa a sala (o servidor repassa para os outros jogadores; não mexe na simulação)
    if (inArena() && typeof run !== 'undefined' && run?.coop && typeof Coop !== 'undefined' && Coop.sendEmote) {
      const now = performance.now(); if (now - lastSend >= 800) { lastSend = now; Coop.sendEmote(id); }
    }
  }
  function showRemote(owner, id) { if (owner != null && inArena()) bubbleFor(String(owner), id); }

  /* ---------- abrir / fechar ---------- */
  function toggle(force, origin) {
    if (origin) where = origin;
    opened = typeof force === 'boolean' ? force : !opened;
    wheel.hidden = !opened;
    wheel.dataset.where = where;
    // no menu, a roda abre em volta do personagem; na partida, no centro do campo (onde a câmera deixa o jogador)
    ring.style.position = ''; ring.style.left = ''; ring.style.top = '';
    wheel.classList.remove('arc'); layout('circle');
    if (opened && where === 'menu') {
      const p = headPoint('self');
      if (p) { // arco acima da cabeça do personagem do menu, deixando o corpo à vista
        const R = 150, x = Math.max(R + 6, Math.min(innerWidth - R - 6, p.x)), y = Math.max(R + 6, Math.min(innerHeight - R - 6, p.y + 10));
        ring.style.position = 'fixed'; ring.style.left = (x - R) + 'px'; ring.style.top = (y - R) + 'px';
        wheel.classList.add('arc'); layout('arc');
      }
    }
    for (const id of ['mh-emote-open', 'run-emotes']) $(id)?.setAttribute('aria-expanded', String(opened));
    if (opened) wheel.querySelector('.emote-option')?.focus({ preventScroll: true });
  }

  // botão discreto no menu principal (ao lado do nome da classe)
  const tag = $('mh-hero-tag');
  if (tag) {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'mh-emote-open'; b.className = 'mh-emote-open'; b.title = 'Emotes · B';
    b.setAttribute('aria-label', 'Abrir emotes (B)'); b.setAttribute('aria-expanded', 'false');
    const img = document.createElement('img'); img.src = DIR + 'icone-emotes.png'; img.alt = ''; img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'), { textContent: '☺' })); };
    b.append(img, Object.assign(document.createElement('span'), { textContent: 'Emotes' }));
    b.addEventListener('click', () => toggle(undefined, 'menu'));
    tag.append(b);
  }
  // botão na barra de atalhos da partida, logo depois de Progressão, com a mesma estrutura dos outros
  function addRunButton() {
    if ($('run-emotes')) return true;
    const bar = document.querySelector('.ro-toolbar-buttons'); if (!bar) return false;
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'run-emotes'; b.className = 'sound'; b.dataset.label = 'Emotes'; b.dataset.key = 'B';
    b.title = 'Emotes · B'; b.setAttribute('aria-label', 'Abrir roda de emotes (B)'); b.setAttribute('aria-expanded', 'false');
    const img = document.createElement('img'); img.src = DIR + 'icone-emotes.png'; img.alt = ''; img.onerror = () => { img.src = 'assets/ro/skill-blessing.png'; };
    const span = document.createElement('span'); span.textContent = 'Emotes';
    const kbd = document.createElement('kbd'); kbd.textContent = 'B';
    b.append(img, span, kbd);
    b.addEventListener('click', () => toggle(undefined, 'arena'));
    const prog = $('run-progression');
    if (prog) prog.after(b); else bar.append(b);
    return true;
  }
  if (!addRunButton()) document.addEventListener('DOMContentLoaded', addRunButton);
  // se a barra for reconstruída, o botão volta para o lugar certo
  setTimeout(() => { const prog = $('run-progression'), btn = $('run-emotes'); if (prog && btn && prog.nextElementSibling !== btn) prog.after(btn); }, 0);

  const bReserved = () => { try { return Object.values(JSON.parse(localStorage.getItem('midgard-controls-v10') || '{}')).includes('b'); } catch { return false; } };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && opened) { toggle(false); e.stopPropagation(); return; }
    if (e.key.toLowerCase() !== 'b' || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = document.activeElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable) return;
    if (document.querySelector('dialog[open]') || bReserved()) return;
    if (inArena()) toggle(undefined, 'arena');
    else if (typeof mode !== 'undefined' && mode === 'menu') toggle(undefined, 'menu');
  });
  document.addEventListener('pointerdown', e => {
    if (opened && !wheel.contains(e.target) && !e.target.closest('#mh-emote-open,#run-emotes')) toggle(false);
  });
  return { show, showRemote, toggle, list: LIST.map(e => e[0]) };
})();
