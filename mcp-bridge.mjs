import { createInterface } from 'node:readline';

const baseUrl = process.env.LAB_COORDINATOR_URL;
const token = process.env.LAB_COORDINATOR_TOKEN;
const taskId = process.env.LAB_TASK_ID;
if (!baseUrl || !token || !taskId) throw new Error('Subagent Lab MCP bridge requires coordinator URL, token, and task ID');

const tools = [
  {
    name: 'spawn_agent',
    description: 'Start a child Codex agent for a bounded subtask. It appears under this task in the Subagent Lab tree. The child shares the fixed read-only workspace and may itself create children.',
    annotations: { title: 'Spawn local child agent', destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['prompt'],
      properties: {
        prompt: { type: 'string', minLength: 1, maxLength: 12000, description: 'A focused task for the child agent.' },
        include_parent_context: { type: 'boolean', description: 'Include a one-time snapshot of this task prompt and latest output.' },
      },
    },
  },
  {
    name: 'list_agents',
    description: 'List this task’s direct child agents and their current state.',
    annotations: { title: 'List child agents', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'wait_agent',
    description: 'Wait for activity in this task’s inbox, including a child result or a message from the parent. This does not consume inbox messages; use read_messages to retrieve them.',
    annotations: { title: 'Wait for child agent', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        timeout_seconds: { type: 'number', minimum: 0, maximum: 300, default: 120 },
      },
    },
  },
  {
    name: 'send_message',
    description: 'Send a message to a direct parent or child task. A running child can retrieve it with read_messages; this is a mailbox, not injected text into its active model turn.',
    annotations: { title: 'Send local inbox message', destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['task_id', 'message'],
      properties: {
        task_id: { type: 'string', description: 'Direct parent or child task ID.' },
        message: { type: 'string', minLength: 1, maxLength: 8000 },
      },
    },
  },
  {
    name: 'read_messages',
    description: 'Read and remove messages from this task’s inbox. Optionally wait briefly for a message. Check again after meaningful work if you expect parent guidance.',
    annotations: { title: 'Read local inbox', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object', additionalProperties: false, properties: {
        wait_seconds: { type: 'number', minimum: 0, maximum: 30, default: 0 },
      },
    },
  },
  {
    name: 'close_agent',
    description: 'Cancel a direct child task, including its descendants, or cancel this task itself.',
    annotations: { title: 'Stop local agent', destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['task_id'],
      properties: { task_id: { type: 'string' } },
    },
  },
];

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      'x-lab-token': token,
      'x-lab-task-id': taskId,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? `Coordinator request failed (${response.status})`);
  return value;
}

async function callTool(name, args) {
  if (name === 'spawn_agent') {
    const value = await request(`/api/coordination/tasks/${taskId}/children`, {
      method: 'POST', body: { prompt: args.prompt, includeParentContext: args.include_parent_context === true },
    });
    return { task_id: value.id, status: value.status, note: 'Child task created in the shared Subagent Lab tree.' };
  }
  if (name === 'list_agents') return await request(`/api/coordination/tasks/${taskId}/children`);
  if (name === 'wait_agent') {
    const seconds = Number.isFinite(args.timeout_seconds) ? Math.max(0, Math.min(300, args.timeout_seconds)) : 120;
    const value = await request(`/api/coordination/tasks/${taskId}/wait?timeout_ms=${Math.round(seconds * 1000)}`);
    return value.timedOut
      ? { timed_out: true, pending_message_count: value.pendingMessageCount }
      : { timed_out: false, pending_message_count: value.pendingMessageCount, messages: value.messages };
  }
  if (name === 'send_message') {
    const value = await request(`/api/coordination/tasks/${encodeURIComponent(args.task_id)}/messages`, {
      method: 'POST', body: { message: args.message },
    });
    return { delivered_to_inbox: value.accepted, message_id: value.id };
  }
  if (name === 'read_messages') {
    const seconds = Number.isFinite(args.wait_seconds) ? Math.max(0, Math.min(30, args.wait_seconds)) : 0;
    return await request(`/api/coordination/tasks/${taskId}/messages?wait_ms=${Math.round(seconds * 1000)}`);
  }
  if (name === 'close_agent') {
    const value = await request(`/api/coordination/tasks/${encodeURIComponent(args.task_id)}/close`, { method: 'POST', body: {} });
    return { task_id: args.task_id, status: value.status };
  }
  throw new Error(`Unknown Subagent Lab tool: ${name}`);
}

function response(id, result, error) {
  const value = error
    ? { jsonrpc: '2.0', id, error: { code: -32000, message: error.message ?? String(error) } }
    : { jsonrpc: '2.0', id, result };
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', async line => {
  let message;
  try { message = JSON.parse(line); }
  catch { return; }
  if (message.method === 'notifications/initialized' || message.id === undefined) return;
  try {
    if (message.method === 'initialize') {
      response(message.id, {
        protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'subagent-lab', version: '0.2.0' },
      });
    } else if (message.method === 'ping') {
      response(message.id, {});
    } else if (message.method === 'tools/list') {
      response(message.id, { tools });
    } else if (message.method === 'tools/call') {
      const name = message.params?.name;
      const result = await callTool(name, message.params?.arguments ?? {});
      const text = JSON.stringify(result, null, 2);
      response(message.id, { content: [{ type: 'text', text }], structuredContent: result, isError: false });
    } else {
      response(message.id, undefined, new Error(`Unsupported MCP method: ${message.method}`));
    }
  } catch (error) {
    if (message.method === 'tools/call') response(message.id, { content: [{ type: 'text', text: error.message }], isError: true });
    else response(message.id, undefined, error);
  }
});
