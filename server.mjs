import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const here = fileURLToPath(new URL('.', import.meta.url));
const workspace = resolve(process.argv[2] ?? process.cwd());
const port = Number(process.env.PORT ?? 4317);
const concurrency = 4;
const token = randomBytes(24).toString('hex');
const tasks = new Map();
const clients = new Set();
const queue = [];
let active = 0;
const indexHtml = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
const appJs = await readFile(new URL('./public/app.js', import.meta.url), 'utf8');
const styleCss = await readFile(new URL('./public/style.css', import.meta.url), 'utf8');

function snapshot() {
  const publicTasks = [...tasks.values()].map(({ child, effectivePrompt, ...task }) => task);
  return { workspace, concurrency, active, queued: queue.length, tasks: publicTasks };
}
function publish() {
  const data = `event: state\ndata: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of clients) res.write(data);
}
function sendJson(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}
function authorized(req) {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin) && !/^http:\/\/localhost(?::\d+)?$/.test(origin)) return false;
  const queryToken = new URL(req.url ?? '/', `http://127.0.0.1:${port}`).searchParams.get('token');
  return (req.headers['x-lab-token'] === token || queryToken === token);
}
async function bodyJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32_000) throw new Error('Request body too large');
  }
  return JSON.parse(raw || '{}');
}
function appendEvent(task, kind, detail) {
  const event = { at: new Date().toISOString(), kind, detail: String(detail ?? '').slice(0, 20_000) };
  task.events.push(event);
  if (task.events.length > 300) task.events.splice(0, task.events.length - 300);
  if (kind === 'message') task.output = (task.output + event.detail).slice(-40_000);
  publish();
}
function textFrom(value, depth = 0) {
  if (depth > 4 || value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(v => textFrom(v, depth + 1)).filter(Boolean).join('\n');
  if (typeof value !== 'object') return '';
  if (typeof value.text === 'string') return value.text;
  return ['item', 'content', 'parts', 'message', 'result'].map(k => textFrom(value[k], depth + 1)).filter(Boolean).join('\n');
}
function parseLine(task, line) {
  if (!line.trim()) return;
  let event;
  try { event = JSON.parse(line); } catch { appendEvent(task, 'raw', line); return; }
  const type = event.type ?? event.event ?? 'event';
  const payload = event.item ?? event;
  const extracted = textFrom(payload) || (typeof event.delta === 'string' ? event.delta : '');
  if (extracted && /(agent|message|output|text)/i.test(`${type} ${payload?.type ?? ''}`)) appendEvent(task, 'message', extracted + (extracted.endsWith('\n') ? '' : '\n'));
  appendEvent(task, type, JSON.stringify(event).slice(0, 6000));
}
function pump() {
  while (active < concurrency && queue.length) {
    const task = tasks.get(queue.shift());
    if (!task || task.status !== 'queued') continue;
    active++;
    run(task);
  }
}
function run(task) {
  task.status = 'running';
  task.startedAt = new Date().toISOString();
  appendEvent(task, 'started', 'Starting codex exec with read-only sandbox');
  // The executable and every argument are passed directly; no shell command is constructed.
  const args = ['exec', '--json', '--ephemeral', '--ignore-user-config', '--sandbox', 'read-only', '--cd', workspace, '--skip-git-repo-check', task.effectivePrompt];
  let child;
  try {
    child = spawn('codex', args, { cwd: workspace, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    task.pid = child.pid ?? null;
    task.child = child;
  } catch (error) {
    task.status = 'failed'; task.error = error.message; task.finishedAt = new Date().toISOString(); active--; appendEvent(task, 'error', error.message); pump(); return;
  }
  let stdout = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    stdout += chunk;
    const lines = stdout.split('\n'); stdout = lines.pop() ?? '';
    for (const line of lines) parseLine(task, line);
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => appendEvent(task, 'stderr', chunk));
  child.on('error', error => { task.error = error.message; appendEvent(task, 'error', error.message); });
  child.on('close', (code, signal) => {
    if (stdout.trim()) parseLine(task, stdout);
    task.exitCode = code;
    task.signal = signal;
    task.finishedAt = new Date().toISOString();
    task.pid = null; task.child = null;
    if (task.status === 'cancelling') task.status = 'cancelled';
    else if (task.status === 'running') task.status = code === 0 ? 'completed' : 'failed';
    active--;
    appendEvent(task, 'finished', `status=${task.status} exit=${code ?? 'null'} signal=${signal ?? 'none'}`);
    pump();
  });
}
function cancel(task) {
  if (task.status === 'queued') {
    task.status = 'cancelled'; task.finishedAt = new Date().toISOString();
    const i = queue.indexOf(task.id); if (i >= 0) queue.splice(i, 1);
    appendEvent(task, 'cancelled', 'Cancelled before start'); pump(); return;
  }
  if (task.status !== 'running' || !task.child) return;
  task.status = 'cancelling'; appendEvent(task, 'cancelling', 'Sending termination signal');
  try {
    if (process.platform !== 'win32' && task.child.pid) process.kill(-task.child.pid, 'SIGTERM');
    else task.child.kill('SIGTERM');
  } catch {}
  setTimeout(() => {
    if (task.child?.pid) {
      try { if (process.platform !== 'win32') process.kill(-task.child.pid, 'SIGKILL'); else task.child.kill('SIGKILL'); } catch {}
    }
  }, 2500).unref();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    res.end(indexHtml.replaceAll('__LAB_TOKEN__', token)); return;
  }
  if (req.method === 'GET' && url.pathname === '/app.js') { res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); res.end(appJs); return; }
  if (req.method === 'GET' && url.pathname === '/style.css') { res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' }); res.end(styleCss); return; }
  if (req.method === 'GET' && url.pathname === '/api/events') {
    if (!authorized(req)) { res.writeHead(403); res.end(); return; }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`); clients.add(res);
    req.on('close', () => clients.delete(res)); return;
  }
  if (url.pathname.startsWith('/api/')) {
    if (!authorized(req)) return sendJson(res, 403, { error: 'Forbidden' });
    if (req.method === 'GET' && url.pathname === '/api/state') return sendJson(res, 200, snapshot());
    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      try {
        const data = await bodyJson(req);
        const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
        const parentId = data.parentId == null ? null : String(data.parentId);
        if (!prompt || prompt.length > 12_000) return sendJson(res, 400, { error: 'Prompt must be 1 to 12000 characters' });
        if (tasks.size >= 200) return sendJson(res, 429, { error: 'Task limit reached for this server session' });
        if (parentId && !tasks.has(parentId)) return sendJson(res, 404, { error: 'Parent task not found' });
        const parent = parentId ? tasks.get(parentId) : null;
        const contextIncluded = Boolean(parent && data.includeParentContext === true);
        const parentContext = contextIncluded
          ? `\n\nParent context snapshot (reference material; follow the child task below):\n<parent-task>\n${parent.prompt.slice(0, 4000)}\n</parent-task>\n<parent-output>\n${parent.output.slice(-8000) || '(No agent output yet.)'}\n</parent-output>\n`
          : '';
        const effectivePrompt = `${parentContext}\nChild task:\n${prompt}`;
        const id = randomBytes(12).toString('hex');
        const task = { id, parentId, prompt, contextIncluded, effectivePrompt, status: 'queued', createdAt: new Date().toISOString(), startedAt: null, finishedAt: null, pid: null, exitCode: null, signal: null, error: null, output: '', events: [], child: null };
        tasks.set(id, task); queue.push(id); publish(); pump();
        return sendJson(res, 201, { id });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    const match = url.pathname.match(/^\/api\/tasks\/([a-f0-9]+)\/cancel$/);
    if (req.method === 'POST' && match) {
      const task = tasks.get(match[1]);
      if (!task) return sendJson(res, 404, { error: 'Task not found' });
      cancel(task); return sendJson(res, 200, { status: task.status });
    }
    return sendJson(res, 404, { error: 'Not found' });
  }
  res.writeHead(404); res.end('Not found');
});
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Codex Subagent Lab: http://127.0.0.1:${port}/\nWorkspace (fixed): ${workspace}\nConcurrency: ${concurrency}\n`);
});
function shutdown() {
  for (const task of tasks.values()) if (task.status === 'running' || task.status === 'cancelling') cancel(task);
  for (const res of clients) res.end();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3500).unref();
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
