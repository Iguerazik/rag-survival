'use strict';

// Ragnarok Online (Renewal) status system: point costs, points per level and derived stats.
// Formulas follow iRO Wiki: Stats / ATK / MATK / HIT / FLEE / CRIT / DEF / MDEF / ASPD.
const RO = (() => {
  const KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
  const floor = Math.floor;

  // Status point cost to raise a stat from x to x + 1.
  function raiseCost(x) {
    return x < 100 ? floor((x - 1) / 10) + 2 : 4 * floor((x - 100) / 5) + 16;
  }
  // Points gained when going from base level x to x + 1.
  function levelPoints(level) {
    return level < 100 ? floor(level / 5) + 3 : floor(level / 10) + 13;
  }
  // V13 balancing: fresh journeys earn status points as Base levels rise; rebirth grants a 20-point reserve.
  function startPoints(stage) { return stage >= 2 ? 20 : 0; }
  function statCap(stage) { return stage >= 5 ? 130 : 99; }
  function totalPoints(stage, base) {
    let total = startPoints(stage);
    for (let level = 1; level < base; level++) total += levelPoints(level);
    return total;
  }
  function spentOn(value) {
    let total = 0;
    for (let x = 1; x < value; x++) total += raiseCost(x);
    return total;
  }
  function baseStats() { return Object.fromEntries(KEYS.map(key => [key, 1])); }

  // Converts saves from the old 0..40 system: every stat goes back to 1 and all points are refunded.
  function migrate(profile) {
    if (!profile || profile.v === 2) return profile;
    const stage = profile.stage ?? 0;
    const base = profile.base ?? 1;
    return { ...profile, v: 2, migrated: true, stats: baseStats(), points: totalPoints(stage, base) };
  }

  // Automatic build used by the third class training mode.
  const builds = {
    sword: { str: 5, agi: 3, vit: 3, dex: 2, luk: 1 },
    mage: { int: 6, dex: 4, vit: 2 },
    archer: { dex: 6, agi: 3, luk: 2, str: 1 },
    acolyte: { int: 5, vit: 3, dex: 3, agi: 1 },
    merchant: { str: 5, vit: 3, dex: 2, luk: 2 },
    thief: { agi: 5, str: 4, luk: 2, dex: 1 },
    novice: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
  };
  function autoBuild(family, stage, base) {
    const stats = baseStats();
    const weights = builds[family] ?? builds.novice;
    const cap = statCap(stage);
    let points = totalPoints(stage, base);
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (let guard = 0; guard < 2000; guard++) {
      // Raise whichever weighted stat is furthest below its share.
      let best = null;
      let gap = -Infinity;
      for (const [key, weight] of Object.entries(weights)) {
        if (stats[key] >= cap || raiseCost(stats[key]) > points) continue;
        const want = weight / total - stats[key] / (cap * 2);
        if (want > gap) { gap = want; best = key; }
      }
      if (!best) break;
      points -= raiseCost(stats[best]);
      stats[best]++;
    }
    return { stats, points };
  }

  // Base ASPD of each line with its usual weapon (Renewal tables: 146-156 minus the weapon penalty).
  const jobAspd = { sword: 152, mage: 148, archer: 146, acolyte: 150, merchant: 146, thief: 154, novice: 152 };

  function aspdOf(family, agi, dex) {
    const base = jobAspd[family] ?? 152;
    const penalty = Math.min(.96, 1 - (base - 144) / 50);
    const correction = agi < 205 ? (Math.sqrt(205) - Math.sqrt(agi)) / 7.15 : 0;
    const aspd = base - correction + Math.sqrt(agi * 9.999 + dex * .19212) * penalty;
    return Math.min(193, Math.floor(aspd * 100) / 100);
  }

  function derive(job, journey, bonus = {}) {
    const lv = journey.base ?? 1;
    const raw = { ...baseStats(), ...journey.stats };
    const extra = Object.fromEntries(KEYS.map(key => [key, bonus[key] ?? 0]));
    const s = Object.fromEntries(KEYS.map(key => [key, raw[key] + extra[key]]));
    const family = job.family ?? 'novice';
    const ranged = job.basic === 'arrow';
    const main = ranged ? s.dex : s.str;
    const statusAtk = floor(lv / 4 + main + (ranged ? s.str : s.dex) / 5 + s.luk / 3);
    const weapon = bonus.weaponAtk ?? 0;
    const weaponBonus = floor(weapon * main * .005);
    const statusMatk = floor(lv / 4 + s.int + s.int / 2 + s.dex / 5 + s.luk / 3);
    const wMatk = bonus.weaponMatk ?? 0;
    const hit = 175 + lv + s.dex + floor(s.luk / 3) + (bonus.hit ?? 0);
    const flee = 100 + lv + s.agi + floor(s.luk / 5) + (bonus.flee ?? 0);
    const perfectDodge = 1 + floor(s.luk / 10) + (bonus.perfectDodge ?? 0);
    const crit = 1 + floor(s.luk * .3) + (bonus.crit ?? 0);
    const softDef = floor(s.vit / 2 + s.agi / 5 + lv / 2);
    const hardDef = bonus.def ?? 0;
    const softMdef = floor(s.int + s.vit / 5 + s.dex / 5 + lv / 4);
    const hardMdef = bonus.mdef ?? 0;
    const aspd = aspdOf(family, s.agi, s.dex);
    const trans = (journey.stage ?? 0) >= 2 ? 1.25 : 1;

    // Reference: a level 1 character with every stat at 1 and a starting weapon (Sword ATK 25, Rod MATK 15).
    // The ratio is softened (^0.55) because game monsters have tens of HP instead of thousands.
    const refAtk = 27;
    const refMatk = 17;
    const refAspd = aspdOf(family, 1, 1);
    const atkTotal = statusAtk * 2 + weapon + weaponBonus;
    const matkTotal = statusMatk + wMatk;
    const castReduction = Math.min(1, (s.dex * 2 + s.int) / 530);
    return {
      lv, raw, extra, s, statusAtk, weapon: weapon + weaponBonus, statusMatk, weaponMatk: wMatk,
      hit, flee, perfectDodge, crit, softDef, hardDef, softMdef, hardMdef, aspd,
      physical: Math.pow(Math.max(1, atkTotal) / refAtk, .55),
      magical: Math.pow(Math.max(1, matkTotal) / refMatk, .55),
      attackDelay: (200 - aspd) / (200 - refAspd),
      castReduction,
      hpMul: (1 + (lv - 1) * .006) * (1 + s.vit / 100) * trans,
      spMul: (1 + (lv - 1) * .006) * (1 + s.int / 100) * trans,
      // Soft DEF is a flat reduction in RO; here it becomes a percentage of the much smaller game damage.
      defense: 1 - (1 - softDef / (softDef + 120)) * (1 - hardDef / (hardDef + 60)),
      magicDefense: (softMdef + hardMdef) / (softMdef + hardMdef + 150),
      hpRegen: (Math.max(1, s.vit / 5)) * .05,
      spRegen: 1 + floor(s.int / 6) * .1,
    };
  }

  return { KEYS, raiseCost, levelPoints, startPoints, statCap, totalPoints, spentOn, baseStats, migrate, autoBuild, derive, aspdOf };
})();
