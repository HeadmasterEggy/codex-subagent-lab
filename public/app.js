const token = document.querySelector('meta[name="lab-token"]').content;
const headers = { 'content-type': 'application/json', 'x-lab-token': token };
const $ = selector => document.querySelector(selector);
let state = { tasks: [] };
let selectedTaskId = null;
let selectedParent = null;
let selectedMessageTask = null;
let activeFilter = 'all';
let taskSearch = '';
const collapsedTasks = new Set();
let toastTimer;
let connectionExpired = false;
let connectionCheckPending = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = value => value ? new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';
const statusIcon = status => ({running:'◉',completed:'✓',failed:'!',cancelled:'×',queued:'◷',cancelling:'↗'})[status] ?? '·';
const taskById = id => state.tasks.find(task => task.id === id);
function taskDepth(task) {
  let depth = 0;
  let current = task;
  while (current?.parentId) { depth++; current = taskById(current.parentId); }
  return depth;
}
function isTaskDescendant(id, ancestorId) {
  let current = taskById(id);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = taskById(current.parentId);
  }
  return false;
}

function matchingTaskIds() {
  return new Set(state.tasks.filter(task => {
    const statusMatches = activeFilter === 'all' || task.status === activeFilter;
    const prompt = String(task.prompt ?? '').toLocaleLowerCase();
    return statusMatches && (!taskSearch || prompt.includes(taskSearch.toLocaleLowerCase()));
  }).map(task => task.id));
}
function visibleTaskIds(matches = matchingTaskIds()) {
  const byId = new Map(state.tasks.map(task => [task.id, task]));
  const visible = new Set();
  for (const task of state.tasks.filter(item => matches.has(item.id))) {
    let current = task;
    while (current && !visible.has(current.id)) {
      visible.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : null;
    }
  }
  return visible;
}
function matchingAncestorIds(matches) {
  const byId = new Map(state.tasks.map(task => [task.id, task]));
  const ancestors = new Set();
  for (const id of matches) {
    let parent = byId.get(id)?.parentId ? byId.get(byId.get(id).parentId) : null;
    while (parent && !ancestors.has(parent.id)) {
      ancestors.add(parent.id);
      parent = parent.parentId ? byId.get(parent.parentId) : null;
    }
  }
  return ancestors;
}
function taskTree(parentId = null, depth = 0, visible = visibleTaskIds(), matches = matchingTaskIds(), matchingAncestors = matchingAncestorIds(matches)) {
  return state.tasks.filter(task => task.parentId === parentId && visible.has(task.id)).map(task => {
    const selected = task.id === selectedTaskId;
    const isContext = !matches.has(task.id);
    const hasChildren = state.tasks.some(item => item.parentId === task.id && visible.has(item.id));
    const childCount = state.tasks.filter(item => item.parentId === task.id).length;
    const forcedExpanded = hasChildren && matchingAncestors.has(task.id);
    const expanded = hasChildren && (!collapsedTasks.has(task.id) || forcedExpanded);
    const children = expanded ? taskTree(task.id, depth + 1, visible, matches, matchingAncestors) : '';
    return `<div class="tree-node ${depth ? 'nested' : ''}" role="group">
      <div class="tree-entry ${selected ? 'selected' : ''} ${isContext ? 'context-task' : ''}">
        ${hasChildren ? `<button class="tree-toggle" type="button" data-toggle-children="${escapeHtml(task.id)}" aria-expanded="${expanded}" aria-label="${forcedExpanded ? 'Expanded to show matching tasks' : `${expanded ? 'Collapse' : 'Expand'} ${childCount} child task${childCount === 1 ? '' : 's'}`}" title="${forcedExpanded ? 'Expanded to show matching tasks' : `${expanded ? 'Collapse' : 'Expand'} child tasks`}" ${forcedExpanded ? 'disabled' : ''}><span aria-hidden="true">${expanded ? '▾' : '▸'}</span></button>` : ''}
        <button class="tree-select" type="button" role="treeitem" aria-level="${depth + 1}" aria-selected="${selected}" aria-label="${escapeHtml(task.status)} agent: ${escapeHtml(task.prompt)}" data-select="${escapeHtml(task.id)}">
          <span class="tree-status ${escapeHtml(task.status)}">${statusIcon(task.status)}</span>
          <span class="tree-copy"><span class="tree-title">${escapeHtml(task.prompt)}</span><span class="tree-subline"><span class="status-label ${escapeHtml(task.status)}">${escapeHtml(task.status)}</span>${childCount ? `<span>${childCount} child${childCount === 1 ? '' : 'ren'}</span>` : ''}${task.pendingMessageCount ? `<span class="tree-inbox">↳ ${task.pendingMessageCount}</span>` : ''}</span></span>
          ${isContext ? '<span class="context-label">context</span>' : ''}
        </button>
        <div class="tree-actions">${['queued','running'].includes(task.status) ? `<button class="tree-action stop" type="button" data-cancel="${escapeHtml(task.id)}" aria-label="Stop task">■</button>` : ''}${depth < 7 ? `<button class="tree-action" type="button" data-child="${escapeHtml(task.id)}" aria-label="Add child agent">＋</button>` : ''}</div>
      </div>${children}</div>`;
  }).join('');
}
function renderInspector() {
  const task = taskById(selectedTaskId);
  $('#inspector-empty').hidden = Boolean(task);
  $('#agent-detail').hidden = !task;
  if (!task) { $('#agent-detail').innerHTML = ''; return; }
  const parent = task.parentId ? taskById(task.parentId) : null;
  const children = state.tasks.filter(item => item.parentId === task.id);
  const activeChildren = children.filter(item => ['queued','running','cancelling'].includes(item.status));
  const canMessage = ['queued','running'].includes(task.status);
  const canSpawnChild = taskDepth(task) < 7;
  const events = (task.events ?? []).slice(-10).reverse();
  const inboxItems = task.recentMessages ?? [];
  $('#agent-detail').innerHTML = `<header class="detail-head">
      <div class="detail-kicker"><span class="eyebrow">AGENT INSPECTOR</span><span class="agent-id">${escapeHtml(task.id.slice(0,10))}</span></div>
      <div class="detail-title-row"><span class="detail-status ${escapeHtml(task.status)}">${statusIcon(task.status)}</span><div class="detail-title-wrap"><h3>${escapeHtml(task.createdBy === 'agent' ? 'Delegated agent' : task.parentId ? 'Child agent' : 'Root agent')}</h3><span class="detail-status-text ${escapeHtml(task.status)}">${escapeHtml(task.status)}</span></div></div>
      <p class="detail-prompt">${escapeHtml(task.prompt)}</p>
      <div class="detail-actions">${canMessage ? `<button class="secondary" type="button" data-message="${escapeHtml(task.id)}">↗ <span>Send message</span></button>` : ''}${canSpawnChild ? `<button class="primary" type="button" data-child="${escapeHtml(task.id)}"><span>＋</span> Add child</button>` : '<span class="depth-limit">Maximum depth reached</span>'}${canMessage ? `<button class="icon-control stop" type="button" data-cancel="${escapeHtml(task.id)}" aria-label="Stop this task" title="Stop task">■</button>` : ''}</div>
    </header>
    <section class="detail-section metadata-grid" aria-label="Agent metadata">
      <div class="meta-cell"><span>CREATED</span><strong>${escapeHtml(when(task.createdAt))}</strong></div><div class="meta-cell"><span>STARTED</span><strong>${escapeHtml(when(task.startedAt))}</strong></div><div class="meta-cell"><span>FINISHED</span><strong>${escapeHtml(when(task.finishedAt))}</strong></div><div class="meta-cell"><span>PROCESS</span><strong>${task.pid ? `PID ${escapeHtml(task.pid)}` : task.exitCode !== null ? `Exit ${escapeHtml(task.exitCode)}` : '—'}</strong></div>
    </section>
    ${task.error ? `<section class="error-panel"><span class="error-icon">!</span><div><strong>Agent error</strong><p>${escapeHtml(task.error)}</p></div></section>` : ''}
    <section class="detail-section"><div class="section-title"><h4>Task links</h4><span>${children.length} child${children.length === 1 ? '' : 'ren'}</span></div>${activeChildren.length && ['completed','failed','cancelled'].includes(task.status) ? `<div class="lifecycle-note"><span>↗</span><p>This task has ended. ${activeChildren.length} direct child agent${activeChildren.length === 1 ? '' : 's'} ${activeChildren.length === 1 ? 'is' : 'are'} still active and will continue independently.</p></div>` : ''}<div class="link-list">${parent ? `<button class="link-row" type="button" data-jump="${escapeHtml(parent.id)}"><span class="link-symbol">↑</span><span><small>PARENT AGENT</small><strong>${escapeHtml(parent.prompt)}</strong></span><span>↗</span></button>` : '<div class="root-marker"><span>◎</span> Root task</div>'}${children.map(child => `<button class="link-row" type="button" data-jump="${escapeHtml(child.id)}"><span class="link-symbol">↓</span><span><small>CHILD · ${escapeHtml(child.status.toUpperCase())}</small><strong>${escapeHtml(child.prompt)}</strong></span><span>↗</span></button>`).join('') || (!parent ? '' : '<div class="subtle-empty">No child agents yet</div>')}</div></section>
    <section class="detail-section mailbox-section"><div class="section-title"><h4><span class="section-icon">↳</span> Mailbox</h4><span class="mail-count">${Number(task.pendingMessageCount) || 0} pending</span></div><p class="mailbox-proof">Returned means the coordinator supplied this message to the task tool; it does not prove the model interpreted it.</p>${inboxItems.length ? `<div class="inbox-list">${inboxItems.map(message => `<article class="inbox-item ${message.deliveryState === 'read' ? 'read' : 'pending'}"><div class="inbox-meta"><span class="mail-kind ${message.kind === 'task_result' ? 'result' : ''}">${message.kind === 'task_result' ? 'CHILD RESULT' : 'MESSAGE'}</span><span class="delivery-state ${message.deliveryState === 'read' ? 'read' : 'pending'}">${message.deliveryState === 'read' ? 'RETURNED' : 'PENDING'}</span><span>from ${escapeHtml(message.from)}</span><time>${escapeHtml(when(message.deliveryState === 'read' ? message.readAt : message.at))}</time></div><p>${escapeHtml(message.text)}</p></article>`).join('')}</div>` : `<div class="mailbox-empty"><span>✉</span><div><strong>Inbox is clear</strong><small>Messages and child results will show up here.</small></div></div>`}${canMessage ? `<button class="inbox-compose" type="button" data-message="${escapeHtml(task.id)}">＋ Send this agent a message</button>` : ''}</section>
    <section class="detail-section output-section"><div class="section-title"><h4>Latest output</h4><span>${task.output ? `${String(task.output).length.toLocaleString()} chars` : 'Awaiting output'}</span></div>${task.output ? `<pre class="output-text">${escapeHtml(task.output)}</pre>` : `<div class="output-empty"><span class="output-spinner ${task.status === 'running' ? 'active' : ''}">${task.status === 'running' ? '◌' : '·'}</span><span>${task.status === 'running' ? 'Agent is working. Output will stream in here.' : task.status === 'queued' ? 'Output will appear when this agent starts.' : 'This agent did not produce captured text output.'}</span></div>`}</section>
    <section class="detail-section activity-section"><div class="section-title"><h4>Recent activity</h4><span>${(task.events ?? []).length} events</span></div>${events.length ? `<div class="activity-list">${events.map(event => `<div class="activity-item"><time>${escapeHtml(when(event.at))}</time><span class="activity-dot ${escapeHtml(event.kind)}"></span><span class="activity-copy"><strong>${escapeHtml(event.kind.replaceAll('_',' '))}</strong><small>${escapeHtml(String(event.detail ?? '').replace(/\s+/g,' ').slice(0,220))}</small></span></div>`).join('')}</div>` : '<div class="subtle-empty">No activity recorded yet.</div>'}</section>`;
}
function render(next) {
  const focused = document.activeElement?.dataset ?? {};
  const focusTarget = focused.select ? `[data-select="${CSS.escape(focused.select)}"]` : focused.toggleChildren ? `[data-toggle-children="${CSS.escape(focused.toggleChildren)}"]` : focused.child ? `[data-child="${CSS.escape(focused.child)}"]` : focused.message ? `[data-message="${CSS.escape(focused.message)}"]` : focused.cancel ? `[data-cancel="${CSS.escape(focused.cancel)}"]` : focused.jump ? `[data-jump="${CSS.escape(focused.jump)}"]` : null;
  const treeScroll = $('#tree').scrollTop;
  const pageScroll = window.scrollY;
  state = next;
  const tasks = Array.isArray(next.tasks) ? next.tasks : [];
  $('#workspace').textContent = next.workspace || 'Local workspace';
  $('#task-count').textContent = tasks.length;
  $('#tree-task-count').textContent = tasks.length;
  const capacity = Math.max(1, Number(next.concurrency) || 1);
  const active = Math.max(0, Number(next.active) || 0);
  const queued = Math.max(0, Number(next.queued) || 0);
  $('#active-count').textContent = active;
  $('#capacity-limit').textContent = capacity;
  $('.capacity-track').setAttribute('aria-valuemax', String(capacity));
  $('.capacity-track').setAttribute('aria-valuenow', String(Math.min(active, capacity)));
  $('#capacity-fill').style.width = `${Math.min(100, active / capacity * 100)}%`;
  $('#queue-count').textContent = `${queued} waiting`;
  $('#capacity-state').textContent = active >= capacity ? 'At capacity' : queued ? 'Queue active' : 'Ready';
  $('.capacity-card').classList.toggle('at-capacity', active >= capacity);
  $('#root-prompt-count').textContent = $('#prompt').value.length.toLocaleString();
  $('#empty').hidden = tasks.length > 0;
  for (const status of ['all','running','queued','completed','failed','cancelled']) {
    $(`#metric-${status}`).textContent = status === 'all' ? tasks.length : tasks.filter(task => task.status === status).length;
  }
  const matches = matchingTaskIds();
  const visible = visibleTaskIds(matches);
  const contextCount = visible.size - matches.size;
  $('#visible-count').textContent = `${matches.size} match${matches.size === 1 ? '' : 'es'}${contextCount ? ` · ${contextCount} ancestor${contextCount === 1 ? '' : 's'} for context` : ''}`;
  $('#no-matches').hidden = tasks.length === 0 || matches.size > 0;
  $('#expand-all').disabled = tasks.length === 0 || collapsedTasks.size === 0;
  $('#collapse-all').disabled = tasks.length === 0 || tasks.every(task => !tasks.some(child => child.parentId === task.id) || collapsedTasks.has(task.id));
  document.querySelectorAll('.metric').forEach(button => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  $('#clear-filters').hidden = activeFilter === 'all' && !taskSearch;
  const selectable = tasks.filter(task => visible.has(task.id));
  if (!selectable.some(task => task.id === selectedTaskId)) selectedTaskId = selectable[0]?.id ?? null;
  $('#tree').innerHTML = taskTree(null, 0, visible, matches);
  $('#tree').scrollTop = treeScroll;
  renderInspector();
  if (focusTarget) document.querySelector(focusTarget)?.focus({ preventScroll:true });
  window.scrollTo({ top:pageScroll, behavior:'instant' });
}
async function request(path, data) {
  const response = await fetch(path, { method: 'POST', headers, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status})`);
  return result;
}
function notify(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
}
function connect() {
  const events = new EventSource(`/api/events?token=${encodeURIComponent(token)}`, { withCredentials:false });
  events.onopen = () => {
    if (connectionExpired) return;
    $('#connection').textContent = 'Live';
    $('.pulse').classList.add('online');
    $('.connection').classList.remove('expired');
    $('#reload-session').hidden = true;
  };
  events.onerror = () => {
    if (connectionExpired) return;
    $('#connection').textContent = 'Reconnecting';
    $('.pulse').classList.remove('online');
    if (connectionCheckPending) return;
    connectionCheckPending = true;
    fetch('/api/state', { headers:{ 'x-lab-token':token } })
      .then(response => {
        if (response.status !== 403) return;
        connectionExpired = true;
        events.close();
        $('#connection').textContent = 'Session expired';
        $('.connection').classList.add('expired');
        $('#reload-session').hidden = false;
      })
      .catch(() => {})
      .finally(() => { connectionCheckPending = false; });
  };
  events.addEventListener('state', event => {
    try { render(JSON.parse(event.data)); }
    catch { notify('Received an unreadable state update. Reconnecting…', true); }
  });
}
document.querySelector('.overview').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  render(state);
});
$('#task-search').addEventListener('input', event => { taskSearch = event.target.value.trim(); render(state); });
$('#prompt').addEventListener('input', () => { $('#root-prompt-count').textContent = $('#prompt').value.length.toLocaleString(); });
$('#clear-filters').addEventListener('click', () => {
  activeFilter = 'all'; taskSearch = ''; $('#task-search').value = ''; render(state); $('#task-search').focus();
});
$('#expand-all').addEventListener('click', () => { collapsedTasks.clear(); render(state); });
$('#collapse-all').addEventListener('click', () => {
  collapsedTasks.clear();
  for (const task of state.tasks) {
    if (state.tasks.some(child => child.parentId === task.id)) collapsedTasks.add(task.id);
  }
  render(state);
});
async function startRoot() {
  const button = $('#start-root'); const prompt = $('#prompt').value.trim();
  if (!prompt) { $('#prompt').focus(); notify('Describe the task before starting an agent.', true); return; }
  button.disabled = true;
  try { await request('/api/tasks', { prompt, parentId:null }); $('#prompt').value = ''; $('#root-prompt-count').textContent = '0'; notify('Root agent added to the task queue.'); }
  catch (error) { notify(error.message, true); }
  finally { button.disabled = false; }
}
$('#start-root').addEventListener('click', startRoot);
$('#prompt').addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); startRoot(); }
});
function openChildDialog(id) {
  selectedParent = id;
  const parent = taskById(id);
  $('#parent-label').textContent = parent ? `Parent: ${parent.prompt.slice(0,160)}` : '';
  $('#child-prompt').value = ''; $('#include-context').checked = false;
  $('#child-dialog').showModal(); $('#child-prompt').focus();
}
function openMessageDialog(id) {
  selectedMessageTask = id;
  const task = taskById(id);
  $('#message-label').textContent = task ? `Agent: ${task.prompt.slice(0,160)}` : '';
  $('#message-text').value = ''; $('#message-dialog').showModal(); $('#message-text').focus();
}
function expandTaskAncestors(id) {
  const byId = new Map(state.tasks.map(task => [task.id, task]));
  let current = byId.get(id);
  while (current?.parentId) {
    collapsedTasks.delete(current.parentId);
    current = byId.get(current.parentId);
  }
}
document.addEventListener('click', async event => {
  const cancelButton = event.target.closest('[data-cancel]');
  const childButton = event.target.closest('[data-child]');
  const messageButton = event.target.closest('[data-message]');
  const selectButton = event.target.closest('[data-select]');
  const jumpButton = event.target.closest('[data-jump]');
  const toggleButton = event.target.closest('[data-toggle-children]');
  if (cancelButton) {
    try { await request(`/api/tasks/${cancelButton.dataset.cancel}/cancel`, {}); notify('Stop requested. Child agents continue independently.'); }
    catch(error) { notify(error.message, true); }
    return;
  }
  if (childButton) { openChildDialog(childButton.dataset.child); return; }
  if (messageButton) { openMessageDialog(messageButton.dataset.message); return; }
  if (selectButton) { selectedTaskId = selectButton.dataset.select; expandTaskAncestors(selectedTaskId); render(state); return; }
  if (jumpButton) { selectedTaskId = jumpButton.dataset.jump; expandTaskAncestors(selectedTaskId); render(state); return; }
  if (toggleButton) {
    const id = toggleButton.dataset.toggleChildren;
    if (collapsedTasks.has(id)) collapsedTasks.delete(id);
    else {
      collapsedTasks.add(id);
      if (selectedTaskId && selectedTaskId !== id && isTaskDescendant(selectedTaskId, id)) selectedTaskId = id;
    }
    render(state);
  }
});
$('#send-message').addEventListener('click', async event => {
  event.preventDefault();
  const message = $('#message-text').value.trim();
  if (!message || !selectedMessageTask) { $('#message-text').focus(); return; }
  const button = $('#send-message'); button.disabled = true;
  try { await request(`/api/tasks/${selectedMessageTask}/message`, { message }); $('#message-dialog').close(); notify('Message queued in the agent inbox.'); }
  catch(error) { notify(error.message, true); }
  finally { button.disabled = false; }
});
$('#create-child').addEventListener('click', async event => {
  event.preventDefault();
  const prompt = $('#child-prompt').value.trim();
  if (!prompt || !selectedParent) { $('#child-prompt').focus(); return; }
  const button = $('#create-child'); button.disabled = true;
  try { await request('/api/tasks', { prompt, parentId:selectedParent, includeParentContext:$('#include-context').checked }); $('#child-dialog').close(); notify('Child agent added to the task queue.'); }
  catch(error) { notify(error.message, true); }
  finally { button.disabled = false; }
});
$('#reload-session').addEventListener('click', () => location.reload());
connect();
