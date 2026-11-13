/** V23 - Carrega o MOTOR ÚNICO (engine/core.mjs) no navegador para o modo solo.
 * Usa exatamente os mesmos dados do servidor: server-maps.json, online-skills.json e a lista de cartas.
 * Expõe window.MidgardEngine = { core, ready } para os scripts clássicos (game.js e local-room.js).
 */
import * as core from './core.mjs';
import { CARD_MONSTERS, MOB_ELEMENTS } from './cards-data.mjs';

const load = file => fetch(file + '?v=23', { cache: 'no-cache' }).then(r => {
  if (!r.ok) throw new Error('Falha ao carregar ' + file + ' (' + r.status + ')');
  return r.json();
});

const engine = { core, ok: false, error: null };
engine.ready = Promise.all([load('server-maps.json'), load('online-skills.json')]).then(([maps, catalog]) => {
  core.configure({ maps, catalog, cards: CARD_MONSTERS, elements: MOB_ELEMENTS });
  engine.ok = true;
  return core;
}).catch(error => {
  engine.error = error;
  console.error('[Midgard] Motor do solo não carregou:', error);
  throw error;
});
engine.ready.catch(() => {});
window.MidgardEngine = engine;
window.dispatchEvent(new Event('midgard-engine'));
