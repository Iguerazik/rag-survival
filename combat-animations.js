'use strict';
/**
 * Ragnarok-style attack poses built from the character sprites already bundled in
 * assets/ro/*.png. The original action groups are 0=idle, 8=walk,
 * 40=attack and 88=cast. Action direction is 0..7 (south clockwise).
 * This module never changes damage, stats or the size of a hitbox.
 */
const CombatAnimations = (() => {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const easing = t => t * t * (3 - 2 * t);
  const weapons = {
    bow: /Arco/i, dagger: /Adaga|Katar/i, axe: /Machado/i,
    staff: /Cajado/i, sword: /Espada|Lança/i, mace: /Maça/i,
  };
  function weaponKind(weaponId, family = '', magic = false) {
    if(weaponId==='rod'||weaponId==='staff')return 'staff';
    if(weaponId==='bow'||weaponId==='crossbow')return 'bow';
    if(weaponId==='knife'||weaponId==='dagger'||weaponId==='katar')return 'dagger';
    const kind = (typeof itemDb === 'undefined' ? '' : itemDb[weaponId]?.kind) || '';
    for (const [type, pattern] of Object.entries(weapons)) if (pattern.test(kind)) return type;
    if (family === 'archer') return 'bow';
    if (magic || ['mage', 'acolyte'].includes(family)) return 'staff';
    if (family === 'thief') return 'dagger';
    return 'sword';
  }
  const timelines = Object.freeze({
    sword:  { duration: .43, impact: .53, recover: .78 },
    dagger: { duration: .31, impact: .43, recover: .70 },
    axe:    { duration: .56, impact: .64, recover: .84 },
    mace:   { duration: .48, impact: .60, recover: .81 },
    bow:    { duration: .52, impact: .62, recover: .85 },
    staff:  { duration: .49, impact: .63, recover: .86 },
  });
  function profile(weaponId, family = '', magic = false) {
    const type = weaponKind(weaponId, family, magic);
    return { type, ...timelines[type] };
  }
  function begin(actor, opts = {}) {
    const now = Number.isFinite(opts.now) ? opts.now : 0;
    const type = opts.type || weaponKind(opts.weaponId, opts.family, opts.magic);
    const template = timelines[type] || timelines.sword;
    const duration = clamp(Number(opts.duration) || template.duration, .15, 2.2);
    const kind = opts.kind === 'cast' ? 'cast' : 'attack';
    const impact = clamp(Number.isFinite(opts.impact) ? opts.impact : template.impact, .20, .86);
    actor.combatAnim = { kind, type, start: now, duration, impact, direction: Number.isFinite(opts.dir)?opts.dir:(actor.dir || 0),
      skillId:String(opts.skillId||'').replace(/[^a-z0-9_]/gi,'').slice(0,40) };
    return actor.combatAnim;
  }
  function progress(actor, now) {
    const anim = actor?.combatAnim;
    if (!anim || !Number.isFinite(now)) return null;
    const p = (now - anim.start) / anim.duration;
    return p >= 0 && p < 1 ? clamp(p, 0, .999) : null;
  }
  function frames(job, action) {
    if (typeof roSpriteData === 'undefined') return 5;
    const data = roSpriteData[job];
    if (!data?.actions) return 5;
    const group = action - action % 8;
    const direction = action % 8;
    const near = direction & 6;
    const entry = data.actions[action] || data.actions[group + near] ||
      (group === 88 ? data.actions[40 + near] : data.actions[group]) ||
      data.actions[near] || data.actions[0];
    return entry?.[1] || 5;
  }
  function frameAt(position, count, kind) {
    if (count <= 1) return 0;
    const p = clamp(position, 0, .999);
    // The swing advances frame-by-frame and holds its final recovery briefly,
    // instead of cycling five frames ten times in one hit (the old behaviour).
    if (kind === 'cast') return Math.min(count - 1, Math.floor(easing(p) * count));
    return Math.min(count - 1, Math.floor(easing(p) * count));
  }
  function pose(actor, now, jobId, fallbackAction, walkingFrame = 0) {
    const p = progress(actor, now);
    if (p === null) return { action: fallbackAction, frame: walkingFrame, active: false, phase: 'idle' };
    const anim = actor.combatAnim;
    const action = (anim.kind === 'cast' ? 88 : 40) + (anim.direction & 7);
    const frame = frameAt(p, frames(jobId, action), anim.kind);
    return { action, frame, active: true, kind: anim.kind, type: anim.type,
      phase: p < anim.impact ? 'windup' : p < (timelines[anim.type]?.recover || .82) ? 'strike' : 'recover',
      progress: p, impact: anim.impact, skillId: anim.skillId };
  }
  function remotePose(actor, jobId) {
    if (!actor?.attack || !Number.isFinite(actor.animProgress)) return null;
    const p = clamp(actor.animProgress, 0, .999);
    const kind = actor.animKind === 'cast' ? 'cast' : 'attack';
    const action = (kind === 'cast' ? 88 : 40) + ((actor.dir || 0) & 7);
    return { action, frame: frameAt(p, frames(jobId, action), kind), active: true,
      kind, type: actor.animType || 'sword', phase: p < .58 ? 'windup' : p < .8 ? 'strike' : 'recover', progress: p, skillId: actor.animSkill || '' };
  }
  function snapshot(actor, now) {
    const p = progress(actor, now);
    if (p === null) return { attack: false, animKind: '', animType: '', animSkill: '', animProgress: 0 };
    return { attack: true, animKind: actor.combatAnim.kind,
      animType: actor.combatAnim.type, animSkill: actor.combatAnim.skillId || '', animProgress: Math.round(p * 100) / 100 };
  }
  return { profile, weaponKind, begin, progress, pose, remotePose, snapshot, frameAt, frames, timelines };
})();
