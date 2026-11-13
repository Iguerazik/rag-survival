/** V23 - Adaptador do servidor para o MOTOR ÚNICO (engine/core.mjs).
 * O servidor lê os arquivos do disco e entrega ao motor; as regras vivem só em engine/core.mjs,
 * que é o MESMO arquivo que o navegador usa no modo solo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import * as engine from './engine/core.mjs';
import { CARD_MONSTERS, MOB_ELEMENTS } from './engine/cards-data.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
engine.configure({
 maps:JSON.parse(fs.readFileSync(path.join(here,'server-maps.json'),'utf8')),
 catalog:JSON.parse(fs.readFileSync(path.join(here,'online-skills.json'),'utf8')),
 cards:CARD_MONSTERS,
 elements:MOB_ELEMENTS,
});
/** No servidor cada mundo ganha um UUID e uma semente aleatória (a semente fica gravada em world.seed). */
export function makeWorld(mapId,difficulty,members,opts={}){
 return engine.makeWorld(mapId,difficulty,members,{id:randomUUID(),...opts});
}
export const {command,tickWorld,snapshotWorld,inputView,roomStatus,clock,passable,hasSight,deriveCharacter,addPlayer,
 resolveRevives,playerSpeed,REVIVE_SECONDS,REVIVE_RADIUS,ARENA_RADIUS,rand,updateCharacter,cleanGear}=engine;
export const skillCatalog=engine.skillCatalog;
