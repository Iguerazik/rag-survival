/** V23 - Equipamento e cartas no ONLINE, calculados pelo servidor a partir da conta (SQLite).
 * Roda os MESMOS arquivos do navegador (cards.js e items.js) num contexto isolado do node:vm, então a soma
 * de bônus é idêntica à do solo. O navegador nunca informa o próprio equipamento: o servidor lê da conta.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const sandbox = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
for (const file of ['cards.js', 'items.js']) vm.runInContext(fs.readFileSync(path.join(here, file), 'utf8'), sandbox, { filename: file });
vm.runInContext('this.__api = { Gear, itemDb, cardDb, mobElements, RefineRules };', sandbox);
const api = sandbox.__api;

/** Bônus de equipamento (formato do motor) do personagem `line` salvo em `data` (progresso da conta). */
export function gearForAccount(data, line) {
  const journey = data?.journeys?.[line];
  if (!journey || typeof journey !== 'object') return null;
  const gear = api.Gear.equipped(journey, Array.isArray(data.items) ? data.items : [], line);
  // JSON ida e volta: tira o objeto do contexto isolado (sem protótipos de outro "realm").
  return JSON.parse(JSON.stringify(api.Gear.engineBonuses(gear)));
}
/** Lista do que está equipado (para relatórios e testes). */
export function equippedForAccount(data, line) {
  const journey = data?.journeys?.[line];
  return journey ? JSON.parse(JSON.stringify(api.Gear.equipped(journey, Array.isArray(data.items) ? data.items : [], line))) : {};
}
export const mobElements = JSON.parse(JSON.stringify(api.mobElements));
const MAP_ORDER = ['sewer', 'payon', 'maze', 'orc', 'geffen', 'payonfield', 'glast', 'mine', 'temple', 'shadow'];
/** Etapa 4: item do tesouro do MVP escolhido no online vai para a conta (mesma regra do solo, Gear.grantItem). */
export function grantMvpItem(data, chosen, map) {
  const uid = 'm' + randomBytes(10).toString('hex');
  const result = api.Gear.grantItem(Array.isArray(data.items) ? data.items : [], chosen, Math.max(0, MAP_ORDER.indexOf(String(map))), uid);
  return JSON.parse(JSON.stringify(result));
}

/* ===== V24: forja (refino) — as MESMAS regras do navegador (RefineRules em items.js), decididas aqui no servidor. ===== */
export const refineConfig = JSON.parse(JSON.stringify({ MAX: api.RefineRules.MAX, DUPLICATE_CAP: api.RefineRules.DUPLICATE_CAP, TABLE: api.RefineRules.TABLE }));
export const refineErrors = JSON.parse(JSON.stringify(api.RefineRules.errors));
/** Uma tentativa de refino (sem efeitos colaterais): devolve o resultado e o item novo, ou o erro. */
export function refineAttempt(item, zeny, rng, expectFrom) {
  return JSON.parse(JSON.stringify(api.RefineRules.attempt(item, zeny, rng, expectFrom)));
}
export function refinePreview(item) { return JSON.parse(JSON.stringify(api.RefineRules.preview(item))); }
