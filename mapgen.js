'use strict';

// Hand-tuned procedural maps. Every wall that blocks movement is drawn as a wall, so there are no
// invisible obstacles. Maps are larger than the old 4000-unit fields and keep wide corridors.
const MapGen = (() => {
  const CELL = 32;
  const VOID = 0, FLOOR = 1, WALL = 2, WATER = 3, BRIDGE = 4, PATH = 5;
  const walkTile = t => t === FLOOR || t === BRIDGE || t === PATH;
  const cache = new Map();

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function grid(w, h, value) {
    const tiles = new Uint8Array(w * h).fill(value);
    return {
      w, h, tiles,
      get: (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? VOID : tiles[y * w + x],
      set: (x, y, t) => { if (x >= 0 && y >= 0 && x < w && y < h) tiles[y * w + x] = t; },
      rect(x0, y0, x1, y1, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); },
      disc(cx, cy, r, t) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.set(x, y, t); },
    };
  }

  // Keeps only floor reachable from the given seeds; the rest becomes wall.
  function keepReachable(g, seeds) {
    const seen = new Uint8Array(g.w * g.h);
    const stack = [];
    for (const [x, y] of seeds) if (walkTile(g.get(x, y))) { seen[y * g.w + x] = 1; stack.push(y * g.w + x); }
    while (stack.length) {
      const i = stack.pop();
      const x = i % g.w;
      const y = (i / g.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        const j = ny * g.w + nx;
        if (!seen[j] && walkTile(g.tiles[j])) { seen[j] = 1; stack.push(j); }
      }
    }
    for (let i = 0; i < g.tiles.length; i++) if (walkTile(g.tiles[i]) && !seen[i]) g.tiles[i] = WALL;
  }
  // Wall cells far from any floor turn into the dark background.
  function hollow(g, reach) {
    const dist = new Int16Array(g.w * g.h).fill(-1);
    const queue = [];
    for (let i = 0; i < g.tiles.length; i++) if (g.tiles[i] !== WALL && g.tiles[i] !== VOID) { dist[i] = 0; queue.push(i); }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head];
      if (dist[i] >= reach) continue;
      const x = i % g.w, y = (i / g.w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        const j = ny * g.w + nx;
        if (dist[j] < 0) { dist[j] = dist[i] + 1; queue.push(j); }
      }
    }
    for (let i = 0; i < g.tiles.length; i++) {
      if (dist[i] < 0) g.tiles[i] = VOID;
      else if (g.tiles[i] === VOID) g.tiles[i] = WALL;
    }
  }

  // ===== Prontera Culvert: wide stone corridors with water channels and bridges =====
  function sewer() {
    const w = 200, h = 200;
    const g = grid(w, h, WALL);
    const r = rng(4242);
    const lines = [18, 46, 74, 100, 126, 154, 182];
    const half = 6;
    const skip = new Set();
    for (let i = 0; i < 10; i++) skip.add(Math.floor(r() * 6) + ',' + Math.floor(r() * 7) + ',' + (r() < .5 ? 'h' : 'v'));
    for (let a = 0; a < lines.length; a++) {
      for (let b = 0; b < lines.length - 1; b++) {
        if (!skip.has(b + ',' + a + ',h')) g.rect(lines[b], lines[a] - half, lines[b + 1], lines[a] + half - 1, FLOOR);
        if (!skip.has(b + ',' + a + ',v')) g.rect(lines[a] - half, lines[b], lines[a] + half - 1, lines[b + 1], FLOOR);
      }
    }
    // Water down the middle of alternating corridors.
    for (let a = 1; a < lines.length; a += 2) {
      const c = lines[a];
      for (let x = lines[0]; x <= lines[6]; x++) {
        if (lines.some(l => Math.abs(x - l) <= half + 1)) continue;
        if (g.get(x, c) === FLOOR) { g.set(x, c - 1, (x % 9 === 0) ? BRIDGE : WATER); g.set(x, c, (x % 9 === 0) ? BRIDGE : WATER); }
      }
      for (let y = lines[0]; y <= lines[6]; y++) {
        if (lines.some(l => Math.abs(y - l) <= half + 1)) continue;
        if (g.get(c, y) === FLOOR) { g.set(c - 1, y, (y % 9 === 0) ? BRIDGE : WATER); g.set(c, y, (y % 9 === 0) ? BRIDGE : WATER); }
      }
    }
    // Chambers at some junctions and a big central hall.
    for (const y of lines) for (const x of lines) if (r() < .32) g.rect(x - 7, y - 7, x + 6, y + 6, FLOOR);
    g.rect(86, 86, 113, 113, FLOOR);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.disc(100 + Math.cos(a) * 9, 100 + Math.sin(a) * 9, 1.6, WALL); }
    keepReachable(g, [[100, 100]]);
    hollow(g, 3);
    return { g, spawn: [100, 100], theme: 'sewer', background: '#0d1116' };
  }

  // ===== Payon Cave: rock caverns joined by wide winding tunnels =====
  function cave() {
    const w = 210, h = 210;
    const g = grid(w, h, WALL);
    const r = rng(7171);
    const chambers = [[105, 105, 16]];
    for (let i = 0; i < 14; i++) {
      for (let tries = 0; tries < 40; tries++) {
        const x = 24 + r() * (w - 48), y = 24 + r() * (h - 48), radius = 9 + r() * 7;
        if (chambers.every(([cx, cy, cr]) => Math.hypot(cx - x, cy - y) > cr + radius + 10)) { chambers.push([x, y, radius]); break; }
      }
    }
    const blob = (cx, cy, radius) => {
      for (let y = Math.floor(cy - radius * 1.4); y <= cy + radius * 1.4; y++) for (let x = Math.floor(cx - radius * 1.4); x <= cx + radius * 1.4; x++) {
        const a = Math.atan2(y - cy, x - cx);
        const edge = radius * (1 + .22 * Math.sin(a * 3 + cx) + .12 * Math.sin(a * 7 + cy));
        if (Math.hypot(x - cx, y - cy) <= edge) g.set(x, y, FLOOR);
      }
    };
    for (const [x, y, radius] of chambers) blob(x, y, radius);
    // Join every chamber to its nearest already-linked chamber (a tree), plus a few loops.
    const linked = [0];
    const tunnel = (a, b) => {
      let [x, y] = chambers[a];
      const [tx, ty] = chambers[b];
      for (let step = 0; step < 600; step++) {
        const dx = tx - x, dy = ty - y;
        const d = Math.hypot(dx, dy);
        if (d < 2) break;
        x += dx / d * 1.2 + (r() - .5) * 1.1;
        y += dy / d * 1.2 + (r() - .5) * 1.1;
        g.disc(x, y, 3.4, FLOOR);
      }
    };
    for (let i = 1; i < chambers.length; i++) {
      const near = linked.reduce((best, j) => Math.hypot(chambers[j][0] - chambers[i][0], chambers[j][1] - chambers[i][1]) <
        Math.hypot(chambers[best][0] - chambers[i][0], chambers[best][1] - chambers[i][1]) ? j : best, linked[0]);
      tunnel(near, i);
      linked.push(i);
    }
    for (let k = 0; k < 4; k++) tunnel(1 + Math.floor(r() * (chambers.length - 1)), 1 + Math.floor(r() * (chambers.length - 1)));
    // Rock pillars inside the large caverns.
    for (const [x, y, radius] of chambers) if (radius > 12) for (let k = 0; k < 2; k++) {
      const a = r() * Math.PI * 2;
      g.disc(x + Math.cos(a) * radius * .5, y + Math.sin(a) * radius * .5, 1.6 + r(), WALL);
    }
    // Smooth the edges so the rock looks natural.
    for (let it = 0; it < 2; it++) {
      const copy = g.tiles.slice();
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && copy[(y + dy) * w + x + dx] === WALL) walls++;
        const cur = copy[y * w + x] === WALL;
        g.set(x, y, walls >= 5 || (cur && walls >= 4) ? WALL : FLOOR);
      }
    }
    g.disc(105, 105, 6, FLOOR);
    keepReachable(g, [[105, 105]]);
    hollow(g, 4);
    return { g, spawn: [105, 105], theme: 'cave', background: '#100c12' };
  }


  // ===== Orc Dungeon: connected barracks and broad halls =====
  function orcDungeon() {
    const w = 200, h = 200, g = grid(w, h, WALL), r = rng(77221);
    const centers = [25, 62, 99, 136, 173];
    for (const cy of centers) for (const cx of centers) {
      const bw = 12 + Math.floor(r() * 5), bh = 12 + Math.floor(r() * 6);
      g.rect(cx - bw, cy - bh, cx + bw, cy + bh, FLOOR);
      g.rect(cx - 3, cy - 3, cx + 3, cy + 3, PATH);
    }
    for (const cy of centers) g.rect(13, cy - 4, 185, cy + 4, FLOOR);
    for (const cx of centers) g.rect(cx - 4, 13, cx + 4, 185, FLOOR);
    for (const cy of centers) for (const cx of centers) {
      if (Math.hypot(cx - 99, cy - 99) < 35) continue;
      if (r() < .35) {
        g.rect(cx - 9, cy - 9, cx - 7, cy + 8, WALL);
        g.rect(cx + 7, cy - 9, cx + 9, cy + 8, WALL);
      }
    }
    g.disc(99, 99, 14, FLOOR);
    keepReachable(g, [[99, 99]]); hollow(g, 4);
    return { g, spawn: [99, 99], theme: 'orc', background: '#1a1110' };
  }

  // ===== Geffen Tower: arcane chambers, octagonal landing, central passages =====
  function geffenTower() {
    const w = 195, h = 195, g = grid(w, h, WALL), r = rng(44555);
    const lanes = [25, 62, 97, 132, 170];
    for (const cy of lanes) for (const cx of lanes) {
      g.disc(cx, cy, 17 + r() * 2, FLOOR);
      if (cx !== 97 || cy !== 97) {
        for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
          const dx = Math.round(Math.cos(angle) * 9), dy = Math.round(Math.sin(angle) * 9);
          g.disc(cx + dx, cy + dy, 2.1, WALL);
        }
      }
    }
    for (const cy of lanes) g.rect(15, cy - 4, 179, cy + 4, PATH);
    for (const cx of lanes) g.rect(cx - 4, 15, cx + 4, 179, PATH);
    g.disc(97, 97, 19, FLOOR);
    for (const [dx, dy] of [[-11,-11],[-11,11],[11,-11],[11,11]]) g.disc(97 + dx, 97 + dy, 2, WALL);
    keepReachable(g, [[97, 97]]); hollow(g, 4);
    return { g, spawn: [97, 97], theme: 'geffen', background: '#111020' };
  }

  // ===== Payon Forest: open expanse, compact groves, ponds and winding clearings =====
  function payonForest() {
    const w = 205, h = 205, g = grid(w, h, FLOOR), r = rng(99002);
    g.rect(0, 0, w-1, 4, WALL); g.rect(0, h-5, w-1, h-1, WALL);
    g.rect(0, 0, 4, h-1, WALL); g.rect(w-5, 0, w-1, h-1, WALL);
    for (let i=0;i<105;i++) {
      const x=10+Math.floor(r()*185),y=10+Math.floor(r()*185),rr=1+r()*3;
      if (Math.hypot(x-102,y-102)<16) continue;
      if (i%13===0) g.disc(x,y,rr+3,WATER);
      else g.disc(x,y,rr,WALL);
    }
    for (let x=10;x<195;x++) for(let dy=-3;dy<=3;dy++) {
      const y = Math.round(102 + 14 * Math.sin(x/20)) + dy;
      g.set(x,y,PATH);
    }
    for (let y=10;y<195;y++) for(let dx=-3;dx<=3;dx++) {
      const x = Math.round(102 + 12 * Math.sin(y/23)) + dx;
      g.set(x,y,PATH);
    }
    g.disc(102, 102, 16, FLOOR);
    keepReachable(g, [[102, 102]]); hollow(g, 3);
    return { g, spawn:[102,102], theme: 'payonfield', background: '#182b12' };
  }

  // ===== Labyrinth Forest 3: 5x5 hedge rooms, joined only by random warps =====
  function maze() {
    const R = 40, G = 6, M = 4;
    const w = M * 2 + R * 5 + G * 4, h = w;
    const g = grid(w, h, WALL);
    const r = rng(9393);
    const rooms = [];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
      const x0 = M + i * (R + G), y0 = M + j * (R + G);
      const room = { index: rooms.length, x0, y0, x1: x0 + R - 1, y1: y0 + R - 1, cx: x0 + R / 2, cy: y0 + R / 2 };
      rooms.push(room);
      g.rect(x0 + 3, y0 + 3, room.x1 - 3, room.y1 - 3, FLOOR);
      const cx = Math.floor(room.cx), cy = Math.floor(room.cy);
      const pattern = room.index === 12 ? 0 : Math.floor(r() * 5);
      if (pattern === 0) {
        for (const [ox, oy] of [[-9, -9], [8, -9], [-9, 8], [8, 8]]) g.disc(cx + ox, cy + oy, 2.2, WALL);
      } else if (pattern === 1) {
        g.rect(cx - 4, cy - 4, cx + 3, cy + 3, WALL);
      } else if (pattern === 2) {
        g.rect(cx - 1, y0 + 9, cx + 1, cy - 6, WALL); g.rect(cx - 1, cy + 6, cx + 1, room.y1 - 9, WALL);
        g.rect(x0 + 9, cy - 1, cx - 6, cy + 1, WALL); g.rect(cx + 6, cy - 1, room.x1 - 9, cy + 1, WALL);
      } else if (pattern === 3) {
        g.rect(x0 + 10, cy - 8, room.x1 - 10, cy - 6, WALL); g.rect(x0 + 10, cy + 6, room.x1 - 10, cy + 8, WALL);
      } else {
        g.rect(cx - 9, cy - 9, cx + 8, cy - 7, WALL); g.rect(cx - 9, cy + 6, cx + 8, cy + 8, WALL);
        g.rect(cx - 9, cy - 9, cx - 7, cy + 8, WALL); g.rect(cx + 6, cy - 9, cx + 8, cy + 8, WALL);
        g.rect(cx - 2, cy - 9, cx + 1, cy - 7, FLOOR); g.rect(cx - 2, cy + 6, cx + 1, cy + 8, FLOOR);
        g.rect(cx - 9, cy - 2, cx - 7, cy + 1, FLOOR); g.rect(cx + 6, cy - 2, cx + 8, cy + 1, FLOOR);
      }
      // Dirt paths crossing the room toward the four warps.
      for (let x = x0 + 3; x <= room.x1 - 3; x++) for (let y = cy - 1; y <= cy; y++) if (g.get(x, y) === FLOOR) g.set(x, y, PATH);
      for (let y = y0 + 3; y <= room.y1 - 3; y++) for (let x = cx - 1; x <= cx; x++) if (g.get(x, y) === FLOOR) g.set(x, y, PATH);
      room.warpCells = [[cx, y0 + 5], [room.x1 - 5, cy], [cx, room.y1 - 5], [x0 + 5, cy]];
      for (const [wx, wy] of room.warpCells) g.rect(wx - 2, wy - 2, wx + 2, wy + 2, PATH);
    }
    keepReachable(g, rooms.map(room => room.warpCells[0]));
    hollow(g, 9);
    return { g, spawn: [rooms[12].cx, rooms[12].cy], theme: 'maze', background: '#0e1709', rooms };
  }

  // ===== V13 late-game areas: distinct open floorplans, shortcuts and arenas. =====
  function advancedStage(id) {
    const index = ['glast','mine','temple','shadow'].indexOf(id);
    const w=220,h=220,g=grid(w,h,WALL),r=rng(53013+index*9512);
    const cx=110,cy=110;
    g.disc(cx,cy,23,FLOOR);
    // Four large landmark halls and a wide traversable circular boulevard.
    const halls=[];
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6+(index%2)*.18;
      const radius=53+(i%3)*27;
      const x=Math.round(cx+Math.cos(a)*radius),y=Math.round(cy+Math.sin(a)*radius);
      const rr=12+(index+i)%6;
      halls.push([x,y]);g.disc(x,y,rr,FLOOR);
      for(let j=0;j<=36;j++){
        const t=j/36,px=Math.round(cx+(x-cx)*t),py=Math.round(cy+(y-cy)*t);
        g.disc(px,py,3.8+index*.4,PATH);
      }
    }
    for(let i=0;i<halls.length;i++){
      const [ax,ay]=halls[i],[bx,by]=halls[(i+1)%halls.length];
      for(let j=0;j<=30;j++){const t=j/30;g.disc(Math.round(ax+(bx-ax)*t),Math.round(ay+(by-ay)*t),3.6,FLOOR);}
    }
    for(let j=0;j<17;j++){
      const x=Math.round(18+r()*184),y=Math.round(18+r()*184);
      if(index===0){g.rect(x-6,y-5,x+6,y+5,FLOOR);if(j%2===0)g.rect(x-1,y-10,x+1,y+10,PATH);}
      else if(index===1){g.disc(x,y,5+r()*7,FLOOR);}
      else if(index===2){g.rect(x-8,y-8,x+8,y+8,FLOOR);g.disc(x,y,3,PATH);}
      else{g.disc(x,y,7+r()*9,FLOOR);}
    }
    keepReachable(g,[[cx,cy]]);hollow(g,5);
    const themes=['glast','mine','temple','shadow'];
    return {g,spawn:[cx,cy],theme:themes[index],background:['#10131c','#17130d','#1d1420','#10121c'][index]};
  }

  // ===== Textures =====
  const palettes = {
    glast: {floor:[98,104,124],floor2:[85,94,112],path:[118,119,136],wall:[53,56,77],wallTop:[73,82,104],face:[33,38,60],water:[43,60,78],bridge:[105,102,118],void:'#10131c'},
    mine: {floor:[132,106,79],floor2:[120,93,65],path:[153,126,88],wall:[71,56,40],wallTop:[103,79,54],face:[45,32,24],water:[70,72,65],bridge:[134,99,61],void:'#17130d'},
    temple: {floor:[137,113,135],floor2:[116,99,119],path:[159,139,155],wall:[80,58,90],wallTop:[108,83,117],face:[44,33,60],water:[80,66,112],bridge:[129,103,132],void:'#1d1420'},
    shadow: {floor:[93,111,106],floor2:[78,97,97],path:[111,128,122],wall:[41,59,57],wallTop:[69,88,82],face:[25,37,42],water:[38,70,78],bridge:[95,110,105],void:'#10121c'},
    sewer: { floor: [92, 101, 110], floor2: [82, 92, 99], path: [96, 98, 104], wall: [52, 56, 64], wallTop: [74, 79, 88], face: [36, 39, 46], water: [31, 72, 80], bridge: [112, 86, 58], void: '#0d1116' },
    cave: { floor: [126, 104, 72], floor2: [112, 92, 64], path: [138, 114, 80], wall: [66, 54, 46], wallTop: [98, 82, 66], face: [44, 36, 32], water: [40, 60, 70], bridge: [110, 84, 52], void: '#100c12' },
    orc: { floor: [131, 95, 70], floor2: [115, 80, 61], path: [147, 113, 85], wall: [68, 51, 46], wallTop: [105, 75, 65], face: [45, 32, 28], water: [61, 71, 64], bridge: [118, 87, 60], void: '#1a1110' },
    geffen: { floor: [91, 87, 121], floor2: [80, 74, 107], path: [107, 105, 147], wall: [50, 46, 75], wallTop: [74, 65, 105], face: [34, 31, 57], water: [55, 69, 117], bridge: [104, 83, 119], void: '#111020' },
    payonfield: { floor: [101, 149, 79], floor2: [88, 134, 70], path: [159, 131, 90], wall: [45, 91, 39], wallTop: [67, 113, 48], face: [31, 67, 30], water: [38, 98, 124], bridge: [126, 99, 62], void: '#182b12' },
    maze: { floor: [96, 136, 58], floor2: [84, 124, 50], path: [142, 118, 78], wall: [36, 62, 30], wallTop: [56, 92, 40], face: [26, 44, 22], water: [40, 80, 90], bridge: [110, 84, 52], void: '#0e1709' },
  };
  const tileCache = new Map();
  function texture(theme, kind, variant) {
    const key = theme + kind + variant;
    if (tileCache.has(key)) return tileCache.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CELL;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(CELL, CELL);
    const pal = palettes[theme];
    const base = kind === 'path' ? pal.path : kind === 'floor2' ? pal.floor2 : pal.floor;
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const n = hash(x + variant * 61, y, 3) * .5 + hash(x >> 2, y >> 2, variant + 9) * .5;
      let shade = (n - .5) * 26;
      if (theme === 'sewer' && kind !== 'path') {
        // Flagstones with mortar lines.
        const ox = (variant % 2) * 16;
        if (y % 16 === 0 || (x + (y < 16 ? 0 : ox)) % 32 === 0) shade -= 22;
      }
      if (theme === 'maze' && kind !== 'path' && hash(x, y, variant + 40) > .93) shade += 22;
      const i = (y * CELL + x) * 4;
      img.data[i] = base[0] + shade; img.data[i + 1] = base[1] + shade; img.data[i + 2] = base[2] + shade * .8; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    tileCache.set(key, canvas);
    return canvas;
  }
  const rgb = (c, k = 0, a = 1) => 'rgba(' + Math.round(c[0] + k) + ',' + Math.round(c[1] + k) + ',' + Math.round(c[2] + k) + ',' + a + ')';

  // ===== Chunk renderer =====
  const CHUNK = 16;
  function makeRenderer(field) {
    const chunks = new Map();
    const pal = palettes[field.theme];
    const t = (x, y) => field.get(x, y);
    function decorate(ctx, x, y, px, py, tile) {
      const d = hash(x, y, 77);
      if (field.theme === 'maze' || field.theme === 'payonfield') {
        if (tile === PATH) {
          if (d > .8) { ctx.fillStyle = 'rgba(90,70,45,.5)'; ctx.beginPath(); ctx.ellipse(px + d * 20 + 6, py + 16, 3, 2, 0, 0, 6.3); ctx.fill(); }
          return;
        }
        if (d > .86) {
          const colors = ['#f3e27a', '#f5f1ea', '#e98bb0', '#a7c8f5'];
          ctx.fillStyle = colors[Math.floor(hash(x, y, 5) * 4)];
          for (let i = 0; i < 3; i++) ctx.fillRect(px + 6 + hash(x, y, i) * 20, py + 6 + hash(y, x, i) * 20, 3, 3);
        } else if (d > .7) {
          ctx.strokeStyle = 'rgba(40,70,25,.55)';
          ctx.lineWidth = 1.4;
          for (let i = 0; i < 4; i++) {
            const gx = px + 4 + hash(x, y, i + 9) * 24, gy = py + 10 + hash(x, y, i + 19) * 18;
            ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 2 - i, gy - 7); ctx.stroke();
          }
        }
      } else if (field.theme === 'cave' || field.theme === 'orc') {
        if (d > .82) {
          ctx.fillStyle = 'rgba(70,56,40,.6)';
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 6 + hash(x, y, i) * 20, py + 6 + hash(y, x, i) * 20, 1.5 + hash(x, i, y), 0, 6.3); ctx.fill(); }
        } else if (d > .76) {
          ctx.strokeStyle = 'rgba(60,46,34,.5)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px + 4, py + 10 + d * 10); ctx.lineTo(px + 16, py + 16); ctx.lineTo(px + 28, py + 12 + d * 8); ctx.stroke();
        } else if (d < .02) {
          ctx.fillStyle = '#e6dcc8';
          ctx.fillRect(px + 10, py + 14, 12, 3); ctx.beginPath(); ctx.arc(px + 9, py + 15, 3, 0, 6.3); ctx.arc(px + 23, py + 15, 3, 0, 6.3); ctx.fill();
        }
      } else {
        if (d > .9) { ctx.fillStyle = 'rgba(70,110,70,.45)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 16, 9, 5, d * 3, 0, 6.3); ctx.fill(); }
        else if (d < .008) {
          ctx.fillStyle = '#2b2f35'; ctx.fillRect(px + 6, py + 6, 20, 20);
          ctx.strokeStyle = '#555c66'; ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(px + 9 + i * 5, py + 7); ctx.lineTo(px + 9 + i * 5, py + 25); ctx.stroke(); }
        }
      }
    }
    function render(cx, cy) {
      const canvas = document.createElement('canvas');
      const size = CHUNK * CELL;
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = pal.void;
      ctx.fillRect(0, 0, size, size);
      const x0 = cx * CHUNK, y0 = cy * CHUNK;
      // Ground.
      for (let y = y0; y < y0 + CHUNK; y++) for (let x = x0; x < x0 + CHUNK; x++) {
        const tile = t(x, y);
        const px = (x - x0) * CELL, py = (y - y0) * CELL;
        if (tile === VOID) continue;
        if (tile === WALL) {
          const edge = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => walkTile(t(x + dx, y + dy)));
          if (edge && field.theme !== 'sewer') ctx.drawImage(texture(field.theme, 'floor', 0), px, py);
          else { ctx.fillStyle = rgb(pal.wall); ctx.fillRect(px, py, CELL, CELL); }
          continue;
        }
        if (tile === WATER) {
          ctx.fillStyle = rgb(pal.water);
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = rgb(pal.water, 22, .5);
          ctx.fillRect(px + hash(x, y, 1) * 18, py + 8 + hash(x, y, 2) * 14, 10, 2);
          continue;
        }
        const variant = Math.floor(hash(x, y, 11) * 4);
        const kind = tile === PATH ? 'path' : 'floor';
        ctx.drawImage(texture(field.theme, kind, variant), px, py);
        if (tile === BRIDGE) {
          ctx.fillStyle = rgb(pal.bridge);
          ctx.fillRect(px, py + 2, CELL, CELL - 4);
          ctx.fillStyle = rgb(pal.bridge, -30);
          for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 8, py + 2, 1.5, CELL - 4);
          continue;
        }
        decorate(ctx, x, y, px, py, tile);
      }
      // Large soft color variation, continuous across chunks (no checkerboard).
      const blotch = document.createElement('canvas');
      blotch.width = blotch.height = CHUNK + 2;
      const bctx = blotch.getContext('2d');
      const shade = bctx.createImageData(CHUNK + 2, CHUNK + 2);
      for (let y = 0; y < CHUNK + 2; y++) for (let x = 0; x < CHUNK + 2; x++) {
        const wx = x0 - 1 + x, wy = y0 - 1 + y;
        const n = hash(wx >> 1, wy >> 1, 21) * .55 + hash(wx, wy, 22) * .25 + hash(wx >> 2, wy >> 2, 23) * .2;
        const i = (y * (CHUNK + 2) + x) * 4;
        if (n < .5) shade.data.set([0, 0, 0, Math.round((.5 - n) * (field.theme === 'sewer' ? 100 : 140))], i);
        else shade.data.set([255, 250, 225, Math.round((n - .5) * 70)], i);
      }
      bctx.putImageData(shade, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(blotch, -CELL, -CELL, (CHUNK + 2) * CELL, (CHUNK + 2) * CELL);
      // Soft shadows cast by walls on the floor next to them.
      for (let y = y0; y < y0 + CHUNK; y++) for (let x = x0; x < x0 + CHUNK; x++) {
        const tile = t(x, y);
        if (!walkTile(tile) && tile !== WATER) continue;
        const px = (x - x0) * CELL, py = (y - y0) * CELL;
        const solid = (dx, dy) => { const n = t(x + dx, y + dy); return n === WALL || n === VOID; };
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        if (solid(0, -1)) ctx.fillRect(px, py, CELL, 10);
        if (solid(-1, 0)) ctx.fillRect(px, py, 8, CELL);
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        if (solid(1, 0)) ctx.fillRect(px + CELL - 5, py, 5, CELL);
      }
      // Wall tops, drawn over a one-cell margin so shapes continue across chunk borders.
      for (let y = y0 - 2; y <= y0 + CHUNK + 1; y++) for (let x = x0 - 2; x <= x0 + CHUNK + 1; x++) {
        if (t(x, y) !== WALL) continue;
        const px = (x - x0) * CELL, py = (y - y0) * CELL;
        const open = (dx, dy) => { const n = t(x + dx, y + dy); return n !== WALL && n !== VOID; };
        const edge = open(0, 1) || open(0, -1) || open(1, 0) || open(-1, 0);
        if (field.theme === 'sewer') {
          ctx.fillStyle = rgb(pal.wallTop, (hash(x, y, 3) - .5) * 10);
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = rgb(pal.wall, -12);
          ctx.fillRect(px, py + 15, CELL, 2);
          ctx.fillRect(px + (y % 2 ? 0 : 16), py, 2, 15);
          ctx.fillRect(px + (y % 2 ? 16 : 0), py + 17, 2, 15);
          if (open(0, 1)) {
            ctx.fillStyle = rgb(pal.face);
            ctx.fillRect(px, py + CELL - 12, CELL, 12);
            ctx.fillStyle = 'rgba(0,0,0,.25)';
            ctx.fillRect(px + 4, py + CELL - 12, 2, 12); ctx.fillRect(px + 20, py + CELL - 12, 2, 12);
          }
          if (edge) { ctx.strokeStyle = 'rgba(15,17,20,.7)'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2); }
        } else {
          // Organic rock or hedge: overlapping blobs with a highlight.
          const k = field.theme === 'maze' ? 1 : .9;
          for (let i = 0; i < 3; i++) {
            const bx = px + CELL / 2 + (hash(x, y, i + 1) - .5) * 14;
            const by = py + CELL / 2 + (hash(x, y, i + 4) - .5) * 14;
            const rr = CELL * (.55 + hash(x, y, i + 7) * .25) * k;
            ctx.fillStyle = rgb(pal.wall, (hash(x, y, i) - .5) * 14);
            ctx.beginPath(); ctx.arc(bx, by, rr, 0, 6.3); ctx.fill();
          }
          if (edge) {
            const top = ctx.createRadialGradient(px + 12, py + 9, 2, px + 16, py + 14, CELL * .8);
            top.addColorStop(0, rgb(pal.wallTop, 18, .9)); top.addColorStop(1, rgb(pal.wallTop, 0, 0));
            ctx.fillStyle = top;
            ctx.beginPath(); ctx.arc(px + 16, py + 14, CELL * .62, 0, 6.3); ctx.fill();
            if (field.theme === 'maze') {
              ctx.fillStyle = 'rgba(150,200,90,.35)';
              for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(px + 6 + hash(x, y, i + 30) * 20, py + 4 + hash(x, y, i + 40) * 16, 3, 0, 6.3); ctx.fill(); }
            }
          }
          if (open(0, 1)) {
            ctx.fillStyle = rgb(pal.face, 0, .85);
            ctx.beginPath(); ctx.ellipse(px + 16, py + CELL - 4, 18, 6, 0, 0, 6.3); ctx.fill();
          }
        }
      }
      return canvas;
    }
    function chunk(cx, cy) {
      const key = cx + ',' + cy;
      let canvas = chunks.get(key);
      if (!canvas) {
        canvas = render(cx, cy);
        chunks.set(key, canvas);
        if (chunks.size > 70) chunks.delete(chunks.keys().next().value);
      }
      return canvas;
    }
    // Draws the visible part of the map; at most `budget` new chunks are generated per frame.
    function draw(ctx, bounds, budget = 3) {
      const size = CHUNK * CELL;
      const ox = field.w * CELL / 2, oy = field.h * CELL / 2;
      const c0 = Math.floor((bounds.left + ox) / size), c1 = Math.floor((bounds.right + ox) / size);
      const r0 = Math.floor((bounds.top + oy) / size), r1 = Math.floor((bounds.bottom + oy) / size);
      ctx.fillStyle = pal.void;
      ctx.fillRect(bounds.left - 1, bounds.top - 1, bounds.right - bounds.left + 2, bounds.bottom - bounds.top + 2);
      for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        if (cx < 0 || cy < 0 || cx * CHUNK >= field.w || cy * CHUNK >= field.h) continue;
        const key = cx + ',' + cy;
        if (!chunks.has(key)) { if (budget-- <= 0) continue; }
        ctx.drawImage(chunk(cx, cy), cx * size - ox, cy * size - oy, size, size);
      }
    }
    // Animated shimmer on visible water.
    function water(ctx, bounds, time) {
      if (!field.hasWater) return;
      const ox = field.w * CELL / 2, oy = field.h * CELL / 2;
      const x0 = Math.max(0, Math.floor((bounds.left + ox) / CELL)), x1 = Math.min(field.w - 1, Math.ceil((bounds.right + ox) / CELL));
      const y0 = Math.max(0, Math.floor((bounds.top + oy) / CELL)), y1 = Math.min(field.h - 1, Math.ceil((bounds.bottom + oy) / CELL));
      ctx.fillStyle = 'rgba(190,235,240,.16)';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (field.tiles[y * field.w + x] !== WATER) continue;
        const phase = (time * .8 + hash(x, y, 8)) % 1;
        ctx.fillRect(x * CELL - ox + phase * 24, y * CELL - oy + 6 + hash(x, y, 9) * 18, 8, 1.5);
      }
    }
    return { draw, water };
  }

  function minimap(field) {
    const canvas = document.createElement('canvas');
    canvas.width = field.w;
    canvas.height = field.h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(field.w, field.h);
    const pal = palettes[field.theme];
    for (let i = 0; i < field.tiles.length; i++) {
      const tile = field.tiles[i];
      const c = tile === WALL ? pal.wall : tile === WATER ? pal.water : tile === BRIDGE ? pal.bridge : tile === PATH ? pal.path : tile === FLOOR ? pal.floor : [20, 22, 26];
      img.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  // Decorative props from renewal-props.webp, always placed on wall cells so they never block open floor.
  function props(field, theme) {
    const list = [];
    const r = rng(theme.length * 999);
    for (let y = 1; y < field.h - 1; y++) for (let x = 1; x < field.w - 1; x++) {
      if (field.get(x, y) !== WALL) continue;
      const below = walkTile(field.get(x, y + 1));
      const above = walkTile(field.get(x, y - 1));
      const near = below || above || walkTile(field.get(x + 1, y)) || walkTile(field.get(x - 1, y));
      // A tree standing south of open floor would hide the floor behind its canopy.
      if (above && !below) continue;
      const p = field.world(x, y);
      if (theme === 'maze' || theme === 'payonfield') {
        if ((near && r() < .34) || (!near && r() < .035)) list.push({ x: p.x + (r() - .5) * 10, y: p.y + 8, type: r() < .5 ? 0 : 1, size: .8 + r() * .45, scenery: true });
      } else if (theme === 'cave' || theme === 'orc') {
        if (below && r() < .05) list.push({ x: p.x, y: p.y + 10, type: r() < .6 ? 4 : 2, size: r() < .6 ? .5 : .7 + r() * .3, scenery: true });
      } else if (below && (x % 14 === 7) && r() < .8) {
        list.push({ x: p.x, y: p.y + 10, type: r() < .55 ? 6 : 4, size: .55 + r() * .2, scenery: true });
      }
    }
    return list;
  }

  function build(id) {
    if (cache.has(id)) return cache.get(id);
    const made = id === 'sewer' ? sewer() : id === 'payon' ? cave() : id === 'orc' ? orcDungeon() :
      id === 'geffen' ? geffenTower() : id === 'payonfield' ? payonForest() : ['glast','mine','temple','shadow'].includes(id) ? advancedStage(id) : maze();
    const { g } = made;
    const field = {
      id, w: g.w, h: g.h, cell: CELL, tiles: g.tiles, theme: made.theme, background: made.background,
      get: g.get, nav: new Uint8Array(g.w * g.h),
      world: (x, y) => ({ x: (x + .5) * CELL - g.w * CELL / 2, y: (y + .5) * CELL - g.h * CELL / 2 }),
    };
    for (let i = 0; i < g.tiles.length; i++) field.nav[i] = walkTile(g.tiles[i]) ? 1 : 0;
    field.hasWater = g.tiles.includes(WATER);
    field.size = g.w * CELL;
    const spawn = field.world(Math.floor(made.spawn[0]), Math.floor(made.spawn[1]));
    field.spawn = [spawn.x, spawn.y];
    if (made.rooms) {
      field.rooms = made.rooms.map(room => ({ ...room, center: field.world(Math.floor(room.cx), Math.floor(room.cy)) }));
      field.warps = [];
      for (const room of field.rooms) room.warpCells.forEach(([x, y], side) => {
        const p = field.world(x, y);
        field.warps.push({ room: room.index, side, x: p.x, y: p.y, phase: hash(x, y, 2) * 6 });
      });
    }
    field.props = props(field, made.theme);
    field.renderer = makeRenderer(field);
    field.minimap = minimap(field);
    cache.set(id, field);
    return field;
  }

  return { build, CELL, walkTile, tiles: { VOID, FLOOR, WALL, WATER, BRIDGE, PATH } };
})();
