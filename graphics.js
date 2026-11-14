'use strict';
/* V27 — Qualidade gráfica e resolução adaptativa.
 * O que mais pesa em PC fraco é a quantidade de pixels do campo de batalha redesenhada a cada quadro.
 * Modos:  auto (padrão) · alta · leve.
 *  - alta: resolução cheia (até 1,6× em telas de alta densidade), todos os brilhos.
 *  - leve: resolução 1× (ou menos em telas grandes), sem vinheta nem brilhos extras.
 *  - auto: começa na alta e, se a partida cair abaixo de ~40 FPS por 2 s, desce um degrau
 *    (1,6× → 1,25× → 1× + efeitos leves → 0,8×). Depois de 30 s lisos tenta subir um degrau;
 *    se cair de novo, aquele degrau fica bloqueado até recarregar a página (sem ficar oscilando).
 * Só mexe no DESENHO: a simulação (60 TPS no servidor, 20 passos/s no solo) não muda.
 */
const Graphics = (() => {
  const KEY = 'rag-graphics-v27';
  const LEVELS = [
    { ratio: 1.6, light: false },
    { ratio: 1.25, light: false },
    { ratio: 1, light: true },
    { ratio: .8, light: true },
  ];
  let prefs = { mode: 'auto', fps: false };
  try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if (['auto', 'high', 'low'].includes(saved.mode)) prefs.mode = saved.mode; prefs.fps = !!saved.fps; } catch {}
  let level = prefs.mode === 'low' ? 2 : 0, ceiling = 0, changedAt = 0, onChange = null;
  let windowStart = 0, frames = 0, sum = 0, slow = 0, fpsShown = 0, fpsEl = null, lastShow = 0;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} }
  function dpr() { return Math.max(1, window.devicePixelRatio || 1); }
  /** Pixels por unidade CSS do campo de batalha. */
  function ratio() {
    const cap = LEVELS[prefs.mode === 'high' ? 0 : level].ratio;
    if (prefs.mode === 'low') return Math.min(dpr(), innerWidth * innerHeight > 2200000 ? .8 : 1);
    return Math.min(dpr(), cap) || 1;
  }
  /** Efeitos leves: sem vinheta, sem brilhos radiais extras, sombra do portal desligada. */
  function light() { return prefs.mode === 'low' || (prefs.mode === 'auto' && LEVELS[level].light); }
  /** <html class="gfx-light">: o CSS tira o desfoque atrás das janelas (caro sobre o campo que se move). */
  function mark() { try { document.documentElement.classList.toggle('gfx-light', light()); } catch {} }
  function apply(next, now) {
    if (next === level) return;
    level = next; changedAt = now; windowStart = 0; mark();
    try { onChange?.(); } catch {}
  }
  /** Chamado a cada quadro de partida com o intervalo entre quadros (ms). */
  function frame(ms, now, playing) {
    if (prefs.fps && playing) { if (fpsEl) fpsEl.hidden = false; showFps(ms, now); } else if (fpsEl && !fpsEl.hidden) fpsEl.hidden = true;
    if (prefs.mode !== 'auto' || !playing || !(ms > 0)) { windowStart = 0; return; }
    if (ms > 250) { windowStart = 0; return; } // aba escondida / travada pontual: não conta
    if (!windowStart) { windowStart = now; frames = 0; sum = 0; slow = 0; return; }
    frames++; sum += ms; if (ms > 26) slow++;
    if (now - windowStart < 2000) return;
    const avg = sum / Math.max(1, frames), slowShare = slow / Math.max(1, frames);
    windowStart = now; frames = 0; sum = 0; slow = 0;
    if ((avg > 24 || slowShare > .35) && level < LEVELS.length - 1 && now - changedAt > 1500) {
      // caiu: desce um degrau; se tinha acabado de subir, este degrau vira o teto
      if (now - changedAt < 32000 && changedAt) ceiling = Math.max(ceiling, level + 1);
      apply(level + 1, now);
    } else if (avg < 18.5 && slowShare < .05 && level > ceiling && now - changedAt > 30000) apply(level - 1, now);
  }
  function showFps(ms, now) {
    if (!fpsEl) { fpsEl = document.createElement('div'); fpsEl.id = 'fps-meter'; fpsEl.setAttribute('aria-hidden', 'true'); document.body.append(fpsEl); }
    fpsShown = fpsShown ? fpsShown * .9 + ms * .1 : ms;
    if (now - lastShow < 500) return;
    lastShow = now;
    const label = prefs.mode === 'auto' ? 'Auto ' + (Math.round(ratio() * 100) / 100) + '×' : prefs.mode === 'high' ? 'Alta' : 'Leve';
    fpsEl.textContent = Math.round(1000 / Math.max(1, fpsShown)) + ' FPS · ' + label;
  }
  function setMode(mode) {
    if (!['auto', 'high', 'low'].includes(mode)) return;
    prefs.mode = mode; save(); ceiling = 0; changedAt = 0;
    level = mode === 'low' ? 2 : 0; windowStart = 0; mark();
    try { onChange?.(); } catch {}
  }
  function setFps(on) { prefs.fps = !!on; save(); if (fpsEl) fpsEl.hidden = !on; }
  function hideFps(hidden) { if (fpsEl) fpsEl.hidden = hidden || !prefs.fps; }
  mark();
  return {
    ratio, light, frame, setMode, setFps, hideFps,
    mode: () => prefs.mode, fps: () => prefs.fps, level: () => level,
    onChange: fn => { onChange = fn; },
    _test: { force: (lv) => { level = lv; mark(); try { onChange?.(); } catch {} } },
  };
})();
