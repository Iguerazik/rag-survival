'use strict';

// Skill animations inspired by the original Ragnarok Online effects (Bash star, Magnum Break flames,
// Fire Bolt falling from the sky, Frost Diver ice path, Storm Gust blizzard, Heal sparkles and so on).
// Everything is drawn in world space; the camera squashes the vertical axis by .73, so heights use up().
const SkillFX = (() => {
  const TAU = Math.PI * 2;
  const UP = 1 / .73;
  const up = h => h * UP;
  let list = [];

  const ease = t => 1 - Math.pow(1 - t, 3);
  const clamp01 = t => Math.max(0, Math.min(1, t));
  function rand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function glow(ctx, x, y, r, color, alpha = 1) {
    // Gradientes com coordenadas inválidas lançam erro entre save/restore e corrompem o canvas inteiro.
    if (!(r > 0) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function ring(ctx, x, y, r, color, width, alpha = 1) {
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  function line(ctx, x1, y1, x2, y2, color, width, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
  function bolt(ctx, x1, y1, x2, y2, color, width, seed, alpha = 1) {
    const steps = 7;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.lineJoin = 'round';
    for (const [w, c] of [[width * 2.6, color], [width, '#ffffff']]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.globalAlpha = alpha * (c === '#ffffff' ? 1 : .45);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const jitter = (rand(seed + i) - .5) * 26;
        ctx.lineTo(x1 + (x2 - x1) * t + jitter, y1 + (y2 - y1) * t);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function star(ctx, x, y, outer, inner, points, rotation, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = rotation + i * Math.PI / points;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * UP * .73);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function cross(ctx, x, y, size, color, alpha = 1, thick = .28) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x - size * thick / 2, y - up(size), size * thick, up(size));
    ctx.fillRect(x - size / 2, y - up(size * .72), size, up(size * thick));
    ctx.restore();
  }
  function flame(ctx, x, y, h, w, t, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const sway = Math.sin(t * 19 + x) * w * .25;
    for (const [scale, color] of [[1, '#ff6a2a'], [.68, '#ffb347'], [.36, '#fff1a8']]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - w * scale, y);
      ctx.quadraticCurveTo(x - w * scale * .9, y - up(h * scale * .55), x + sway * scale, y - up(h * scale));
      ctx.quadraticCurveTo(x + w * scale * .9, y - up(h * scale * .55), x + w * scale, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  function arrowShape(ctx, x, y, angle, length, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#d9b46e';
    ctx.fillRect(-length, -1, length, 2);
    ctx.fillStyle = '#fff4cf';
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-length - 2, -3, 6, 6);
    ctx.restore();
  }
  function fallingArrows(ctx, fx, p, count, color, height = 150) {
    for (let i = 0; i < count; i++) {
      const delay = rand(fx.seed + i * 3) * .45;
      const t = clamp01((p - delay) / .42);
      if (t <= 0 || t >= 1.0) continue;
      const a = rand(fx.seed + i) * TAU;
      const r = Math.sqrt(rand(fx.seed + i * 7)) * fx.radius;
      const gx = fx.x + Math.cos(a) * r;
      const gy = fx.y + Math.sin(a) * r;
      const y = gy - up(height) * (1 - ease(t));
      arrowShape(ctx, gx - 18 * (1 - t), y, Math.PI / 2 + .35, 22, color);
      if (t > .85) glow(ctx, gx, gy, 12, color, 1 - (t - .85) / .15);
    }
  }
  function groundGlyph(ctx, x, y, r, color, rotation, alpha = 1, sides = 8) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.arc(x, y, r * .82, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = rotation + i * TAU / sides;
      ctx.lineTo(x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82);
    }
    for (let i = 0; i <= sides; i++) {
      const a = rotation + (i * 3) * TAU / sides;
      ctx.lineTo(x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82);
    }
    ctx.stroke();
    ctx.restore();
  }
  function lerpPoint(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
  function sparkles(ctx, fx, p, count, color, spread, height, size = 3) {
    for (let i = 0; i < count; i++) {
      const delay = rand(fx.seed + i) * .5;
      const t = clamp01((p - delay) / .5);
      if (t <= 0 || t >= 1) continue;
      const a = rand(fx.seed + i * 5) * TAU;
      const r = spread * (.3 + rand(fx.seed + i * 9) * .7);
      const x = fx.x + Math.cos(a) * r;
      const y = fx.y + Math.sin(a) * r * .5 - up(height * t);
      star(ctx, x, y, size * (1 - t * .5), size * .35, 4, t * 3, color, 1 - t);
    }
  }

  const renderers = {
    // ===== Swordsman line =====
    bash(ctx, fx, p) {
      const s = ease(p);
      glow(ctx, fx.x, fx.y - 14, 46 * s + 10, '#fff3c0', 1 - p);
      star(ctx, fx.x, fx.y - 14, 34 * s + 8, 8, 8, p * .8, '#ffe79a', 1 - p);
      star(ctx, fx.x, fx.y - 14, 18 * s + 5, 5, 8, .4, '#ffffff', 1 - p);
      ring(ctx, fx.x, fx.y, 30 * s + 6, '#ffb55c', 3, 1 - p);
      for (let i = 0; i < 6; i++) {
        const a = fx.seed + i * TAU / 6;
        line(ctx, fx.x + Math.cos(a) * 14 * s, fx.y - 14 + Math.sin(a) * 14 * s,
          fx.x + Math.cos(a) * 44 * s, fx.y - 14 + Math.sin(a) * 44 * s, '#fff7da', 2, 1 - p);
      }
    },
    magnum(ctx, fx, p, time) {
      const r = fx.radius * ease(p);
      glow(ctx, fx.x, fx.y, r * 1.15, '#ff7b2e', .55 * (1 - p));
      ring(ctx, fx.x, fx.y, r, '#ffb24a', 8 * (1 - p) + 1, 1 - p * .7);
      ring(ctx, fx.x, fx.y, r * .82, '#ff5a1e', 3, 1 - p);
      for (let i = 0; i < 16; i++) {
        const a = i * TAU / 16 + fx.seed;
        flame(ctx, fx.x + Math.cos(a) * r, fx.y + Math.sin(a) * r, 34 * (1 - p * .6), 9, time + i, 1 - p);
      }
      flame(ctx, fx.x, fx.y, 60 * (1 - p), 24, time, (1 - p) * .9);
    },
    provoke(ctx, fx, p) {
      const pulse = 1 + Math.sin(p * 30) * .12;
      const y = fx.y - up(48);
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, p - .6) / .4;
      ctx.strokeStyle = '#e8262b';
      ctx.lineWidth = 3.4;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        const cx = fx.x + Math.cos(a) * 7 * pulse;
        const cy = y + Math.sin(a) * 7 * pulse;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 6 * pulse, a + Math.PI * .65, a + Math.PI * 1.35);
        ctx.stroke();
      }
      ctx.restore();
      ring(ctx, fx.x, fx.y, 18 + 8 * p, '#ff5a4e', 2, 1 - p);
    },
    endure(ctx, fx, p, time) {
      const a = 1 - Math.max(0, p - .5) / .5;
      glow(ctx, fx.x, fx.y - up(30), 46, '#ffe07a', .5 * a);
      ctx.save();
      ctx.globalAlpha = .38 * a;
      const g = ctx.createLinearGradient(0, fx.y, 0, fx.y - up(110));
      g.addColorStop(0, '#ffd760'); g.addColorStop(1, 'rgba(255,215,96,0)');
      ctx.fillStyle = g;
      ctx.fillRect(fx.x - 22, fx.y - up(110), 44, up(110));
      ctx.restore();
      ring(ctx, fx.x, fx.y, 22 + 4 * Math.sin(time * 10), '#ffe39a', 2.5, a);
      sparkles(ctx, fx, p, 10, '#fff2b5', 24, 80);
    },
    pierce(ctx, fx, p) {
      for (let i = 0; i < 3; i++) {
        const t = clamp01((p - i * .2) / .3);
        if (t <= 0 || t >= 1) continue;
        const reach = lerpPoint(fx.from, fx, ease(t));
        const offset = (i - 1) * 7;
        line(ctx, fx.from.x, fx.from.y - 14 + offset, reach.x, reach.y - 14 + offset, '#f4f1e6', 4, 1 - t);
        glow(ctx, reach.x, reach.y - 14, 18, '#fff7d0', 1 - t);
      }
    },
    bowling(ctx, fx, p) {
      for (let i = 0; i < 2; i++) {
        const t = clamp01((p - i * .25) / .45);
        if (t <= 0 || t >= 1) continue;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        for (const [w, c] of [[12, '#d88c3c'], [5, '#ffe0a2'], [2, '#fff']]) {
          ctx.strokeStyle = c;
          ctx.lineWidth = w;
          ctx.beginPath();
          const start = fx.angle - 1.6 + (i ? 3.2 : 0);
          ctx.arc(fx.x, fx.y - 10, fx.radius * .8, start, start + (i ? -1 : 1) * 3.2 * ease(t), !!i);
          ctx.stroke();
        }
        ctx.restore();
      }
      ring(ctx, fx.x, fx.y, fx.radius * ease(p), '#ffd8a0', 4, 1 - p);
    },
    joint(ctx, fx, p) {
      const s = 26 * ease(Math.min(1, p * 2));
      line(ctx, fx.x - s, fx.y - 14 - s, fx.x + s, fx.y - 14 + s, '#ff4f6a', 6, 1 - p);
      line(ctx, fx.x + s, fx.y - 14 - s, fx.x - s, fx.y - 14 + s, '#ff4f6a', 6, 1 - p);
      line(ctx, fx.x - s, fx.y - 14 - s, fx.x + s, fx.y - 14 + s, '#ffe4ea', 2, 1 - p);
      line(ctx, fx.x + s, fx.y - 14 - s, fx.x - s, fx.y - 14 + s, '#ffe4ea', 2, 1 - p);
      glow(ctx, fx.x, fx.y - 14, 34, '#b03a7a', .7 * (1 - p));
    },
    dragon(ctx, fx, p, time) {
      for (let i = 0; i < 26; i++) {
        const t = clamp01((p - rand(fx.seed + i) * .35) / .6);
        if (t <= 0 || t >= 1) continue;
        const spread = (rand(fx.seed + i * 4) - .5) * .5;
        const dist = fx.length * ease(t);
        const x = fx.from.x + Math.cos(fx.angle + spread) * dist;
        const y = fx.from.y + Math.sin(fx.angle + spread) * dist;
        glow(ctx, x, y - 14, 16 + 26 * t, t < .5 ? '#ffd27a' : '#ff6a2a', 1 - t);
        if (i % 3 === 0) flame(ctx, x, y, 22 * (1 - t), 8, time + i, 1 - t);
      }
    },
    ignition(ctx, fx, p, time) {
      groundGlyph(ctx, fx.x, fx.y, fx.radius * .9, '#ff9a6a', time * 2, 1 - p, 6);
      const r = fx.radius * ease(clamp01(p * 1.4));
      glow(ctx, fx.x, fx.y, r * 1.2, '#ff5a20', .7 * (1 - p));
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12;
        flame(ctx, fx.x + Math.cos(a) * r * .7, fx.y + Math.sin(a) * r * .7, 50 * (1 - p), 13, time + i, 1 - p);
      }
      ring(ctx, fx.x, fx.y, r, '#ffe0a0', 5, 1 - p);
    },
    // ===== Mage line =====
    fire(ctx, fx, p, time) {
      const count = Math.min(10, 2 + (fx.level ?? 1));
      for (let i = 0; i < count; i++) {
        const t = clamp01((p - i * (.55 / count)) / .3);
        if (t <= 0) continue;
        const ox = (rand(fx.seed + i) - .5) * 26;
        const oy = (rand(fx.seed + i * 2) - .5) * 16;
        const gx = fx.x + ox;
        const gy = fx.y + oy;
        if (t < 1) {
          const y = gy - up(190) * (1 - ease(t));
          const x = gx - 40 * (1 - ease(t));
          glow(ctx, x, y, 18, '#ffb04a', .9);
          line(ctx, x + 22, y - up(40), x, y, '#ff7a2a', 7, .7);
          line(ctx, x + 11, y - up(20), x, y, '#fff0a0', 3, 1);
        } else {
          const after = clamp01((p - i * (.55 / count) - .3) / .25);
          if (after < 1) {
            flame(ctx, gx, gy, 30 * (1 - after), 11, time + i, 1 - after);
            glow(ctx, gx, gy - 8, 26, '#ff8a3a', 1 - after);
          }
        }
      }
    },
    frost(ctx, fx, p) {
      const travel = clamp01(p / .45);
      const steps = 9;
      for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;
        if (t > travel) break;
        const point = lerpPoint(fx.from, fx, t);
        const size = 7 + i * .8;
        ctx.save();
        ctx.globalAlpha = (1 - p) * .9;
        ctx.fillStyle = i % 2 ? '#bfeeff' : '#7fd3ff';
        ctx.beginPath();
        ctx.moveTo(point.x - size, point.y);
        ctx.lineTo(point.x, point.y - up(size * 2.4));
        ctx.lineTo(point.x + size, point.y);
        ctx.fill();
        ctx.restore();
      }
      if (p > .4) {
        const t = clamp01((p - .4) / .6);
        ctx.save();
        ctx.globalAlpha = .75 * (1 - Math.max(0, t - .6) / .4);
        ctx.fillStyle = '#c9f2ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const w = 20;
        const h = up(52);
        ctx.moveTo(fx.x - w, fx.y);
        ctx.lineTo(fx.x - w * 1.1, fx.y - h * .6);
        ctx.lineTo(fx.x - w * .3, fx.y - h);
        ctx.lineTo(fx.x + w * .5, fx.y - h * .9);
        ctx.lineTo(fx.x + w * 1.1, fx.y - h * .45);
        ctx.lineTo(fx.x + w, fx.y);
        ctx.closePath();
        ctx.globalAlpha *= .55;
        ctx.fill();
        ctx.globalAlpha /= .55;
        ctx.stroke();
        ctx.restore();
      }
    },
    storm(ctx, fx, p) {
      glow(ctx, fx.x, fx.y, fx.radius * 1.1, '#7a62ff', .25 * (1 - p));
      for (let i = 0; i < 10; i++) {
        const at = rand(fx.seed + i) * .6;
        const t = (p - at) / .14;
        if (t < 0 || t > 1) continue;
        const a = rand(fx.seed + i * 3) * TAU;
        const r = Math.sqrt(rand(fx.seed + i * 5)) * fx.radius;
        const x = fx.x + Math.cos(a) * r;
        const y = fx.y + Math.sin(a) * r;
        bolt(ctx, x + 24, y - up(220), x, y, '#c9b8ff', 2.4, fx.seed + i * 11, 1 - t);
        glow(ctx, x, y, 22, '#e8dcff', 1 - t);
      }
    },
    spirit(ctx, fx, p) {
      const count = Math.min(5, 1 + (fx.level ?? 1));
      for (let i = 0; i < count; i++) {
        const t = clamp01((p - i * .1) / .5);
        if (t <= 0 || t >= 1) continue;
        const curve = Math.sin(t * Math.PI) * (i % 2 ? 30 : -30);
        const point = lerpPoint(fx.from, fx, ease(t));
        const nx = -Math.sin(fx.angle) * curve;
        const ny = Math.cos(fx.angle) * curve;
        glow(ctx, point.x + nx, point.y + ny - 22, 15, '#f1dcff', 1);
        glow(ctx, point.x + nx, point.y + ny - 22, 6, '#ffffff', 1);
      }
      if (p > .5) ring(ctx, fx.x, fx.y - 14, 14 + 24 * (p - .5), '#e6c9ff', 2, (1 - p) * 2);
    },
    stormgust(ctx, fx, p, time) {
      const fade = p < .15 ? p / .15 : 1 - Math.max(0, p - .8) / .2;
      glow(ctx, fx.x, fx.y, fx.radius * 1.1, '#a8e4ff', .35 * fade);
      ring(ctx, fx.x, fx.y, fx.radius, '#e4f7ff', 2, .6 * fade);
      for (let i = 0; i < 46; i++) {
        const r = fx.radius * (.15 + rand(fx.seed + i) * .85);
        const a = rand(fx.seed + i * 3) * TAU + time * (3.2 - r / fx.radius * 1.6);
        const x = fx.x + Math.cos(a) * r;
        const y = fx.y + Math.sin(a) * r - up(10 + rand(fx.seed + i * 7) * 40);
        star(ctx, x, y, 4, 1.4, 3, time * 4 + i, i % 3 ? '#ffffff' : '#bfeaff', fade);
      }
    },
    vermilion(ctx, fx, p) {
      ctx.save();
      ctx.globalAlpha = .28 * (1 - p);
      ctx.fillStyle = '#1b1b55';
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.radius * 1.2, 0, TAU);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 14; i++) {
        const at = rand(fx.seed + i) * .7;
        const t = (p - at) / .16;
        if (t < 0 || t > 1) continue;
        const a = rand(fx.seed + i * 3) * TAU;
        const r = Math.sqrt(rand(fx.seed + i * 5)) * fx.radius;
        const x = fx.x + Math.cos(a) * r;
        const y = fx.y + Math.sin(a) * r;
        bolt(ctx, x, y - up(260), x, y, '#9fb7ff', 4, fx.seed + i * 13, 1 - t);
        glow(ctx, x, y, 30, '#dbe6ff', 1 - t);
      }
    },
    napalm(ctx, fx, p, time) {
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7 + fx.seed;
        const r = fx.radius * ease(p) * (.4 + rand(fx.seed + i) * .6);
        const x = fx.x + Math.cos(a) * r;
        const y = fx.y + Math.sin(a) * r - up(20 + 20 * p);
        glow(ctx, x, y, 17, '#c48aff', 1 - p);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#f2e4ff';
        ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5b2a7e';
        ctx.fillRect(x - 3.5, y - 1.5, 2.5, 2.5); ctx.fillRect(x + 1, y - 1.5, 2.5, 2.5);
        ctx.restore();
      }
      glow(ctx, fx.x, fx.y - 10, fx.radius * .8, '#8f4bd6', .45 * (1 - p));
    },
    crimson(ctx, fx, p, time) {
      const t = clamp01(p / .9);
      const x = fx.x - 170 * (1 - ease(t));
      const y = fx.y - up(260) * (1 - ease(t));
      glow(ctx, fx.x, fx.y, fx.radius * t, '#ff6b2a', .18);
      ring(ctx, fx.x, fx.y, fx.radius, '#ffae78', 2, .7);
      for (let i = 1; i < 6; i++) glow(ctx, x - i * 16, y - up(i * 24), 26 - i * 3, '#ff9a4a', .5 - i * .08);
      glow(ctx, x, y, 34, '#ffd27a', 1);
      glow(ctx, x, y, 14, '#ffffff', 1);
      flame(ctx, x, y + 10, 30, 14, time, .9);
    },
    crimsonHit(ctx, fx, p, time) {
      const r = fx.radius * ease(p);
      glow(ctx, fx.x, fx.y, r * 1.3, '#ff5a20', .8 * (1 - p));
      ring(ctx, fx.x, fx.y, r, '#ffd08a', 7 * (1 - p) + 1, 1 - p);
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10 + fx.seed;
        flame(ctx, fx.x + Math.cos(a) * r * .6, fx.y + Math.sin(a) * r * .6, 48 * (1 - p), 13, time + i, 1 - p);
      }
    },
    comet(ctx, fx, p) {
      const t = clamp01(p / .9);
      const x = fx.x + 120 * (1 - ease(t));
      const y = fx.y - up(320) * (1 - ease(t));
      ring(ctx, fx.x, fx.y, fx.radius, '#f8df8d', 2.5, .7);
      groundGlyph(ctx, fx.x, fx.y, fx.radius * .7, '#ffe9a8', p * 3, .5);
      for (let i = 1; i < 8; i++) glow(ctx, x + i * 12, y - up(i * 30), 40 - i * 4, '#bfd6ff', .45 - i * .05);
      glow(ctx, x, y, 52, '#fff2c0', 1);
      glow(ctx, x, y, 22, '#ffffff', 1);
    },
    cometHit(ctx, fx, p) {
      const r = fx.radius * 1.15 * ease(p);
      glow(ctx, fx.x, fx.y, r * 1.4, '#fff6d6', (1 - p));
      ring(ctx, fx.x, fx.y, r, '#ffffff', 10 * (1 - p) + 1, 1 - p);
      ring(ctx, fx.x, fx.y, r * .7, '#ffd27a', 5, 1 - p);
      for (let i = 0; i < 18; i++) {
        const a = i * TAU / 18;
        line(ctx, fx.x, fx.y, fx.x + Math.cos(a) * r, fx.y + Math.sin(a) * r - up(30 * (1 - p)), '#fff0b8', 3, 1 - p);
      }
    },
    lightning(ctx, fx, p) {
      const points = [fx.from, ...(fx.targets ?? [fx])];
      for (let i = 1; i < points.length; i++) {
        const t = (p - (i - 1) * .06) / .35;
        if (t < 0 || t > 1) continue;
        bolt(ctx, points[i - 1].x, points[i - 1].y - 20, points[i].x, points[i].y - 16, '#b39bff', 2.6, fx.seed + i * 17 + Math.floor(p * 20), 1 - t);
        glow(ctx, points[i].x, points[i].y - 16, 24, '#e4dbff', 1 - t);
      }
    },
    // ===== Archer line =====
    arrows(ctx, fx, p) { glow(ctx, fx.from.x, fx.from.y - 16, 22, '#e6ffc4', 1 - p); },
    shower(ctx, fx, p) {
      ring(ctx, fx.x, fx.y, fx.radius, '#f4e2a2', 1.5, .5 * (1 - p));
      fallingArrows(ctx, fx, p, 18, '#f4e2a2');
    },
    arrowstorm(ctx, fx, p) {
      ring(ctx, fx.x, fx.y, fx.radius, '#baf398', 2, .6 * (1 - p));
      glow(ctx, fx.x, fx.y, fx.radius, '#9be37a', .18 * (1 - p));
      fallingArrows(ctx, fx, p, 34, '#baf398', 190);
    },
    charge(ctx, fx, p) {
      for (let i = 0; i < 4; i++) {
        const a = fx.angle + Math.PI + (i - 1.5) * .35;
        line(ctx, fx.from.x, fx.from.y - 14, fx.from.x + Math.cos(a) * 46 * ease(p), fx.from.y - 14 + Math.sin(a) * 46 * ease(p), '#fff7c8', 2, 1 - p);
      }
      glow(ctx, fx.from.x, fx.from.y - 14, 30, '#ffea91', 1 - p);
    },
    concentration(ctx, fx, p, time) {
      const a = 1 - Math.max(0, p - .5) / .5;
      ring(ctx, fx.x, fx.y, 24, '#d5f9a0', 2, a);
      ring(ctx, fx.x, fx.y, 16 + Math.sin(time * 12) * 3, '#effed7', 1.5, a);
      sparkles(ctx, fx, p, 14, '#e6ffb8', 26, 70);
      glow(ctx, fx.x, fx.y - up(30), 40, '#c8f58a', .35 * a);
    },
    falcon(ctx, fx, p) {
      const t = ease(p);
      const x = fx.from.x + Math.cos(fx.angle) * fx.length * t;
      const y = fx.from.y + Math.sin(fx.angle) * fx.length * t - up(36 + Math.sin(p * Math.PI) * 30);
      const flap = Math.sin(p * 40) * 10;
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, p - .8) / .2;
      ctx.translate(x, y);
      ctx.rotate(fx.angle);
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(-4, -16 - flap); ctx.lineTo(-2, 0); ctx.lineTo(-4, 16 + flap); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a6a43';
      ctx.fillRect(-12, -3, 18, 6);
      ctx.restore();
      for (let i = 0; i < 6; i++) {
        const f = clamp01(p - i * .08);
        const fxp = fx.from.x + Math.cos(fx.angle) * fx.length * ease(f);
        const fyp = fx.from.y + Math.sin(fx.angle) * fx.length * ease(f);
        glow(ctx, fxp + (rand(fx.seed + i) - .5) * 20, fyp - 20, 8, '#fff7e0', (1 - p) * .7);
      }
    },
    landmineHit(ctx, fx, p) {
      glow(ctx, fx.x, fx.y, fx.radius * 1.2 * ease(p), '#ffb070', 1 - p);
      ring(ctx, fx.x, fx.y, fx.radius * ease(p), '#fff0c0', 5, 1 - p);
      for (let i = 0; i < 12; i++) {
        const a = rand(fx.seed + i) * TAU;
        const d = fx.radius * ease(p) * (.4 + rand(fx.seed + i * 3) * .6);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#6e5a46';
        ctx.fillRect(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d - up(40 * Math.sin(p * Math.PI)), 4, 4);
        ctx.restore();
      }
    },
    precise(ctx, fx, p) {
      const end = { x: fx.from.x + Math.cos(fx.angle) * fx.length, y: fx.from.y + Math.sin(fx.angle) * fx.length };
      line(ctx, fx.from.x, fx.from.y - 14, end.x, end.y - 14, '#fffbd0', 7 * (1 - p), .6 * (1 - p));
      line(ctx, fx.from.x, fx.from.y - 14, end.x, end.y - 14, '#ffffff', 2, 1 - p);
    },
    aimed(ctx, fx, p) {
      const a = 1 - Math.max(0, p - .7) / .3;
      const s = 30 - 14 * ease(Math.min(1, p * 2));
      ring(ctx, fx.x, fx.y - 14, s, '#ff6b5a', 2, a);
      line(ctx, fx.x - s - 8, fx.y - 14, fx.x - s + 6, fx.y - 14, '#ff6b5a', 2, a);
      line(ctx, fx.x + s - 6, fx.y - 14, fx.x + s + 8, fx.y - 14, '#ff6b5a', 2, a);
      line(ctx, fx.x, fx.y - 14 - s - 8, fx.x, fx.y - 14 - s + 6, '#ff6b5a', 2, a);
      line(ctx, fx.x, fx.y - 14 + s - 6, fx.x, fx.y - 14 + s + 8, '#ff6b5a', 2, a);
    },
    wargstrike(ctx, fx, p) {
      const t = ease(p);
      const x = fx.from.x + Math.cos(fx.angle) * fx.length * t;
      const y = fx.from.y + Math.sin(fx.angle) * fx.length * t;
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, p - .75) / .25;
      ctx.translate(x, y - 12);
      ctx.scale(Math.cos(fx.angle) < 0 ? -1 : 1, 1);
      ctx.fillStyle = '#d9d2c6';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 9, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(32, -10); ctx.lineTo(30, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8d8478';
      ctx.fillRect(-24, -2, 10, 3);
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 8;
        line(ctx, x - Math.cos(fx.angle) * 40, y - 12 + off, x - Math.cos(fx.angle) * 10, y - 12 + off, '#e9d6ff', 2, (1 - p) * .8);
      }
    },
    // ===== Acolyte line =====
    holy(ctx, fx, p) {
      const a = 1 - p;
      ctx.save();
      ctx.globalAlpha = .7 * a;
      const g = ctx.createLinearGradient(0, fx.y - up(220), 0, fx.y);
      g.addColorStop(0, 'rgba(255,250,220,0)'); g.addColorStop(1, '#fff9d8');
      ctx.fillStyle = g;
      ctx.fillRect(fx.x - 12, fx.y - up(220), 24, up(220));
      ctx.restore();
      cross(ctx, fx.x, fx.y - 6, 30 * ease(Math.min(1, p * 2)) + 8, '#fffbe6', a);
      glow(ctx, fx.x, fx.y - 14, 36, '#fff5c0', a);
    },
    heal(ctx, fx, p, time) {
      glow(ctx, fx.x, fx.y - up(20), 48, '#b3ffcc', .45 * (1 - p));
      sparkles(ctx, fx, p, 20, '#e6fff0', 28, 90, 3.5);
      for (let i = 0; i < 4; i++) {
        const t = clamp01((p - i * .12) / .6);
        if (t <= 0 || t >= 1) continue;
        cross(ctx, fx.x + (i - 1.5) * 13, fx.y - up(20 + 50 * t), 12, '#7cf0a8', 1 - t);
      }
      ring(ctx, fx.x, fx.y, 26, '#c6ffd8', 2, 1 - p);
    },
    blessing(ctx, fx, p) {
      ctx.save();
      ctx.globalAlpha = .55 * (1 - p);
      const g = ctx.createLinearGradient(0, fx.y - up(200), 0, fx.y);
      g.addColorStop(0, 'rgba(255,235,150,0)'); g.addColorStop(1, '#ffe9a0');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx.x - 10, fx.y - up(200)); ctx.lineTo(fx.x + 10, fx.y - up(200));
      ctx.lineTo(fx.x + 34, fx.y); ctx.lineTo(fx.x - 34, fx.y); ctx.closePath();
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 10; i++) {
        const t = clamp01((p - rand(fx.seed + i) * .4) / .6);
        if (t <= 0 || t >= 1) continue;
        const x = fx.x + (rand(fx.seed + i * 3) - .5) * 60 + Math.sin(t * 8 + i) * 8;
        const y = fx.y - up(140) * (1 - t);
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = '#fffbe9';
        ctx.beginPath(); ctx.ellipse(x, y, 6, 2.5, t * 4 + i, 0, TAU); ctx.fill();
        ctx.restore();
      }
    },
    agiup(ctx, fx, p, time) {
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.globalAlpha = (1 - p) * .8;
        ctx.strokeStyle = i % 2 ? '#b3f7e1' : '#7ee3ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let j = 0; j <= 24; j++) {
          const t = j / 24;
          const a = t * TAU * 1.5 + time * 8 + i * 2.1;
          ctx.lineTo(fx.x + Math.cos(a) * (24 - t * 6), fx.y + Math.sin(a) * 10 - up(t * 60 * ease(p)));
        }
        ctx.stroke();
        ctx.restore();
      }
      sparkles(ctx, fx, p, 10, '#dcfff4', 22, 50);
    },
    magnus(ctx, fx, p, time) {
      const a = p < .2 ? p / .2 : 1;
      groundGlyph(ctx, fx.x, fx.y, fx.radius, '#fff1b0', time * .6, .8 * a, 8);
      ctx.save();
      ctx.globalAlpha = .55 * a;
      ctx.fillStyle = '#fff6c8';
      ctx.fillRect(fx.x - fx.radius * .12, fx.y - fx.radius * .8, fx.radius * .24, fx.radius * 1.6);
      ctx.fillRect(fx.x - fx.radius * .8, fx.y - fx.radius * .12, fx.radius * 1.6, fx.radius * .24);
      ctx.restore();
    },
    magnusPulse(ctx, fx, p) {
      for (let i = 0; i < 5; i++) {
        const a = rand(fx.seed + i) * TAU;
        const r = Math.sqrt(rand(fx.seed + i * 3)) * fx.radius;
        const x = fx.x + Math.cos(a) * r;
        const y = fx.y + Math.sin(a) * r;
        ctx.save();
        ctx.globalAlpha = .7 * (1 - p);
        ctx.fillStyle = '#fffbe0';
        ctx.fillRect(x - 6, y - up(120), 12, up(120));
        ctx.restore();
        cross(ctx, x, y - up(20), 16, '#ffffff', 1 - p);
      }
    },
    sanctuary(ctx, fx, p, time) {
      groundGlyph(ctx, fx.x, fx.y, 70, '#c8ffe0', time, 1 - p, 4);
      glow(ctx, fx.x, fx.y, 80, '#b5ffd4', .3 * (1 - p));
      sparkles(ctx, fx, p, 22, '#ffffff', 60, 100, 4);
      for (let i = 0; i < 4; i++) cross(ctx, fx.x + Math.cos(i * TAU / 4) * 44, fx.y + Math.sin(i * TAU / 4) * 44 - up(30 * p), 12, '#d8ffe8', 1 - p);
    },
    assumptio(ctx, fx, p, time) {
      const a = 1 - Math.max(0, p - .6) / .4;
      glow(ctx, fx.x, fx.y - up(26), 54, '#f3edff', .6 * a);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.globalAlpha = .75 * a;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const x = fx.x + side * 8;
        const y = fx.y - up(40);
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + side * 40, y - up(30 + Math.sin(time * 6) * 6), x + side * 46, y + up(8));
        ctx.quadraticCurveTo(x + side * 24, y + up(2), x, y + up(12));
        ctx.fill();
        ctx.restore();
      }
      ring(ctx, fx.x, fx.y, 26, '#e9e1ff', 2.5, a);
    },
    adoramus(ctx, fx, p) {
      for (let i = 0; i < 9; i++) {
        const at = rand(fx.seed + i) * .5;
        const t = (p - at) / .25;
        if (t < 0 || t > 1) continue;
        const a = rand(fx.seed + i * 3) * TAU;
        const r = Math.sqrt(rand(fx.seed + i * 5)) * fx.radius;
        const x = fx.x + Math.cos(a) * r;
        const y = fx.y + Math.sin(a) * r;
        line(ctx, x + 30, y - up(230), x, y, '#fff1b4', 9 * (1 - t), .5 * (1 - t));
        line(ctx, x + 30, y - up(230), x, y, '#ffffff', 2.5, 1 - t);
        glow(ctx, x, y, 28, '#fff7d0', 1 - t);
      }
      ring(ctx, fx.x, fx.y, fx.radius, '#fff1b4', 2, .6 * (1 - p));
    },
    judex(ctx, fx, p) {
      for (let i = 0; i < 6; i++) {
        const at = i * .07;
        const t = clamp01((p - at) / .45);
        if (t <= 0 || t >= 1) continue;
        const a = i * TAU / 6 + fx.seed;
        const r = fx.radius * .55;
        const x = fx.x + Math.cos(a) * r * (1 - t * .4);
        const y = fx.y + Math.sin(a) * r * (1 - t * .4);
        cross(ctx, x, y - up(90) * (1 - ease(t)), 18, '#e0eeff', 1 - t * .6);
      }
      if (p > .4) ring(ctx, fx.x, fx.y, fx.radius * ease((p - .4) / .6), '#ffffff', 4, 1 - p);
    },
    praefatio(ctx, fx, p, time) {
      const a = p < .2 ? p / .2 : 1 - Math.max(0, p - .7) / .3;
      ctx.save();
      ctx.globalAlpha = .28 * a;
      ctx.fillStyle = '#b6e1ff';
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y - up(24), 34, up(38), 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = .9 * a;
      ctx.strokeStyle = '#e6f5ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 6; i++) {
        const ang = i * TAU / 6 + time * 1.5;
        star(ctx, fx.x + Math.cos(ang) * 30, fx.y - up(24) + Math.sin(ang) * up(30), 4, 1.5, 4, time, '#ffffff', a);
      }
    },
    // ===== Merchant line =====
    mammon(ctx, fx, p) {
      glow(ctx, fx.x, fx.y - 14, 34, '#ffe07a', 1 - p);
      for (let i = 0; i < 12; i++) {
        const a = rand(fx.seed + i) * TAU;
        const speed = 30 + rand(fx.seed + i * 3) * 40;
        const x = fx.x + Math.cos(a) * speed * p;
        const y = fx.y - 14 + Math.sin(a) * speed * p * .5 - up(50 * Math.sin(p * Math.PI) * (.5 + rand(fx.seed + i * 7)));
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#f7c63c';
        ctx.beginPath(); ctx.ellipse(x, y, 5, 5 * Math.abs(Math.cos(p * 18 + i)) + .8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff3b0';
        ctx.fillRect(x - 1, y - 2, 2, 2);
        ctx.restore();
      }
      star(ctx, fx.x, fx.y - 14, 26 * ease(p) + 6, 7, 6, .3, '#fff5c8', 1 - p);
    },
    cartrev(ctx, fx, p) {
      const ang = fx.angle + p * TAU * 1.1;
      const r = fx.radius * .7;
      const x = fx.x + Math.cos(ang) * r;
      const y = fx.y + Math.sin(ang) * r;
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, p - .7) / .3;
      ctx.fillStyle = '#9a6a3a';
      ctx.fillRect(x - 13, y - up(18), 26, up(14));
      ctx.fillStyle = '#5f3c1d';
      ctx.beginPath(); ctx.arc(x - 8, y, 4, 0, TAU); ctx.arc(x + 8, y, 4, 0, TAU); ctx.fill();
      ctx.restore();
      ring(ctx, fx.x, fx.y, fx.radius * ease(p), '#e2bd83', 4, 1 - p);
      for (let i = 0; i < 10; i++) glow(ctx, fx.x + Math.cos(ang - i * .2) * r, fx.y + Math.sin(ang - i * .2) * r, 12, '#d8c3a0', (1 - p) * (1 - i / 10) * .7);
    },
    hammerfall(ctx, fx, p, time) {
      const slam = clamp01(p / .25);
      if (slam < 1) {
        ctx.save();
        ctx.translate(fx.x, fx.y - up(80) * (1 - slam));
        ctx.fillStyle = '#a7a7b3';
        ctx.fillRect(-16, -up(14), 32, up(14));
        ctx.fillStyle = '#7a5530';
        ctx.fillRect(-3, -up(44), 6, up(30));
        ctx.restore();
      } else {
        const t = (p - .25) / .75;
        ring(ctx, fx.x, fx.y, fx.radius * ease(t), '#f9d38d', 6 * (1 - t) + 1, 1 - t);
        for (let i = 0; i < 9; i++) {
          const a = i * TAU / 9 + fx.seed;
          line(ctx, fx.x, fx.y, fx.x + Math.cos(a) * fx.radius * .8 * ease(t), fx.y + Math.sin(a) * fx.radius * .8 * ease(t), '#5a4630', 3, 1 - t);
        }
        for (let i = 0; i < 5; i++) {
          const a = time * 6 + i * TAU / 5;
          star(ctx, fx.x + Math.cos(a) * 26, fx.y - up(34) + Math.sin(a) * 8, 6, 2.5, 5, time * 4, '#ffe86a', 1 - t);
        }
      }
    },
    overthrust(ctx, fx, p, time) {
      const a = 1 - Math.max(0, p - .5) / .5;
      glow(ctx, fx.x, fx.y - up(24), 46, '#ff8a4a', .5 * a);
      for (let i = 0; i < 6; i++) flame(ctx, fx.x + (i - 2.5) * 9, fx.y, 30 + Math.sin(time * 9 + i) * 8, 6, time + i, .8 * a);
      for (let i = 0; i < 3; i++) {
        const y = fx.y - up(30 + ((p * 120 + i * 30) % 90));
        line(ctx, fx.x - 10, y + 8, fx.x, y, '#ffe0b0', 3, a);
        line(ctx, fx.x + 10, y + 8, fx.x, y, '#ffe0b0', 3, a);
      }
    },
    cartterm(ctx, fx, p) {
      const t = ease(p);
      const x = fx.from.x + Math.cos(fx.angle) * fx.length * t;
      const y = fx.from.y + Math.sin(fx.angle) * fx.length * t;
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, p - .8) / .2;
      ctx.fillStyle = '#b07a3e';
      ctx.fillRect(x - 15, y - up(20), 30, up(16));
      ctx.fillStyle = '#ffd18f';
      ctx.fillRect(x - 12, y - up(23), 24, up(4));
      ctx.restore();
      for (let i = 0; i < 8; i++) {
        const back = i * 12;
        glow(ctx, x - Math.cos(fx.angle) * back, y - Math.sin(fx.angle) * back, 14, '#ffd18f', (1 - p) * (1 - i / 8));
      }
    },
    axetornado(ctx, fx, p, time) {
      ring(ctx, fx.x, fx.y, fx.radius * .9, '#ffca9c', 3, 1 - p);
      for (let i = 0; i < 3; i++) {
        const a = time * 14 + i * TAU / 3;
        const x = fx.x + Math.cos(a) * fx.radius * .7;
        const y = fx.y + Math.sin(a) * fx.radius * .7;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.translate(x, y - 14);
        ctx.rotate(a * 2);
        ctx.fillStyle = '#c9c9d2';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 13, -.9, .9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7a5530';
        ctx.fillRect(-12, -1.5, 14, 3);
        ctx.restore();
      }
      for (let i = 0; i < 18; i++) {
        const a = time * 10 + i * TAU / 18;
        glow(ctx, fx.x + Math.cos(a) * fx.radius * .85, fx.y + Math.sin(a) * fx.radius * .85, 10, '#f0e2cf', (1 - p) * .5);
      }
    },
    armcannon(ctx, fx, p) {
      const end = { x: fx.from.x + Math.cos(fx.angle) * fx.length, y: fx.from.y + Math.sin(fx.angle) * fx.length };
      const w = 26 * (1 - p);
      line(ctx, fx.from.x, fx.from.y - 16, end.x, end.y - 16, '#5fb6ff', w, .55 * (1 - p));
      line(ctx, fx.from.x, fx.from.y - 16, end.x, end.y - 16, '#e8f6ff', w * .3 + 1, 1 - p);
      glow(ctx, fx.from.x + Math.cos(fx.angle) * 20, fx.from.y - 16 + Math.sin(fx.angle) * 20, 34, '#c5e6ff', 1 - p);
      for (let i = 1; i < 5; i++) {
        const t = clamp01(p * 1.5 - i * .1);
        const x = fx.from.x + Math.cos(fx.angle) * fx.length * (i / 5);
        const y = fx.from.y + Math.sin(fx.angle) * fx.length * (i / 5);
        ring(ctx, x, y - 16, 10 + 20 * t, '#a8d9ff', 2, 1 - t);
      }
    },
    // ===== Thief line =====
    envenom(ctx, fx, p) {
      glow(ctx, fx.x, fx.y - 12, 30, '#8fdc5a', .7 * (1 - p));
      for (let i = 0; i < 10; i++) {
        const a = rand(fx.seed + i) * TAU;
        const d = 34 * ease(p) * (.5 + rand(fx.seed + i * 3) * .5);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = i % 2 ? '#bce78b' : '#5fae3a';
        ctx.beginPath();
        ctx.arc(fx.x + Math.cos(a) * d, fx.y - 12 + Math.sin(a) * d * .6 - up(18 * Math.sin(p * Math.PI)), 3.5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 4; i++) ring(ctx, fx.x + (i - 1.5) * 9, fx.y - up(20 + 30 * p + i * 6), 3 + i % 2, '#d2f5a8', 1.5, 1 - p);
    },
    sand(ctx, fx, p) {
      for (let i = 0; i < 40; i++) {
        const a = rand(fx.seed + i) * TAU;
        const d = fx.radius * ease(p) * (.3 + rand(fx.seed + i * 3) * .9);
        ctx.save();
        ctx.globalAlpha = (1 - p) * .9;
        ctx.fillStyle = i % 3 ? '#d8b77a' : '#a88552';
        ctx.fillRect(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d - up(20 * Math.sin(p * Math.PI)), 3, 3);
        ctx.restore();
      }
      glow(ctx, fx.x, fx.y, fx.radius, '#e6ca95', .25 * (1 - p));
    },
    sonicblow(ctx, fx, p) {
      for (let i = 0; i < 8; i++) {
        const t = clamp01((p - i * .08) / .18);
        if (t <= 0 || t >= 1) continue;
        const a = rand(fx.seed + i) * Math.PI;
        const s = 30;
        line(ctx, fx.x - Math.cos(a) * s, fx.y - 16 - Math.sin(a) * s, fx.x + Math.cos(a) * s, fx.y - 16 + Math.sin(a) * s, '#e6c6fa', 5, 1 - t);
        line(ctx, fx.x - Math.cos(a) * s, fx.y - 16 - Math.sin(a) * s, fx.x + Math.cos(a) * s, fx.y - 16 + Math.sin(a) * s, '#ffffff', 1.5, 1 - t);
      }
      glow(ctx, fx.x, fx.y - 16, 30, '#d8a8ff', .6 * (1 - p));
    },
    grimtooth(ctx, fx, p) {
      for (let i = 0; i < 9; i++) {
        const t = clamp01((p - i * .04) / .5);
        if (t <= 0 || t >= 1) continue;
        const a = rand(fx.seed + i) * TAU;
        const r = Math.sqrt(rand(fx.seed + i * 3)) * fx.radius;
        const x = fx.x + Math.cos(a) * r;
        const y = fx.y + Math.sin(a) * r;
        const h = up(46) * Math.sin(t * Math.PI);
        ctx.save();
        ctx.fillStyle = '#6a3d8e';
        ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x, y - h); ctx.lineTo(x + 7, y); ctx.fill();
        ctx.fillStyle = '#d9a7ff';
        ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x, y - h * .9); ctx.lineTo(x + 2, y); ctx.fill();
        ctx.restore();
      }
    },
    souldestroyer(ctx, fx, p) { glow(ctx, fx.from.x, fx.from.y - 16, 30, '#b77ae0', 1 - p); },
    rolling(ctx, fx, p, time) {
      for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = i ? '#ffffff' : '#ebc0ff';
        ctx.lineWidth = i ? 2 : 9;
        ctx.beginPath();
        const start = time * 16;
        ctx.arc(fx.x, fx.y - 10, fx.radius * (.55 + .35 * ease(p)), start, start + 4.4);
        ctx.stroke();
        ctx.restore();
      }
      for (let i = 0; i < 4; i++) {
        const a = time * 16 + i * TAU / 4;
        star(ctx, fx.x + Math.cos(a) * fx.radius * .8, fx.y - 10 + Math.sin(a) * fx.radius * .8, 9, 2, 4, a, '#f6dcff', 1 - p);
      }
    },
    counterslash(ctx, fx, p) {
      const s = fx.radius * ease(p);
      for (const [w, c] of [[11, '#dba5f9'], [3, '#ffffff']]) {
        line(ctx, fx.x - s, fx.y - 10 - s * .5, fx.x + s, fx.y - 10 + s * .5, c, w, 1 - p);
        line(ctx, fx.x + s, fx.y - 10 - s * .5, fx.x - s, fx.y - 10 + s * .5, c, w, 1 - p);
      }
      ring(ctx, fx.x, fx.y, s, '#e8c3ff', 3, 1 - p);
    },
    ripper(ctx, fx, p, time) {
      const t = ease(p);
      const x = fx.from.x + Math.cos(fx.angle) * fx.length * t;
      const y = fx.from.y + Math.sin(fx.angle) * fx.length * t;
      for (let i = 0; i < 4; i++) {
        const a = time * 22 + i * Math.PI / 2;
        line(ctx, x, y - 16, x + Math.cos(a) * 24, y - 16 + Math.sin(a) * 24, i % 2 ? '#ffffff' : '#ef9cff', 4, 1 - p * .6);
      }
      glow(ctx, x, y - 16, 30, '#f0b0ff', 1 - p);
    },
    // ===== Novice T. =====
    firstaid(ctx, fx, p) {
      cross(ctx, fx.x, fx.y - up(20 + 30 * p), 14, '#9be6a6', 1 - p);
      glow(ctx, fx.x, fx.y - up(16), 30, '#b6e9bf', .5 * (1 - p));
    },
    playdead(ctx, fx, p) {
      glow(ctx, fx.x, fx.y, 40, '#9a9184', .4 * (1 - p));
      ctx.save();
      ctx.globalAlpha = .7 * (1 - p);
      ctx.fillStyle = '#efeae0';
      const y = fx.y - up(30 + 40 * p);
      ctx.beginPath();
      ctx.arc(fx.x, y, 9, Math.PI, 0);
      ctx.lineTo(fx.x + 9, y + 12);
      for (let i = 0; i < 4; i++) ctx.lineTo(fx.x + 9 - (i + .5) * 4.5, y + (i % 2 ? 12 : 8));
      ctx.lineTo(fx.x - 9, y + 12);
      ctx.fill();
      ctx.fillStyle = '#3a3430';
      ctx.fillRect(fx.x - 4, y - 2, 2, 3); ctx.fillRect(fx.x + 2, y - 2, 2, 3);
      ctx.restore();
    },
    // Warp portal arrival flash.
    warp(ctx, fx, p, time) {
      glow(ctx, fx.x, fx.y, 70 * (1 - p) + 10, '#9fd4ff', 1 - p);
      for (let i = 0; i < 3; i++) ring(ctx, fx.x, fx.y, 14 + i * 14 + p * 30, '#e4f4ff', 2, 1 - p);
      sparkles(ctx, fx, p, 14, '#ffffff', 30, 90);
    },
    // Rare drop shine when a card falls.
    carddrop(ctx, fx, p) {
      glow(ctx, fx.x, fx.y, 60 * (1 - p) + 12, '#ffe7a0', 1 - p);
      star(ctx, fx.x, fx.y - 12, 30 * ease(p) + 6, 4, 4, p * 2, '#ffffff', 1 - p);
    },
  };
  const durations = {
    bash: .36, magnum: .6, provoke: .9, endure: .8, pierce: .4, bowling: .55, joint: .45, dragon: .65, ignition: .75,
    fire: .8, frost: .7, storm: .8, spirit: .55, stormgust: 1.1, vermilion: 1.0, napalm: .55, crimson: .55, crimsonHit: .55,
    comet: .55, cometHit: .75, lightning: .45, arrows: .25, shower: .65, arrowstorm: .8, charge: .35, concentration: .9,
    falcon: .55, landmineHit: .5, precise: .3, aimed: .55, wargstrike: .5, holy: .55, heal: .9, blessing: 1.0, agiup: .85,
    magnus: 4, magnusPulse: .45, sanctuary: 1.1, assumptio: .9, adoramus: .75, judex: .65, praefatio: 1.0, mammon: .6,
    cartrev: .6, hammerfall: .7, overthrust: .9, cartterm: .5, axetornado: .6, armcannon: .55, envenom: .6, sand: .5,
    sonicblow: .75, grimtooth: .6, souldestroyer: .3, rolling: .5, counterslash: .45, ripper: .45, firstaid: .6,
    playdead: 1.0, warp: .7, carddrop: .9,
  };
  // Skills that share an animation.
  const alias = { sonicwave: 'charge' };

  // Sprite sheets declared in assets/fx/manifest.js replace the drawn effect of that skill.
  const sheets = {};
  if (typeof fxSheets !== 'undefined') {
    for (const [id, def] of Object.entries(fxSheets)) {
      const img = new Image();
      img.src = 'assets/fx/' + def.file;
      sheets[id] = { def, img };
    }
  }
  renderers.sheet = (ctx, fx, p) => {
    const { def, img } = fx.sheet;
    const frame = Math.min(def.frames - 1, Math.floor(p * def.frames));
    const columns = def.columns ?? def.frames;
    const scale = (def.scale ?? 1) * UP;
    const point = def.at === 'caster' && fx.from ? fx.from : fx;
    const [ax, ay] = def.anchor ?? [.5, .75];
    ctx.globalCompositeOperation = def.blend ?? 'lighter';
    ctx.drawImage(img, (frame % columns) * def.w, Math.floor(frame / columns) * def.h, def.w, def.h,
      point.x - def.w * ax * scale * .73, point.y - def.h * ay * scale * .73, def.w * scale * .73, def.h * scale * .73);
  };
  function play(kind, options) {
    const sheet = sheets[kind];
    if (sheet?.img.complete && sheet.img.naturalWidth) {
      const budget=typeof run!=='undefined' && run?.rift?.active ? 28 : 70;
      if (list.length >= budget) list.splice(0,list.length-budget+1);
      list.push({ kind: 'sheet', originalKind:kind, sheet, t: 0, seed: 0, ...options, dur: Math.max(.48, sheet.def.frames / (sheet.def.fps ?? 20) * 1.7) });
      return true;
    }
    const id = renderers[kind] ? kind : alias[kind];
    if (!renderers[id]) return false;
    // Sem origem informada, o efeito sai um pouco atrás do alvo (falcão, sopro do dragão, investida...).
    if (options && !options.from && Number.isFinite(options.x) && Number.isFinite(options.y)) options = { from: { x: options.x - 55, y: options.y + 22 }, ...options };
    if (options?.from && (options.angle == null || options.length == null) && Number.isFinite(options.x) && Number.isFinite(options.y)) {
      const dx = options.x - options.from.x, dy = options.y - options.from.y;
      options = { angle: Math.atan2(dy, dx), length: Math.hypot(dx, dy), ...options };
    }
    const budget=typeof run!=='undefined' && run?.rift?.active ? 28 : 90;
    if (list.length >= budget) list.splice(0,list.length-budget+1);
    list.push({ kind: id, t: 0, dur: options.dur ?? Math.max(.48, (durations[id] ?? .6) * 1.45), seed: Math.random() * 1000, ...options });
    return true;
  }
  function update(dt) {
    for (const fx of list) fx.t += dt;
    list = list.filter(fx => fx.t < fx.dur);
  }
  // V25.6: conta save/restore durante cada animação; se uma falhar no meio, desfaz os níveis que ficaram abertos
  // (antes um erro entre save e restore deixava o canvas encolhendo a cada quadro e o herói sumia).
  function guarded(ctx, run) {
    const save = ctx.save, restore = ctx.restore; let depth = 0;
    ctx.save = function () { depth++; return save.call(this); };
    ctx.restore = function () { if (depth > 0) { depth--; return restore.call(this); } };
    try { run(); } finally { delete ctx.save; delete ctx.restore; while (depth-- > 0) restore.call(ctx); }
  }
  function draw(ctx, time) { guarded(ctx, () => drawAll(ctx, time)); }
  function drawAll(ctx, time) {
    for (const fx of list) {
      if ((fx.x != null && !Number.isFinite(fx.x)) || (fx.y != null && !Number.isFinite(fx.y))) continue;
      ctx.save();
      try {
        const progress = Math.min(1, fx.t / Math.max(.01, fx.dur));
        // A failed sheet or a missing asset must not hide the entire skill animation.
        if (fx.kind === 'sheet' && (!fx.sheet?.img?.naturalWidth || !fx.sheet?.img?.complete)) {
          const fallback = fx.fallback || alias[fx.originalKind] || fx.originalKind;
          if (renderers[fallback]) renderers[fallback](ctx, fx, progress, time);
        } else if (renderers[fx.kind]) renderers[fx.kind](ctx, fx, progress, time);
      } catch (err) { if (!fx.warned) { console.warn('[SkillFX] Animação ignorada:', fx.kind, err); fx.warned = true; } }
      ctx.restore();
    }
  }
  function clear() { list = []; }
  function has(kind) { return !!renderers[kind] || !!renderers[alias[kind]]; }

  // Projectile looks used by shots.
  function drawShot(ctx, shot, time) {
    const angle = Math.atan2(shot.vy, shot.vx);
    const x = shot.x;
    const y = shot.y - 16;
    switch (shot.look) {
      case 'crescent':
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = shot.color; ctx.lineWidth = 6; ctx.globalAlpha = .7;
        ctx.beginPath(); ctx.arc(-6, 0, 18, -1.1, 1.1); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(-6, 0, 18, -1.1, 1.1); ctx.stroke();
        ctx.restore();
        return;
      case 'axe':
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 25);
        ctx.fillStyle = '#c9c9d2';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 12, -.9, .9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7a5530'; ctx.fillRect(-12, -1.5, 14, 3);
        ctx.restore();
        return;
      case 'dark':
        glow(ctx, x, y, 22, '#9b4fd6', .9);
        glow(ctx, x, y, 8, '#f2dcff', 1);
        for (let i = 1; i < 5; i++) glow(ctx, x - Math.cos(angle) * i * 9, y - Math.sin(angle) * i * 9, 12 - i * 2, '#b77ae0', .5 - i * .1);
        return;
      case 'frostOrb':
        glow(ctx,x,y,23,'#8bdfff',.68);
        for(let a=0;a<6;a++){const angle2=time*3+a*Math.PI/3;line(ctx,x,y,x+Math.cos(angle2)*13,y+Math.sin(angle2)*13,'#ecffff',2,.85)}
        glow(ctx,x,y,9,'#f0ffff',1);return;
      case 'fireOrb':
        glow(ctx,x,y,30,'#ff7b3b',.7);flame(ctx,x,y+12,35,9,time,1);glow(ctx,x,y,9,'#fff2b7',1);return;
      case 'holyOrb':
        glow(ctx,x,y,27,'#f9edb5',.8);cross(ctx,x,y+15,22,'#fff8de',.94);return;
      case 'arcane':
        glow(ctx,x,y,26,'#a8b5ff',.7);ring(ctx,x,y,14+Math.sin(time*9)*2,'#f8f0ff',3,.95);
        star(ctx,x,y,10,4,6,time*3,'#fff',1);return;
      case 'orb':
        glow(ctx, x, y, 16, shot.color, .9);
        glow(ctx, x, y, 6, '#ffffff', 1);
        for (let i = 1; i < 4; i++) glow(ctx, x - Math.cos(angle) * i * 8, y - Math.sin(angle) * i * 8, 9 - i * 2, shot.color, .45 - i * .1);
        return;
      case 'bigarrow':
        line(ctx, x - Math.cos(angle) * 40, y - Math.sin(angle) * 40, x, y, '#fffbd0', 5, .4);
        arrowShape(ctx, x, y, angle, 26, shot.color);
        return;
      default:
        arrowShape(ctx, x, y, angle, 20, shot.color);
    }
  }

  return { play, update, draw, clear, has, drawShot, glow, ring, flame, up };
})();
