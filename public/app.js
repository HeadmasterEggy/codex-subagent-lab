const token = document.querySelector('meta[name="lab-token"]').content;
const headers = { 'content-type': 'application/json', 'x-lab-token': token };
const $ = selector => document.querySelector(selector);
let state = { tasks: [] };
let selectedParent = null;
let selectedMessageTask = null;
let activeFilter = 'all';
let taskSearch = '';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = value => value ? new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '';
function matchingTaskIds() {
  return new Set(state.tasks.filter(task => {
    const statusMatches = activeFilter === 'all' || task.status === activeFilter;
    const textMatches = !taskSearch || task.prompt.toLocaleLowerCase().includes(taskSearch.toLocaleLowerCase());
    return statusMatches && textMatches;
  }).map(task => task.id));
}
function visibleTaskIds(matches = matchingTaskIds()) {
  const byId = new Map(state.tasks.map(task => [task.id, task]));
  const visible = new Set();
  for (const task of state.tasks.filter(task => matches.has(task.id))) {
    let current = task;
    while (current && !visible.has(current.id)) {
      visible.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : null;
    }
  }
  return visible;
}
function taskTree(parentId = null, depth = 0, visible = visibleTaskIds(), matches = matchingTaskIds()) {
  return state.tasks.filter(t => t.parentId === parentId && visible.has(t.id)).map(task => {
    const status = task.status;
    const icon = status === 'running' ? '◉' : status === 'completed' ? '✓' : status === 'failed' ? '!' : status === 'cancelled' ? '×' : status === 'queued' ? '◷' : '…';
    const canCancel = ['queued','running'].includes(status);
    const events = task.events.slice(-7).map(e => `<div class="event"><time>${escapeHtml(when(e.at))}</time><span class="event-type">${escapeHtml(e.kind)}</span><span class="event-detail">${escapeHtml(e.detail.replace(/\s+/g,' ').slice(0,180))}</span></div>`).join('');
    const output = task.output ? `<div class="output"><div class="output-head"><span>AGENT OUTPUT</span><span>${task.output.length.toLocaleString()} chars</span></div><div class="output-text">${escapeHtml(task.output)}</div></div>` : '';
    const inbox = task.pendingMessageCount ? `<section class="mailbox"><div class="mailbox-head"><span><span class="inbox-icon">↳</span> INBOX</span><span class="inbox-count">${task.pendingMessageCount} pending</span></div>${(task.recentMessages ?? []).map(message => `<div class="mail-item"><div class="mail-meta"><span class="mail-kind ${message.kind === 'task_result' ? 'result' : ''}">${message.kind === 'task_result' ? 'CHILD RESULT' : 'MESSAGE'}</span><span>from ${escapeHtml(message.from)}</span><time>${escapeHtml(when(message.at))}</time></div><div class="mail-text">${escapeHtml(message.text)}</div></div>`).join('')}</section>` : '';
    const actions = `<div class="task-actions">${canCancel ? `<button class="small-button stop" data-cancel="${task.id}">Stop</button><button class="small-button" data-message="${task.id}">Message</button>` : ''}${depth < 7 ? `<button class="small-button" data-child="${task.id}">＋ Child agent</button>` : ''}</div>`;
    const contextBadge = matches.has(task.id) ? '' : '<span class="badge context-badge">tree context</span>';
    return `<article class="task ${depth ? 'child' : ''} ${matches.has(task.id) ? '' : 'context-task'}"><div class="task-top"><div class="status-mark ${escapeHtml(status)}">${icon}</div><div class="task-main"><div class="task-title">${escapeHtml(task.prompt)}</div><div class="task-meta"><span class="badge">${escapeHtml(status)}</span><span class="badge">${task.createdBy === 'agent' ? 'agent spawned' : 'user started'}</span>${contextBadge}${task.pendingMessageCount ? `<span class="badge inbox-badge">${task.pendingMessageCount} inbox</span>` : ''}${task.contextIncluded ? '<span class="badge">context snapshot</span>' : ''}<span>created ${escapeHtml(when(task.createdAt))}</span>${task.pid ? `<span>pid ${task.pid}</span>` : ''}${task.exitCode !== null ? `<span>exit ${task.exitCode}</span>` : ''}</div></div>${actions}</div>${inbox}${output}${events}</article>${taskTree(task.id, depth + 1, visible, matches)}`;
  }).join('');
}
function render(next) {
  state = next;
  $('#workspace').textContent = next.workspace;
  $('#task-count').textContent = next.tasks.length;
  $('#empty').hidden = next.tasks.length > 0;
  for (const status of ['all','running','queued','completed','failed','cancelled']) {
    const count = status === 'all' ? next.tasks.length : next.tasks.filter(task => task.status === status).length;
    $(`#metric-${status}`).textContent = count;
  }
  const matches = matchingTaskIds();
  const visible = visibleTaskIds(matches);
  const contextCount = visible.size - matches.size;
  $('#visible-count').textContent = `${matches.size} match${matches.size === 1 ? '' : 'es'}${contextCount ? ` · ${contextCount} ancestor${contextCount === 1 ? '' : 's'} for context` : ''}`;
  $('#no-matches').hidden = next.tasks.length === 0 || matches.size > 0;
  document.querySelectorAll('.metric').forEach(button => {
    const active = button.dataset.filter === activeFilter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#clear-filters').hidden = activeFilter === 'all' && !taskSearch;
  $('#tree').innerHTML = taskTree(null, 0, visible, matches);
}
async function request(path, data) {
  const response = await fetch(path, { method: 'POST', headers, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status})`);
  return result;
}
function connect() {
  const events = new EventSource(`/api/events?token=${encodeURIComponent(token)}`, { withCredentials:false });
  // EventSource cannot set a custom header, so include the local per-run token in this same-origin URL.
  events.onopen = () => { $('#connection').textContent = 'Live'; $('.pulse').classList.add('online'); };
  events.onerror = () => { $('#connection').textContent = 'Reconnecting'; $('.pulse').classList.remove('online'); };
  events.addEventListener('state', event => render(JSON.parse(event.data)));
}
document.querySelector('.overview').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  render(state);
});
$('#task-search').addEventListener('input', event => {
  taskSearch = event.target.value.trim();
  render(state);
});
$('#clear-filters').addEventListener('click', () => {
  activeFilter = 'all';
  taskSearch = '';
  $('#task-search').value = '';
  render(state);
  $('#task-search').focus();
});
$('#start-root').addEventListener('click', async () => {
  const button = $('#start-root'); const prompt = $('#prompt').value.trim();
  if (!prompt) { $('#prompt').focus(); return; }
  button.disabled = true;
  try { await request('/api/tasks', { prompt, parentId:null }); $('#prompt').value = ''; }
  catch (error) { alert(error.message); }
  finally { button.disabled = false; }
});
$('#tree').addEventListener('click', async event => {
  const cancelButton = event.target.closest('[data-cancel]');
  const childButton = event.target.closest('[data-child]');
  const messageButton = event.target.closest('[data-message]');
  if (cancelButton) { try { await request(`/api/tasks/${cancelButton.dataset.cancel}/cancel`, {}); } catch(error) { alert(error.message); } }
  if (messageButton) {
    selectedMessageTask = messageButton.dataset.message;
    const task = state.tasks.find(t => t.id === selectedMessageTask);
    $('#message-label').textContent = task ? `Task: ${task.prompt.slice(0,160)}` : '';
    $('#message-text').value = '';
    $('#message-dialog').showModal();
    $('#message-text').focus();
  }
  if (childButton) {
    selectedParent = childButton.dataset.child;
    const parent = state.tasks.find(t => t.id === selectedParent);
    $('#parent-label').textContent = parent ? `Parent: ${parent.prompt.slice(0,160)}` : '';
    $('#child-prompt').value = '';
    $('#include-context').checked = false;
    $('#child-dialog').showModal();
    $('#child-prompt').focus();
  }
});
$('#send-message').addEventListener('click', async event => {
  event.preventDefault();
  const message = $('#message-text').value.trim();
  if (!message || !selectedMessageTask) return;
  const button = $('#send-message'); button.disabled = true;
  try { await request(`/api/tasks/${selectedMessageTask}/message`, { message }); $('#message-dialog').close(); }
  catch(error) { alert(error.message); }
  finally { button.disabled = false; }
});
$('#create-child').addEventListener('click', async event => {
  event.preventDefault();
  const prompt = $('#child-prompt').value.trim();
  if (!prompt || !selectedParent) return;
  const button = $('#create-child'); button.disabled = true;
  try { await request('/api/tasks', { prompt, parentId:selectedParent, includeParentContext:$('#include-context').checked }); $('#child-dialog').close(); }
  catch(error) { alert(error.message); }
  finally { button.disabled = false; }
});
connect();
