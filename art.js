'use strict';

const Art = (() => {
  function asset(file) {
    const image = new Image();
    const ready = new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao carregar ' + file));
    });
    ready.catch(() => {});
    image.src = 'assets/ro/' + file+'?v=12';
    return { image, ready };
  }

  const sheets = Object.fromEntries(Object.keys(roSpriteData).map(id => [id, asset(id + '.png')]));
  const mvpFloor = asset('mvp-floor.png');
  const props = asset('renewal-props.webp');

  function ready() {
    return Promise.all([mvpFloor.ready, props.ready, ...Object.values(sheets).map(entry => entry.ready)]);
  }

  function draw(ctx, id, action, time, x, y, scale) {
    const sheet = sheets[id]?.image;
    const data = roSpriteData[id];
    if (!sheet?.complete || !sheet.naturalWidth || !data) return;
    const group = action - action % 8;
    const direction = action % 8;
    const near = direction & 6;
    const [row, frames] = data.actions[action] ?? data.actions[group + near] ??
      (group === 88 ? data.actions[40 + near] : data.actions[group]) ?? data.actions[near] ?? data.actions[0];
    const frame = Math.max(0, Math.floor(time)) % frames;
    ctx.drawImage(sheet, frame * data.w, row * data.h, data.w, data.h,
      x - data.ox * scale, y - data.oy * scale, data.w * scale, data.h * scale);
  }

  function shadow(ctx, x, y, rx, ry) {
    ctx.fillStyle = '#272c184c';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function portrait(id) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 72;
    const paint = () => {
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      shadow(ctx, 36, 66, 15, 3.5);
      draw(ctx, id, 7, 0, 36, 65, .78);
    };
    sheets[id].ready.then(paint, () => {});
    return canvas;
  }

  return { draw, props: props.image, mvpFloor: mvpFloor.image, portrait, ready, shadow };
})();
