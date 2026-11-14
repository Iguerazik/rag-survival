/**
 * V23 — WebSocket mínimo (RFC 6455) sem dependências, usado só pelo modo cooperativo.
 * Suporta texto, ping/pong, fechamento e permessage-deflate.
 * V27: o servidor comprime COM contexto (o compressor lembra os quadros anteriores da mesma conexão), o que corta
 * 40–60% do tráfego dos snapshots. A compressão roda fora da linha principal (zlib assíncrono) e a ordem das
 * mensagens é garantida por uma fila. O cliente → servidor continua sem contexto (mensagens pequenas).
 * Se o navegador pedir server_no_context_takeover, volta ao modo antigo (cada mensagem comprimida sozinha).
 */
import { createHash } from 'node:crypto';
import { deflateRawSync, inflateRawSync, createDeflateRaw, constants as zlibConstants } from 'node:zlib';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MESSAGE = 64 * 1024;
const TAIL = Buffer.from([0x00, 0x00, 0xff, 0xff]);

export function acceptWebSocket(req, socket, head, { onMessage, onClose } = {}) {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket' || req.headers['sec-websocket-version'] !== '13') {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    return null;
  }
  const accept = createHash('sha1').update(key + GUID).digest('base64');
  const offered = String(req.headers['sec-websocket-extensions'] || '');
  const deflate = /\bpermessage-deflate\b/.test(offered) && process.env.WS_DEFLATE !== '0';
  const lines = ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', 'Sec-WebSocket-Accept: ' + accept];
  // V27: compressão com contexto no sentido servidor → cliente (WS_DEFLATE_CONTEXT=0 desliga).
  const context = deflate && !/\bserver_no_context_takeover\b/.test(offered) && process.env.WS_DEFLATE_CONTEXT !== '0';
  if (deflate) lines.push('Sec-WebSocket-Extensions: permessage-deflate; ' + (context ? '' : 'server_no_context_takeover; ') + 'client_no_context_takeover');
  socket.write(lines.join('\r\n') + '\r\n\r\n');
  socket.setNoDelay(true);
  socket.setTimeout(0);

  let buffer = head?.length ? Buffer.from(head) : Buffer.alloc(0);
  let fragments = [], fragmentCompressed = false, fragmentSize = 0;
  let closed = false;
  // V27: fila da compressão com contexto (mantém a ordem; bytes na fila contam como "buffer" do cliente lento).
  const queue = []; let zs = null, busy = false, queued = 0;
  function pump() {
    while (!busy && !closed && queue.length) {
      const next = queue.shift();
      if (next.length <= 256) { queued -= next.length; frame(0x1, next, 0); continue; }
      busy = true;
      if (!zs) {
        zs = createDeflateRaw({ level: 6, memLevel: 8 });
        zs.on('error', () => { busy = false; if (!closed) fail(1011); });
      }
      const parts = [], onData = d => parts.push(d);
      zs.on('data', onData);
      zs.write(next);
      zs.flush(zlibConstants.Z_SYNC_FLUSH, () => {
        zs?.off('data', onData);
        busy = false; queued -= next.length;
        if (closed) return;
        const packed = Buffer.concat(parts);
        frame(0x1, packed.subarray(packed.length - 4).equals(TAIL) ? packed.subarray(0, packed.length - 4) : packed, 0x40);
        pump();
      });
    }
  }
  const conn = {
    open: true,
    deflate,
    context,
    lastSeen: Date.now(),
    ping() { if (!closed) frame(0x9, Buffer.alloc(0), 0); },
    get buffered() { return socket.writableLength + queued; },
    send(text) {
      if (closed) return false;
      if (context) { const payload = Buffer.from(text, 'utf8'); queued += payload.length; queue.push(payload); pump(); return true; }
      let payload = Buffer.from(text, 'utf8'), rsv1 = 0;
      if (deflate && payload.length > 256) {
        const packed = deflateRawSync(payload, { level: 3, finishFlush: zlibConstants.Z_SYNC_FLUSH });
        // permessage-deflate: remove o marcador 00 00 ff ff do final do bloco.
        payload = packed.subarray(packed.length - 4).equals(TAIL) ? packed.subarray(0, packed.length - 4) : packed;
        rsv1 = 0x40;
      }
      frame(0x1, payload, rsv1);
      return true;
    },
    close(code = 1000) {
      if (closed) return;
      const body = Buffer.alloc(2); body.writeUInt16BE(code);
      try { frame(0x8, body, 0); } catch {}
      finish();
      socket.end();
    },
  };
  function frame(opcode, payload, rsv1) {
    const len = payload.length;
    let header;
    if (len < 126) { header = Buffer.alloc(2); header[1] = len; }
    else if (len < 65536) { header = Buffer.alloc(4); header[1] = 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
    header[0] = 0x80 | rsv1 | opcode;
    socket.write(Buffer.concat([header, payload]));
  }
  function finish() {
    if (closed) return;
    closed = true; conn.open = false;
    queue.length = 0; queued = 0; if (zs) { try { zs.close(); } catch {} zs = null; }
    try { onClose?.(conn); } catch (error) { console.error('ws close', error); }
  }
  function fail(code) { conn.close(code); socket.destroy(); }
  function parse() {
    while (buffer.length >= 2) {
      const b0 = buffer[0], b1 = buffer[1];
      const fin = !!(b0 & 0x80), rsv1 = !!(b0 & 0x40), opcode = b0 & 0x0f, masked = !!(b1 & 0x80);
      let len = b1 & 0x7f, offset = 2;
      if (!masked) return fail(1002); // clientes DEVEM mascarar
      if (len === 126) { if (buffer.length < 4) return; len = buffer.readUInt16BE(2); offset = 4; }
      else if (len === 127) { if (buffer.length < 10) return; const big = buffer.readBigUInt64BE(2); if (big > BigInt(MAX_MESSAGE)) return fail(1009); len = Number(big); offset = 10; }
      if (len > MAX_MESSAGE) return fail(1009);
      if (buffer.length < offset + 4 + len) return;
      const mask = buffer.subarray(offset, offset + 4);
      const data = Buffer.from(buffer.subarray(offset + 4, offset + 4 + len));
      for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      buffer = buffer.subarray(offset + 4 + len);
      conn.lastSeen = Date.now();
      if (opcode === 0x8) { conn.close(1000); return; }
      if (opcode === 0x9) { if (!closed) frame(0xA, data, 0); continue; }
      if (opcode === 0xA) continue;
      if (opcode === 0x1 || opcode === 0x2) { fragments = [data]; fragmentCompressed = rsv1; fragmentSize = data.length; }
      else if (opcode === 0x0) { fragments.push(data); fragmentSize += data.length; }
      else return fail(1002);
      if (fragmentSize > MAX_MESSAGE) return fail(1009);
      if (!fin) continue;
      let message = Buffer.concat(fragments); fragments = [];
      if (fragmentCompressed) {
        if (!deflate) return fail(1002);
        try { message = inflateRawSync(Buffer.concat([message, TAIL]), { maxOutputLength: MAX_MESSAGE, finishFlush: zlibConstants.Z_SYNC_FLUSH }); }
        catch { return fail(1007); }
      }
      try { onMessage?.(conn, message.toString('utf8')); }
      catch (error) { console.error('ws message', error); }
    }
  }
  socket.on('data', chunk => {
    buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
    if (buffer.length > MAX_MESSAGE * 2) return fail(1009);
    parse();
  });
  socket.on('error', () => finish());
  socket.on('close', () => finish());
  socket.on('end', () => finish());
  if (buffer.length) parse();
  return conn;
}
