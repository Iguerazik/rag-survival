/**
 * RAG SURVIVAL V24 — backup e restauração do banco de contas (SQLite) na hospedagem.
 *
 * Só funciona com a variável ADMIN_TOKEN definida (24+ caracteres). Sem ela, as rotas respondem 404.
 *   GET  /api/admin/backup   → baixa uma cópia consistente de midgard.sqlite (VACUUM INTO)
 *   GET  /api/admin/status   → contagens (contas, progresso…) e tamanho do volume, sem dados pessoais
 *   POST /api/admin/restore  → envia um midgard.sqlite; o servidor valida, guarda o banco atual em
 *                              DATA_DIR/backups/ e reinicia para trocar o arquivo (somente sem partida em andamento)
 * Cabeçalho obrigatório: Authorization: Bearer <ADMIN_TOKEN>
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { timingSafeEqual, createHash } from 'node:crypto';

const DB = 'midgard.sqlite';
const PENDING = 'restore-pending.sqlite';
const MAX_UPLOAD = 64 * 1024 * 1024;

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Antes de abrir o banco: se há uma restauração pendente, guarda o banco atual e coloca o novo no lugar. */
export function applyPendingRestore(dataDir) {
  // Cópias temporárias de backup/envio que ficaram para trás (processo encerrado no meio).
  for (const f of fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : []) if (/^(backup-tmp-|upload-).*\.sqlite$/.test(f)) fs.rmSync(path.join(dataDir, f), { force: true });
  const pending = path.join(dataDir, PENDING);
  if (!fs.existsSync(pending)) return false;
  const backups = path.join(dataDir, 'backups');
  fs.mkdirSync(backups, { recursive: true });
  const at = stamp();
  for (const suffix of ['', '-wal', '-shm']) {
    const file = path.join(dataDir, DB + suffix);
    if (fs.existsSync(file)) fs.renameSync(file, path.join(backups, `antes-da-restauracao-${at}.sqlite${suffix}`));
  }
  fs.renameSync(pending, path.join(dataDir, DB));
  console.log(`Banco restaurado. O anterior foi guardado em backups/antes-da-restauracao-${at}.sqlite`);
  return true;
}

function authorized(req) {
  const token = process.env.ADMIN_TOKEN || '';
  if (token.length < 24) return null; // desligado
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = createHash('sha256').update(given).digest(), b = createHash('sha256').update(token).digest();
  return timingSafeEqual(a, b);
}

/** Valida um arquivo SQLite enviado: cabeçalho, integridade e tabelas do jogo. Remove sessões antigas. */
function validateUpload(file) {
  const head = Buffer.alloc(16);
  const fd = fs.openSync(file, 'r'); fs.readSync(fd, head, 0, 16, 0); fs.closeSync(fd);
  if (head.toString('latin1') !== 'SQLite format 3\u0000') return 'O arquivo não é um banco SQLite.';
  const db = new DatabaseSync(file);
  try {
    const check = db.prepare('PRAGMA integrity_check').get();
    if (check?.integrity_check !== 'ok') return 'O banco enviado está corrompido.';
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
    for (const t of ['accounts', 'progress']) if (!tables.has(t)) return `Tabela ${t} ausente: não parece ser o banco do jogo.`;
    // As sessões do endereço antigo não servem no novo domínio: todos entram de novo com usuário e senha.
    if (tables.has('sessions')) db.exec('DELETE FROM sessions');
    db.exec('PRAGMA journal_mode=DELETE');
    return '';
  } finally { db.close(); }
}

export function adminRoutes({ dataDir, accounts, send, canRestart }) {
  return async function route(req, res, pathname) {
    const ok = authorized(req);
    if (ok === null) return send(res, 404, { error: 'Não encontrado' });
    if (!ok) return send(res, 401, { error: 'Token inválido' });
    if (pathname === '/api/admin/status' && req.method === 'GET') {
      let volumeBytes = 0;
      for (const f of fs.readdirSync(dataDir, { withFileTypes: true })) if (f.isFile()) volumeBytes += fs.statSync(path.join(dataDir, f.name)).size;
      return send(res, 200, { ...accounts.counts(), dataDir, volumeBytes });
    }
    if (pathname === '/api/admin/backup' && req.method === 'GET') {
      const tmp = path.join(dataDir, `backup-tmp-${stamp()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}.sqlite`);
      try {
        const size = accounts.backupTo(tmp);
        // Lê para a memória e apaga a cópia antes de responder (o banco tem poucos MB).
        const bytes = fs.readFileSync(tmp);
        fs.rmSync(tmp, { force: true });
        res.writeHead(200, { 'Content-Type': 'application/vnd.sqlite3', 'Content-Length': size, 'Cache-Control': 'no-store',
          'Content-Disposition': `attachment; filename="rag-survival-${stamp()}.sqlite"` });
        res.end(bytes);
      } finally { fs.rmSync(tmp, { force: true }); }
      return;
    }
    if (pathname === '/api/admin/restore' && req.method === 'POST') {
      if (!canRestart()) return send(res, 409, { error: 'Há partida em andamento. Tente quando todos estiverem no lobby.' });
      const tmp = path.join(dataDir, 'upload-' + stamp() + '.sqlite');
      let size = 0;
      try {
        const out = fs.createWriteStream(tmp);
        for await (const chunk of req) { size += chunk.length; if (size > MAX_UPLOAD) throw Object.assign(new Error('Arquivo grande demais'), { status: 413 }); out.write(chunk); }
        await new Promise(resolve => out.end(resolve));
        const problem = validateUpload(tmp);
        if (problem) { fs.rmSync(tmp, { force: true }); return send(res, 400, { error: problem }); }
        // Guarda também uma cópia do banco atual antes de reiniciar.
        fs.mkdirSync(path.join(dataDir, 'backups'), { recursive: true });
        accounts.backupTo(path.join(dataDir, 'backups', `copia-antes-do-envio-${stamp()}.sqlite`));
        fs.renameSync(tmp, path.join(dataDir, PENDING));
        send(res, 202, { ok: true, bytes: size, message: 'Banco recebido. O servidor reinicia em 1 s para aplicar.' });
        setTimeout(() => { console.log('Reiniciando para aplicar a restauração do banco…'); process.exit(75); }, 1000).unref?.();
      } catch (error) {
        fs.rmSync(tmp, { force: true });
        return send(res, error.status || 500, { error: error.status ? error.message : 'Falha ao receber o banco.' });
      }
      return;
    }
    return send(res, 404, { error: 'Não encontrado' });
  };
}
