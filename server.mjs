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
const demoMode = process.env.DEMO_MODE === '1';
const token = randomBytes(24).toString('hex');
const tasks = new Map();
const clients = new Set();
const queue = [];
let active = 0;
const indexHtml = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
const appJs = await readFile(new URL('./public/app.js', import.meta.url), 'utf8');
const styleCss = await readFile(new URL('./public/style.css', import.meta.url), 'utf8');

function snapshot() {
  const publicTasks = [...tasks.values()].map(({ child, effectivePrompt, messages, messageHistory, waiters, resultDelivered, ...task }) => {
    const recentPending = messages.slice(-8);
    const latestPendingResult = [...messages].reverse().find(message => message.kind === 'task_result');
    if (latestPendingResult && !recentPending.includes(latestPendingResult)) recentPending.splice(0, 1, latestPendingResult);
    return {
      ...task,
      pendingMessageCount: messages.length,
      pendingTaskResultCount: messages.filter(message => message.kind === 'task_result').length,
      recentMessages: [
        ...messageHistory.slice(-5),
        ...recentPending.map(message => ({ ...message, deliveryState: 'pending' })),
      ].slice(-8).map(({ id, from, at, text, kind, deliveryState, readAt }) => ({
        id, from, at, text: text.slice(0, 2000), kind: kind ?? 'message', deliveryState, readAt,
      })),
    };
  });
  return { workspace, concurrency, active, queued: queue.length, demoMode, tasks: publicTasks };
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
  if (task.events.length > 120) task.events.splice(0, task.events.length - 120);
  if (kind === 'message') task.output = (task.output + event.detail).slice(-40_000);
  for (const waiter of [...task.waiters]) waiter();
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
function deliverTaskResult(task) {
  if (task.resultDelivered || !terminal(task)) return;
  task.resultDelivered = true;
  const parent = task.parentId ? tasks.get(task.parentId) : null;
  if (!parent) return;
  const result = [
    `Child agent ${task.id} finished with status=${task.status}, exit_code=${task.exitCode ?? 'null'}, signal=${task.signal ?? 'none'}${task.error ? `, error=${task.error}` : ''}.`,
    task.output ? `Final output:\n${task.output.slice(-8000)}` : 'The child produced no captured text output.',
  ].join('\n\n');
  enqueueMessage(parent, {
    id: randomBytes(8).toString('hex'), from: task.id, at: task.finishedAt ?? new Date().toISOString(),
    text: result, kind: 'task_result',
  }, { internal: true });
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
  const bridge = fileURLToPath(new URL('./mcp-bridge.mjs', import.meta.url));
  const args = [
    'exec', '--json', '--ephemeral', '--ignore-user-config', '--sandbox', 'read-only',
    '--config', `mcp_servers.subagent_lab.command=${JSON.stringify(process.execPath)}`,
    '--config', `mcp_servers.subagent_lab.args=${JSON.stringify([bridge])}`,
    '--config', 'mcp_servers.subagent_lab.env_vars=["LAB_COORDINATOR_URL","LAB_COORDINATOR_TOKEN","LAB_TASK_ID"]',
    '--cd', workspace, '--skip-git-repo-check', '-',
  ];
  let child;
  try {
    const env = {
      ...process.env,
      LAB_COORDINATOR_URL: `http://127.0.0.1:${port}`,
      LAB_COORDINATOR_TOKEN: token,
      LAB_TASK_ID: task.id,
    };
    child = spawn('codex', args, { cwd: workspace, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    task.pid = child.pid ?? null;
    task.child = child;
    child.stdin.end(task.effectivePrompt);
  } catch (error) {
    task.status = 'failed'; task.error = error.message; task.finishedAt = new Date().toISOString(); active--; appendEvent(task, 'error', error.message); deliverTaskResult(task); pump(); return;
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
    deliverTaskResult(task);
    pump();
  });
}
function cancelTask(task) {
  if (task.status === 'queued') {
    task.status = 'cancelled'; task.finishedAt = new Date().toISOString();
    const i = queue.indexOf(task.id); if (i >= 0) queue.splice(i, 1);
    appendEvent(task, 'cancelled', 'Cancelled before start'); deliverTaskResult(task); pump(); return;
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
function closeTaskTree(task) {
  for (const childTask of tasks.values()) if (childTask.parentId === task.id) closeTaskTree(childTask);
  cancelTask(task);
}

const terminal = task => ['completed', 'failed', 'cancelled'].includes(task.status);
function taskDepth(task) {
  let depth = 0, cursor = task;
  while (cursor?.parentId) { depth++; cursor = tasks.get(cursor.parentId); }
  return depth;
}
function enqueueMessage(task, item, { internal = false } = {}) {
  const internalCount = task.messages.filter(message => message.kind === 'task_result').length;
  const externalCount = task.messages.length - internalCount;
  if (internal ? internalCount >= 100 : externalCount >= 100) return false;
  if (task.messages.length >= 200) return false;
  task.messages.push(item);
  appendEvent(task, 'message_received', JSON.stringify({ from: item.from, message: item.text.slice(0, 300) }));
  return true;
}
function waitForInboxActivity(task, timeoutMs) {
  if (task.messages.length > 0) return Promise.resolve(true);
  return new Promise(resolve => {
    let finished = false;
    const done = value => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      task.waiters.delete(check);
      resolve(value);
    };
    const check = () => { if (task.messages.length > 0) done(true); };
    const timer = setTimeout(() => done(false), timeoutMs);
    task.waiters.add(check);
  });
}
function createTask({ prompt, parentId = null, includeParentContext = false, createdBy = 'user' }) {
  const parent = parentId ? tasks.get(parentId) : null;
  const contextIncluded = Boolean(parent && includeParentContext);
  const parentContext = contextIncluded
    ? `\n\nParent context snapshot (reference material; follow the child task below):\n<parent-task>\n${parent.prompt.slice(0, 4000)}\n</parent-task>\n<parent-output>\n${parent.output.slice(-8000) || '(No agent output yet.)'}\n</parent-output>\n`
    : '';
  const id = randomBytes(12).toString('hex');
  const coordination = `\n\nSubagent Lab coordination: your task ID is ${id}. You may use the subagent_lab MCP tools to create child agents, list them, wait for inbox activity, send messages, read messages sent to you, and close child agents. Child tasks run as separate Codex CLI processes in the same read-only workspace. Child completion results are delivered to this task's inbox; use wait_agent, then read_messages to inspect them. Report important child results in your final response.`;
  const task = {
    id, parentId, prompt, contextIncluded, createdBy,
    effectivePrompt: `${coordination}${parentContext}\nTask:\n${prompt}`,
    status: 'queued', createdAt: new Date().toISOString(), startedAt: null, finishedAt: null,
    pid: null, exitCode: null, signal: null, error: null, output: '', events: [], messages: [], messageHistory: [], waiters: new Set(), child: null, resultDelivered: false,
  };
  tasks.set(id, task); queue.push(id); publish(); pump();
  return task;
}

function seedDemoTasks() {
  if (!demoMode) return;
  const now = Date.now();
  const stamp = minutesAgo => new Date(now - minutesAgo * 60_000).toISOString();
  const samples = [
    {
      id: 'd00000000000000000000001', parentId: null, createdBy: 'demo',
      prompt: 'Map the subagent lifecycle from spawn to parent result', status: 'completed',
      createdAt: stamp(24), startedAt: stamp(23), finishedAt: stamp(8), exitCode: 0,
      output: 'Found three distinct paths: task creation, child execution, and result delivery to the parent inbox.',
      events: [
        { at: stamp(23), kind: 'started', detail: 'Demo task started' },
        { at: stamp(17), kind: 'agent_spawned', detail: 'Created two focused child tasks' },
        { at: stamp(8), kind: 'finished', detail: 'status=completed exit=0' },
      ],
      messages: [
        { id: 'd10000000000000000000001', from: 'd00000000000000000000002', at: stamp(9), text: 'Lifecycle trace is ready. Spawn returns after the child input is accepted; it does not wait for child completion.', kind: 'task_result' },
      ],
      messageHistory: [], error: null, pid: null, signal: null,
    },
    {
      id: 'd00000000000000000000002', parentId: 'd00000000000000000000001', createdBy: 'agent',
      prompt: 'Trace spawn admission and child session creation', status: 'completed',
      createdAt: stamp(20), startedAt: stamp(20), finishedAt: stamp(9), exitCode: 0,
      output: 'The handler builds a SpawnRequest, AgentControl creates a thread-backed child session, then the first input is submitted.',
      events: [
        { at: stamp(20), kind: 'started', detail: 'Delegated by parent task' },
        { at: stamp(9), kind: 'finished', detail: 'status=completed exit=0' },
      ], messages: [], messageHistory: [], error: null, pid: null, signal: null,
    },
    {
      id: 'd00000000000000000000003', parentId: 'd00000000000000000000001', createdBy: 'agent',
      prompt: 'Follow completion messages through the parent mailbox', status: 'completed',
      createdAt: stamp(19), startedAt: stamp(19), finishedAt: stamp(10), exitCode: 0,
      output: 'Child completion is queued as inter-agent communication. The activity item and mailbox message have separate delivery semantics.',
      events: [
        { at: stamp(19), kind: 'started', detail: 'Delegated by parent task' },
        { at: stamp(10), kind: 'finished', detail: 'status=completed exit=0' },
      ], messages: [], messageHistory: [], error: null, pid: null, signal: null,
    },
    {
      id: 'd00000000000000000000004', parentId: 'd00000000000000000000003', createdBy: 'agent',
      prompt: 'Check how unread results appear in the inbox', status: 'failed',
      createdAt: stamp(14), startedAt: stamp(14), finishedAt: stamp(11), exitCode: 1,
      output: 'The trace stopped at a version-dependent UI projection boundary.',
      events: [
        { at: stamp(14), kind: 'started', detail: 'Delegated by child task' },
        { at: stamp(11), kind: 'finished', detail: 'status=failed exit=1' },
      ], messages: [], messageHistory: [], error: 'Sample failure: UI projection not confirmed', pid: null, signal: null,
    },
  ];
  for (const sample of samples) {
    tasks.set(sample.id, { ...sample, contextIncluded: false, effectivePrompt: '', waiters: new Set(), resultDelivered: true });
  }
}

seedDemoTasks();

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
  const coordinationMatch = url.pathname.match(/^\/api\/coordination\/tasks\/([a-f0-9]+)\/(children|wait|messages|close)$/);
  if (coordinationMatch) {
    if (!authorized(req)) return sendJson(res, 403, { error: 'Forbidden' });
    const [, id, action] = coordinationMatch;
    const task = tasks.get(id);
    if (!task) return sendJson(res, 404, { error: 'Task not found' });
    if (action === 'children' && req.method === 'GET') {
      if (req.headers['x-lab-task-id'] !== task.id) return sendJson(res, 403, { error: 'Only the parent task can list its children' });
      return sendJson(res, 200, { children: snapshot().tasks.filter(child => child.parentId === task.id) });
    }
    if (action === 'children' && req.method === 'POST') {
      if (req.headers['x-lab-task-id'] !== task.id || task.status !== 'running') return sendJson(res, 409, { error: 'Only a running parent task can spawn children' });
      try {
        const data = await bodyJson(req);
        const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
        if (!prompt || prompt.length > 12_000) return sendJson(res, 400, { error: 'Prompt must be 1 to 12000 characters' });
        if (taskDepth(task) >= 7) return sendJson(res, 429, { error: 'Maximum task nesting depth is 8' });
        if (tasks.size >= 100) return sendJson(res, 429, { error: 'Task limit reached for this server session (100 tasks)' });
        const child = createTask({ prompt, parentId: task.id, includeParentContext: data.includeParentContext === true, createdBy: 'agent' });
        appendEvent(task, 'agent_spawned', JSON.stringify({ childId: child.id, prompt: prompt.slice(0, 200) }));
        return sendJson(res, 201, { id: child.id, status: child.status });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    if (action === 'wait' && req.method === 'GET') {
      if (req.headers['x-lab-task-id'] !== task.id) return sendJson(res, 403, { error: 'A task can wait only for activity in its own inbox' });
      const rawTimeout = Number(url.searchParams.get('timeout_ms'));
      const timeoutMs = url.searchParams.has('timeout_ms') && Number.isFinite(rawTimeout)
        ? Math.max(0, Math.min(300_000, rawTimeout))
        : 120_000;
      const receivedActivity = await waitForInboxActivity(task, timeoutMs);
      return sendJson(res, 200, {
        timedOut: !receivedActivity,
        pendingMessageCount: task.messages.length,
      });
    }
    if (action === 'messages' && req.method === 'POST') {
      const senderId = req.headers['x-lab-task-id'];
      const sender = tasks.get(senderId);
      if (!sender || !(sender.parentId === task.id || task.parentId === sender.id)) return sendJson(res, 403, { error: 'Messages are limited to direct parent-child pairs' });
      if (terminal(task)) return sendJson(res, 409, { error: 'Target task is already finished' });
      try {
        const data = await bodyJson(req);
        const message = typeof data.message === 'string' ? data.message.trim() : '';
        if (!message || message.length > 8000) return sendJson(res, 400, { error: 'Message must be 1 to 8000 characters' });
        const item = { id: randomBytes(8).toString('hex'), from: sender.id, at: new Date().toISOString(), text: message };
        if (!enqueueMessage(task, item)) return sendJson(res, 429, { error: 'Inbox is full (100 messages)' });
        return sendJson(res, 201, { accepted: true, id: item.id });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    if (action === 'messages' && req.method === 'GET') {
      if (req.headers['x-lab-task-id'] !== task.id) return sendJson(res, 403, { error: 'A task can read only its own inbox' });
      const rawWait = Number(url.searchParams.get('wait_ms'));
      const waitMs = Number.isFinite(rawWait) ? Math.max(0, Math.min(30_000, rawWait)) : 0;
      if (task.messages.length === 0 && waitMs > 0) {
        await new Promise(resolveWait => {
          let done = false;
          const finish = () => { if (done) return; done = true; clearTimeout(timer); task.waiters.delete(checkMessages); resolveWait(); };
          const checkMessages = () => { if (task.messages.length > 0 || terminal(task)) finish(); };
          const timer = setTimeout(finish, waitMs);
          task.waiters.add(checkMessages);
        });
      }
      const messages = task.messages.splice(0).map(message => ({ ...message, readAt: new Date().toISOString() }));
      for (const message of messages) {
        task.messageHistory.push({ ...message, deliveryState: 'read' });
      }
      if (task.messageHistory.length > 120) task.messageHistory.splice(0, task.messageHistory.length - 120);
      if (messages.length) appendEvent(task, 'messages_read', `${messages.length} message${messages.length === 1 ? '' : 's'} returned to the task process`);
      return sendJson(res, 200, { messages });
    }
    if (action === 'close' && req.method === 'POST') {
      const requesterId = req.headers['x-lab-task-id'];
      const requester = tasks.get(requesterId);
      if (!requester || !(task.parentId === requester.id || task.id === requester.id)) return sendJson(res, 403, { error: 'A task can close itself or a direct child' });
      closeTaskTree(task);
      return sendJson(res, 200, { status: task.status });
    }
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
        if (tasks.size >= 100) return sendJson(res, 429, { error: 'Task limit reached for this server session (100 tasks)' });
        if (parentId && !tasks.has(parentId)) return sendJson(res, 404, { error: 'Parent task not found' });
        if (parentId && taskDepth(tasks.get(parentId)) >= 7) return sendJson(res, 429, { error: 'Maximum task nesting depth is 8' });
        const task = createTask({ prompt, parentId, includeParentContext: data.includeParentContext === true, createdBy: 'user' });
        return sendJson(res, 201, { id: task.id });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    const messageMatch = url.pathname.match(/^\/api\/tasks\/([a-f0-9]+)\/message$/);
    if (req.method === 'POST' && messageMatch) {
      const task = tasks.get(messageMatch[1]);
      if (!task) return sendJson(res, 404, { error: 'Task not found' });
      if (terminal(task)) return sendJson(res, 409, { error: 'Task is already finished' });
      try {
        const data = await bodyJson(req);
        const message = typeof data.message === 'string' ? data.message.trim() : '';
        if (!message || message.length > 8000) return sendJson(res, 400, { error: 'Message must be 1 to 8000 characters' });
        if (!enqueueMessage(task, { id: randomBytes(8).toString('hex'), from: 'user', at: new Date().toISOString(), text: message })) return sendJson(res, 429, { error: 'Inbox is full (100 messages)' });
        return sendJson(res, 201, { accepted: true });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    const match = url.pathname.match(/^\/api\/tasks\/([a-f0-9]+)\/cancel$/);
    if (req.method === 'POST' && match) {
      const task = tasks.get(match[1]);
      if (!task) return sendJson(res, 404, { error: 'Task not found' });
      cancelTask(task); return sendJson(res, 200, { status: task.status });
    }
    return sendJson(res, 404, { error: 'Not found' });
  }
  res.writeHead(404); res.end('Not found');
});
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Codex Subagent Lab: http://127.0.0.1:${port}/\nWorkspace (fixed): ${workspace}\nConcurrency: ${concurrency}\n`);
});
function shutdown() {
  for (const task of tasks.values()) if (task.status === 'running' || task.status === 'cancelling') closeTaskTree(task);
  for (const res of clients) res.end();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3500).unref();
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
