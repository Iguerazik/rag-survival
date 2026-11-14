'use strict';
/* V27 — Transições de cena.
 * Uma cortina escura que some sozinha (não bloqueia clique nem pausa nada) ao:
 *  - entrar numa expedição (com o nome do mapa e a dificuldade no centro, por 1,4 s);
 *  - voltar ao menu;
 *  - ser teleportado (fenda, arena do MVP, portal do labirinto, Asa de Mosca): piscada curta.
 * Usa só opacidade (barato para a placa de vídeo) e respeita "reduzir movimento" do sistema.
 */
const Transition = (() => {
  let veil = null, card = null, timer = 0, cardTimer = 0;
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  function ensure() {
    if (veil) return;
    veil = document.createElement('div'); veil.id = 'scene-veil'; veil.setAttribute('aria-hidden', 'true');
    card = document.createElement('div'); card.id = 'scene-card'; card.setAttribute('aria-hidden', 'true');
    card.innerHTML = '<small></small><strong></strong><span></span>';
    document.body.append(veil, card);
  }
  function play(el, cls, ms) {
    el.classList.remove('scene-on', 'scene-flash', 'scene-cover', 'scene-card-on');
    void el.offsetWidth; // reinicia a animação
    el.classList.add(cls);
    el.hidden = false;
    el.style.animationDuration = ms + 'ms';
  }
  function showCard(kicker, title, subtitle, ms) {
    card.querySelector('small').textContent = kicker;
    card.querySelector('strong').textContent = title;
    card.querySelector('span').textContent = subtitle;
    clearTimeout(cardTimer);
    play(card, 'scene-card-on', ms);
    cardTimer = setTimeout(() => { card.hidden = true; }, ms + 60);
  }
  /** Cortina que some (entrada na run / volta ao menu). title opcional = cartão do mapa. */
  function reveal({ title = '', subtitle = '', kicker = '', ms = 650 } = {}) {
    ensure();
    clearTimeout(timer);
    if (reduced()) { veil.hidden = true; card.hidden = true; return; }
    play(veil, 'scene-cover', ms);
    if (title) showCard(kicker, title, subtitle, 1700); else { clearTimeout(cardTimer); card.hidden = true; }
    timer = setTimeout(() => { veil.hidden = true; }, ms + 60);
  }
  /** Piscada curta de teleporte. */
  function flash(title = '') {
    ensure();
    if (reduced()) return;
    clearTimeout(timer);
    play(veil, 'scene-flash', 420);
    if (title) showCard('', title, '', 1500);
    timer = setTimeout(() => { veil.hidden = true; }, 480);
  }
  return { reveal, flash };
})();
