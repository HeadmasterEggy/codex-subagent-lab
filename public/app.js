const token = document.querySelector('meta[name="lab-token"]').content;
const headers = { 'content-type': 'application/json', 'x-lab-token': token };
const $ = selector => document.querySelector(selector);
let state = { tasks: [] };
let selectedTaskId = null;
let renderedSelectedTaskId = null;
let pendingFocusTaskId = null;
let inspectorNavFrame = 0;
let selectedParent = null;
let selectedMessageTask = null;
let mailboxScenario = 'before-final';
let deliveryModelOpen = false;
let activeFilter = 'all';
let taskSearch = '';
const collapsedTasks = new Set();
let toastTimer;
let connectionExpired = false;
let connectionCheckPending = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = value => value ? new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';
const statusIcon = status => ({running:'◉',completed:'✓',failed:'!',cancelled:'×',queued:'◷',cancelling:'↗',timing_out:'⌛',timed_out:'⌛'})[status] ?? '·';
const elapsedMs = task => task.startedAt ? Math.max(0, new Date(task.finishedAt ?? Date.now()) - new Date(task.startedAt)) : 0;
function durationLabel(ms) {
  const total = Math.floor(ms / 1000); const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60); const seconds = total % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2,'0')}m` : `${minutes}m ${String(seconds).padStart(2,'0')}s`;
}
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
function renderConcurrencyTimeline(task, parent, children) {
  const participants = [...new Map([parent, task, ...children].filter(Boolean).map(item => [item.id, item])).values()];
  if (participants.length < 2) return '';
  const points = participants.flatMap(item => [item.createdAt, item.startedAt, item.finishedAt].filter(Boolean).map(value => new Date(value).getTime()).filter(Number.isFinite));
  if (!points.length) return '';
  const start = Math.min(...points);
  const end = Math.max(Date.now(), ...points);
  const span = Math.max(1, end - start);
  const position = value => Math.max(0, Math.min(100, ((new Date(value).getTime() - start) / span) * 100));
  const rows = participants.map(item => {
    const created = item.createdAt || item.startedAt || new Date(start).toISOString();
    const began = item.startedAt || created;
    const finished = item.finishedAt || new Date(end).toISOString();
    const left = position(began).toFixed(2);
    const width = Math.max(1.2, position(finished) - Number(left)).toFixed(2);
    const createdAt = position(created).toFixed(2);
    const finishedAt = position(finished).toFixed(2);
    const queued = !item.startedAt;
    const label = item.id === task.id ? 'SELECTED' : item.id === parent?.id ? 'PARENT' : 'CHILD';
    return `<div class="timeline-row ${queued ? 'queued' : ''}" role="listitem" aria-label="${label}: ${escapeHtml(item.prompt)}, ${escapeHtml(item.status.replaceAll('_',' '))}">
      <div class="timeline-label"><span>${label}</span><strong>${escapeHtml(item.prompt)}</strong><small>${escapeHtml(item.status.replaceAll('_',' '))}${item.startedAt ? ` · ${escapeHtml(durationLabel(elapsedMs(item)))}` : ' · queued'}</small></div>
      <svg class="timeline-track" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><line class="timeline-gridline" x1="25" x2="25" y1="0" y2="12"/><line class="timeline-gridline" x1="50" x2="50" y1="0" y2="12"/><line class="timeline-gridline" x1="75" x2="75" y1="0" y2="12"/><line class="timeline-created" x1="${createdAt}" x2="${createdAt}" y1="2" y2="10"/><rect class="timeline-run ${escapeHtml(item.status)} ${queued ? 'is-queued' : ''}" x="${left}" y="2" width="${width}" height="8" rx="2"/>${item.finishedAt ? `<line class="timeline-finished" x1="${finishedAt}" x2="${finishedAt}" y1="1" y2="11"/>` : ''}</svg>
    </div>`;
  }).join('');
  return `<section class="concurrency-timeline" aria-label="Parent and child task runtime timeline">
    <div class="timeline-heading"><div><span class="timeline-eyebrow">OVERLAPPING WORK</span><h5>Parent and child execution</h5></div><span>LAB PROCESS TIME</span></div>
    <div class="timeline-axis" aria-hidden="true"><span>${escapeHtml(when(new Date(start).toISOString()))}</span><span>created · running · finished</span><span>${escapeHtml(when(new Date(end).toISOString()))}</span></div>
    <div class="timeline-rows" role="list">${rows}</div>
    <p>Bars show this prototype’s local CLI process lifetime. A child can continue after its parent ends; its result is routed to the structural parent inbox.</p>
  </section>`;
}
function taskTree(parentId = null, depth = 0, visible = visibleTaskIds(), matches = matchingTaskIds(), matchingAncestors = matchingAncestorIds(matches)) {
  return state.tasks.filter(task => task.parentId === parentId && visible.has(task.id)).map(task => {
    const selected = task.id === selectedTaskId;
    const isContext = !matches.has(task.id);
    const hasChildren = state.tasks.some(item => item.parentId === task.id && visible.has(item.id));
    const childCount = state.tasks.filter(item => item.parentId === task.id).length;
    const forcedExpanded = hasChildren && (activeFilter !== 'all' || taskSearch.length > 0) && matchingAncestors.has(task.id);
    const expanded = hasChildren && (!collapsedTasks.has(task.id) || forcedExpanded);
    const children = expanded ? taskTree(task.id, depth + 1, visible, matches, matchingAncestors) : '';
    return `<div class="tree-node ${depth ? 'nested' : ''}" role="group">
      <div class="tree-entry ${selected ? 'selected' : ''} ${isContext ? 'context-task' : ''}">
        ${hasChildren ? `<button class="tree-toggle" type="button" data-toggle-children="${escapeHtml(task.id)}" aria-expanded="${expanded}" aria-label="${forcedExpanded ? 'Expanded to show matching tasks' : `${expanded ? 'Collapse' : 'Expand'} ${childCount} child task${childCount === 1 ? '' : 's'}`}" title="${forcedExpanded ? 'Expanded to show matching tasks' : `${expanded ? 'Collapse' : 'Expand'} child tasks`}" ${forcedExpanded ? 'disabled' : ''}><span aria-hidden="true">${expanded ? '▾' : '▸'}</span></button>` : ''}
        <button class="tree-select" type="button" role="treeitem" tabindex="${selected ? 0 : -1}" aria-level="${depth + 1}" aria-selected="${selected}" ${hasChildren ? `aria-expanded="${expanded}"` : ''} aria-label="${escapeHtml(task.status)} agent: ${escapeHtml(task.prompt)}" data-select="${escapeHtml(task.id)}">
          <span class="tree-status ${escapeHtml(task.status)}">${statusIcon(task.status)}</span>
          <span class="tree-copy"><span class="tree-title">${escapeHtml(task.prompt)}</span><span class="tree-subline"><span class="status-label ${escapeHtml(task.status)}">${escapeHtml(task.status.replaceAll('_',' '))}</span>${task.startedAt ? `<span class="runtime-badge" data-duration-for="${escapeHtml(task.id)}">${durationLabel(elapsedMs(task))}</span>` : ''}${childCount ? `<span>${childCount} child${childCount === 1 ? '' : 'ren'}</span>` : ''}${task.pendingMessageCount ? `<span class="tree-inbox">↳ ${task.pendingMessageCount} message${task.pendingMessageCount === 1 ? '' : 's'}</span>` : ''}</span></span>
          ${isContext ? '<span class="context-label">context</span>' : ''}
        </button>
        ${task.pendingTaskResultCount ? `<button class="tree-result-badge" type="button" data-open-inbox="${escapeHtml(task.id)}" aria-label="Open inbox: ${task.pendingTaskResultCount} pending child result${task.pendingTaskResultCount === 1 ? '' : 's'}">${task.pendingTaskResultCount} result${task.pendingTaskResultCount === 1 ? '' : 's'}</button>` : ''}
        <div class="tree-actions">${state.demoMode ? '' : `${['queued','running'].includes(task.status) ? `<button class="tree-action stop" type="button" data-cancel="${escapeHtml(task.id)}" aria-label="Stop task">■</button>` : ''}${depth < 7 ? `<button class="tree-action" type="button" data-child="${escapeHtml(task.id)}" aria-label="Add child agent">＋</button>` : ''}`}</div>
      </div>${children}</div>`;
  }).join('');
}
function renderInspector() {
  const task = taskById(selectedTaskId);
  $('#inspector-empty').hidden = Boolean(task);
  $('#agent-detail').hidden = !task;
  if (!task) { $('#agent-detail').innerHTML = ''; return; }
  const parent = task.parentId ? taskById(task.parentId) : null;
  const ancestors = [];
  const seenAncestors = new Set([task.id]);
  let ancestor = parent;
  while (ancestor && !seenAncestors.has(ancestor.id)) {
    ancestors.unshift(ancestor);
    seenAncestors.add(ancestor.id);
    ancestor = ancestor.parentId ? taskById(ancestor.parentId) : null;
  }
  const children = state.tasks.filter(item => item.parentId === task.id);
  const activeChildren = children.filter(item => ['queued','running','cancelling','timing_out'].includes(item.status));
  const isSample = state.demoMode || task.createdBy === 'demo';
  const canMessage = !isSample && ['queued','running'].includes(task.status);
  const canSpawnChild = !isSample && taskDepth(task) < 7;
  const canContinue = !isSample && task.canResume && ['completed','failed','cancelled','timed_out'].includes(task.status);
  const terminalStatuses = ['completed','failed','cancelled','timed_out'];
  const sessionState = !task.keepSession
    ? { className:'ephemeral', label:'Ephemeral session', detail:'This run is not retained in Codex history.' }
    : task.canResume && terminalStatuses.includes(task.status)
      ? { className:'ready', label:'Follow-up ready', detail:'Codex returned a thread ID and this task can start a follow-up turn.' }
      : task.canResume
        ? { className:'retained', label:'Session retained · turn active', detail:'The current process owns the active turn; follow-up becomes available after it exits.' }
        : task.status === 'queued'
          ? { className:'pending', label:'Retention enabled · queued', detail:'A resumable Codex session is not available until the task starts and returns a thread ID.' }
          : terminalStatuses.includes(task.status)
            ? { className:'unavailable', label:'No resumable session', detail:'Retention was enabled, but no resumable thread ID was captured for this task.' }
            : { className:'pending', label:'Session starting', detail:'Retention is enabled; waiting for Codex to return a thread ID.' };
  const events = (task.events ?? []).slice(-10).reverse();
  const inboxItems = task.recentMessages ?? [];
  const neighborIds = new Set([parent?.id, ...children.map(child => child.id)].filter(Boolean));
  const interactionItems = state.tasks.flatMap(recipient => (recipient.recentMessages ?? []).map(message => ({ recipient, message })))
    .filter(({ recipient, message }) => (recipient.id === task.id && neighborIds.has(message.from)) || (message.from === task.id && neighborIds.has(recipient.id)))
    .sort((a, b) => new Date(a.message.at) - new Date(b.message.at));
  const relationRole = id => id === task.id ? 'THIS TASK' : id === parent?.id ? 'PARENT' : 'CHILD';
  $('#agent-detail').innerHTML = `<header class="detail-head">
      <div class="detail-kicker"><span class="eyebrow">AGENT INSPECTOR</span>${isSample ? '<span class="sample-tag">SAMPLE DATA</span>' : ''}<span class="agent-id">${escapeHtml(task.id.slice(0,10))}</span></div>
      ${ancestors.length ? `<nav class="task-breadcrumb" aria-label="Parent task path"><span class="breadcrumb-label">PATH</span>${ancestors.map((item, index) => `${index ? '<span class="breadcrumb-separator" aria-hidden="true">/</span>' : ''}<button type="button" data-jump="${escapeHtml(item.id)}" title="Open ${escapeHtml(item.prompt)}"><span>${index ? 'AGENT' : 'ROOT'}</span>${escapeHtml(item.prompt)}</button>`).join('')}</nav>` : ''}
      <div class="detail-title-row"><span class="detail-status ${escapeHtml(task.status)}">${statusIcon(task.status)}</span><div class="detail-title-wrap"><h3>${escapeHtml(task.createdBy === 'agent' ? 'Delegated agent' : task.parentId ? 'Child agent' : 'Root agent')}</h3><span class="detail-status-text ${escapeHtml(task.status)}">${escapeHtml(task.status.replaceAll('_',' '))}</span></div></div>
      <div class="detail-config-chips" aria-label="Agent configuration"><span class="config-model" title="Model: ${escapeHtml(task.model || 'Codex default')}">${escapeHtml(task.model || 'Codex default')}</span><span class="config-effort" title="Reasoning effort: ${escapeHtml(task.reasoningEffort || 'Codex default')}">${escapeHtml(task.reasoningEffort || 'Codex default')}</span><span class="config-timeout" title="Task runtime limit">${task.timeoutSeconds ? `limit ${durationLabel(task.timeoutSeconds * 1000)}` : 'no runtime limit'}</span><span class="session-chip ${sessionState.className}" title="${escapeHtml(sessionState.detail)}"><i aria-hidden="true"></i>${escapeHtml(sessionState.label)}</span></div>
      <p class="detail-prompt">${escapeHtml(task.prompt)}</p>
      <div class="detail-actions">${isSample ? '' : `${canMessage ? `<button class="secondary" type="button" data-message="${escapeHtml(task.id)}">↗ <span>Send message</span></button>` : ''}${canContinue ? `<button class="primary" type="button" data-followup="${escapeHtml(task.id)}">↻ Continue agent</button>` : ''}${canSpawnChild ? `<button class="primary" type="button" data-child="${escapeHtml(task.id)}"><span>＋</span> Add child</button>` : '<span class="depth-limit">Maximum depth reached</span>'}${canMessage ? `<button class="icon-control stop" type="button" data-cancel="${escapeHtml(task.id)}" aria-label="Stop this task" title="Stop task">■</button>` : ''}`}</div>
      <nav class="inspector-nav" aria-label="Jump to task details"><button type="button" data-inspector-target="context">Context</button><button type="button" data-inspector-target="links">Task links</button><button type="button" data-inspector-target="agent-mailbox">Mailbox</button><button type="button" data-inspector-target="output">Output</button><button type="button" data-inspector-target="activity">Activity</button></nav>
    </header>
    <section class="detail-section metadata-grid" aria-label="Agent metadata">
      <div class="meta-cell"><span>CREATED</span><strong>${escapeHtml(when(task.createdAt))}</strong></div><div class="meta-cell"><span>STARTED</span><strong>${escapeHtml(when(task.startedAt))}</strong></div><div class="meta-cell"><span>ELAPSED</span><strong data-duration-for="${escapeHtml(task.id)}">${task.startedAt ? durationLabel(elapsedMs(task)) : '—'}</strong></div><div class="meta-cell"><span>LAST ACTIVITY</span><strong>${escapeHtml(when(task.lastActivityAt ?? task.events?.at(-1)?.at))}</strong></div><div class="meta-cell"><span>RUNTIME LIMIT</span><strong>${task.timeoutSeconds ? durationLabel(task.timeoutSeconds * 1000) : 'None'}</strong></div><div class="meta-cell"><span>PROCESS</span><strong>${task.pid ? `PID ${escapeHtml(task.pid)}` : task.exitCode !== null ? `Exit ${escapeHtml(task.exitCode)}` : '—'}</strong></div>
    </section>
    <section id="context" class="detail-section context-section" aria-label="Task input context">
      <div class="section-title"><h4><span class="section-icon">⌁</span>Input context</h4><span>${parent ? 'CHILD TASK' : 'ROOT TASK'}</span></div>
      <div class="context-flow"><div class="context-step prompt-step"><span class="context-mark">01</span><span><strong>Task prompt</strong><small>Instructions submitted for this agent</small></span><b>INCLUDED</b></div>${parent ? `<div class="context-step ${task.contextIncluded ? 'snapshot-included' : 'snapshot-omitted'}"><span class="context-mark">02</span><span><strong>Parent context snapshot</strong><small>${task.contextIncluded ? 'Parent prompt and latest output captured once at task creation' : 'No parent prompt or output snapshot was included'}</small></span><b>${task.contextIncluded ? 'INCLUDED' : 'OMITTED'}</b></div>` : '<div class="context-step root-step"><span class="context-mark">02</span><span><strong>No parent context</strong><small>This root agent starts from its submitted prompt</small></span><b>ROOT</b></div>'}</div>
      <p class="context-note">A parent snapshot is fixed when the child starts. Later parent output and inbox messages are not inserted into it automatically.</p>
    </section>
    ${isSample ? '<div class="sample-note">Illustrative data only. No Codex process was started.</div>' : ''}${task.timeoutReason ? `<section class="error-panel timeout-panel"><span class="error-icon">⌛</span><div><strong>Task timed out</strong><p>${escapeHtml(task.timeoutReason)}. The task is marked timed out after its process exits.</p></div></section>` : ''}${task.error ? `<section class="error-panel"><span class="error-icon">!</span><div><strong>Agent error</strong><p>${escapeHtml(task.error)}</p></div></section>` : ''}
    <section id="links" class="detail-section"><div class="section-title"><h4>Task links</h4><span>${children.length} child${children.length === 1 ? '' : 'ren'}</span></div>${activeChildren.length && ['completed','failed','cancelled','timed_out'].includes(task.status) ? `<div class="lifecycle-note"><span>↗</span><p>This task has ended. ${activeChildren.length} direct child agent${activeChildren.length === 1 ? '' : 's'} ${activeChildren.length === 1 ? 'is' : 'are'} still active and will continue independently.</p></div>` : ''}<div class="task-relation-map" role="group" aria-label="Task parent and child relationships">${parent ? `<button class="relation-node parent-node" type="button" data-jump="${escapeHtml(parent.id)}"><span class="relation-role">PARENT · ${escapeHtml(parent.status.replaceAll('_',' ').toUpperCase())}</span><strong>${escapeHtml(parent.prompt)}</strong></button><div class="relation-edge"><span aria-hidden="true">↓</span><small>spawned by</small></div>` : ''}<div class="relation-node current-node" aria-current="true"><span class="relation-role">${parent ? 'SELECTED CHILD' : 'ROOT TASK'} · ${escapeHtml(task.status.replaceAll('_',' ').toUpperCase())}</span><strong>${escapeHtml(task.prompt)}</strong></div>${children.length ? `<div class="relation-branch"><div class="relation-edge"><span aria-hidden="true">↓</span><small>spawns ${children.length} child${children.length === 1 ? '' : 'ren'}</small></div><div class="relation-children">${children.map(child => `<button class="relation-node child-node" type="button" data-jump="${escapeHtml(child.id)}"><span class="relation-role">CHILD · ${escapeHtml(child.status.replaceAll('_',' ').toUpperCase())}</span><strong>${escapeHtml(child.prompt)}</strong><span class="relation-open" aria-hidden="true">↗</span></button>`).join('')}</div></div>` : '<div class="relation-empty">No child agents yet</div>'}</div><p class="relation-note">This map shows task ancestry. Messages and child results appear in the mailbox.</p>${renderConcurrencyTimeline(task, parent, children)}<div class="interaction-trace"><div class="section-title"><h4>Direct interaction trace</h4><span>${interactionItems.length} item${interactionItems.length === 1 ? '' : 's'}</span></div>${interactionItems.length ? `<div class="interaction-list">${interactionItems.map(({ recipient, message }) => { const sender = taskById(message.from); const isResult = message.kind === 'task_result'; const isReturned = message.deliveryState === 'read'; return `<article class="interaction-item ${isResult ? 'result' : ''} ${isReturned ? 'returned' : 'pending'}"><div class="interaction-meta"><span class="interaction-kind">${isResult ? 'CHILD RESULT' : 'MESSAGE'}</span><span class="interaction-state ${isReturned ? 'returned' : 'pending'}">${isReturned ? 'SUPPLIED TO TASK TOOL' : 'PENDING IN INBOX'}</span><time>${escapeHtml(when(message.at))}</time></div><div class="interaction-pipeline" role="img" aria-label="${escapeHtml(relationRole(sender?.id))} sends to coordinator inbox, then ${isReturned ? 'the coordinator supplies it to' : 'it waits for'} the ${escapeHtml(relationRole(recipient.id))} task tool"><span class="pipeline-stage sent"><small>FROM · ${relationRole(sender?.id)}</small><strong>${escapeHtml(sender?.prompt ?? message.from)}</strong><b>SENT</b></span><i class="pipeline-link complete" aria-hidden="true">→</i><span class="pipeline-stage queued"><small>COORDINATOR INBOX</small><strong>${escapeHtml(relationRole(recipient.id))} mailbox</strong><b>QUEUED</b></span><i class="pipeline-link ${isReturned ? 'complete' : ''}" aria-hidden="true">→</i><span class="pipeline-stage ${isReturned ? 'supplied' : 'waiting'}"><small>TASK TOOL · ${relationRole(recipient.id)}</small><strong>${escapeHtml(recipient.prompt)}</strong><b>${isReturned ? 'SUPPLIED' : 'WAITING'}</b></span></div><p>${escapeHtml(message.text)}</p></article>`; }).join('')}</div><p class="interaction-proof">“Supplied” means the coordinator included the message in that task tool call. It does not prove the model interpreted it.</p>` : '<div class="interaction-empty">No direct parent/child messages or results in the available snapshot.</div>'}</div></section>
    <section id="agent-mailbox" class="detail-section mailbox-section"><div class="section-title"><h4><span class="section-icon">↳</span> Mailbox</h4><span class="mail-count">${Number(task.pendingMessageCount) || 0} pending · ${Number(task.pendingTaskResultCount) || 0} child results</span></div><p class="mailbox-proof">Returned means the coordinator supplied this message to the task tool; it does not prove the model interpreted it.</p><details class="delivery-model" ${deliveryModelOpen ? 'open' : ''}><summary><span>How Codex V2 chooses whether to wake a child</span><small>source model · 0.162.0-alpha.17.2</small></summary><div class="delivery-mode-grid"><article class="delivery-mode queue-only"><div class="delivery-mode-title"><span class="mode-icon" aria-hidden="true">Ⅱ</span><div><h5>send_message</h5><span>QueueOnly</span></div><b>QUEUE</b></div><div class="mode-flow"><span>Caller</span><i aria-hidden="true">→</i><span>Child mailbox</span><i aria-hidden="true">→</i><span class="mode-outcome">Waits for an eligible turn</span></div><p>Delivery does not start an ordinary idle child. If the child is unloaded, mail waits in runtime memory until a session loads.</p></article><article class="delivery-mode trigger-turn"><div class="delivery-mode-title"><span class="mode-icon" aria-hidden="true">▶</span><div><h5>followup_task</h5><span>TriggerTurn</span></div><b>WAKE</b></div><div class="mode-flow"><span>Caller</span><i aria-hidden="true">→</i><span>Load child + mailbox</span><i aria-hidden="true">→</i><span class="mode-outcome">Start a turn if idle</span></div><p>Targets an existing V2 child and asks the scheduler to start work when it is idle. It does not spawn a replacement child; triggering the root is rejected.</p></article></div><p class="delivery-model-proof">Accepted delivery and an “Interacted” activity do not prove the child model has read the message. <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs" target="_blank" rel="noreferrer">Message handler</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control/delivery.rs" target="_blank" rel="noreferrer">Delivery policy</a></p></details>${inboxItems.length ? `<div class="inbox-list">${inboxItems.map(message => `<article class="inbox-item ${message.deliveryState === 'read' ? 'read' : 'pending'}"><div class="inbox-meta"><span class="mail-kind ${message.kind === 'task_result' ? 'result' : ''}">${message.kind === 'task_result' ? 'CHILD RESULT' : 'MESSAGE'}</span><span class="delivery-state ${message.deliveryState === 'read' ? 'read' : 'pending'}">${message.deliveryState === 'read' ? 'RETURNED' : 'PENDING'}</span><span>from ${escapeHtml(message.from)}</span><time>${escapeHtml(when(message.deliveryState === 'read' ? message.readAt : message.at))}</time></div><p>${escapeHtml(message.text)}</p></article>`).join('')}</div>` : `<div class="mailbox-empty"><span>✉</span><div><strong>Inbox is clear</strong><small>Messages and child results will show up here.</small></div></div>`}${canMessage ? `<button class="inbox-compose" type="button" data-message="${escapeHtml(task.id)}">＋ Send this agent a message</button>` : ''}</section>
    <section id="output" class="detail-section output-section"><div class="section-title"><h4>Latest output</h4><span>${task.output ? `${String(task.output).length.toLocaleString()} chars` : 'Awaiting output'}</span></div>${task.output ? `<pre class="output-text">${escapeHtml(task.output)}</pre>` : `<div class="output-empty"><span class="output-spinner ${task.status === 'running' ? 'active' : ''}">${task.status === 'running' ? '◌' : '·'}</span><span>${task.status === 'running' ? 'Agent is working. Output will stream in here.' : task.status === 'queued' ? 'Output will appear when this agent starts.' : 'This agent did not produce captured text output.'}</span></div>`}</section>
    <section id="activity" class="detail-section activity-section"><div class="section-title"><h4>Recent activity</h4><span>${(task.events ?? []).length} events</span></div>${events.length ? `<div class="activity-list">${events.map(event => `<div class="activity-item"><time>${escapeHtml(when(event.at))}</time><span class="activity-dot ${escapeHtml(event.kind)}"></span><span class="activity-copy"><strong>${escapeHtml(event.kind.replaceAll('_',' '))}</strong><small>${escapeHtml(String(event.detail ?? '').replace(/\s+/g,' ').slice(0,220))}</small></span></div>`).join('')}</div>` : '<div class="subtle-empty">No activity recorded yet.</div>'}</section>`;
  const deliveryModel = $('#agent-mailbox .delivery-model');
  if (deliveryModel) deliveryModel.insertAdjacentHTML('beforeend', mailboxTimingMarkup());
}
function mailboxTimingMarkup() {
  const beforeFinal = mailboxScenario === 'before-final';
  return `<section class="mailbox-timing" data-scenario="${mailboxScenario}" aria-labelledby="mailbox-timing-title">
    <div class="timing-heading"><div><span class="timing-eyebrow">QUEUEONLY · DELIVERY TIMING</span><h5 id="mailbox-timing-title">这条消息什么时候能进入模型上下文？</h5></div><span class="timing-version">main · 3bae578</span></div>
    <div class="timing-scenarios" role="group" aria-label="选择终态答复时机">
      <button type="button" data-mailbox-scenario="before-final" aria-pressed="${beforeFinal}">终态答复前</button>
      <button type="button" data-mailbox-scenario="after-final" aria-pressed="${!beforeFinal}">终态答复后</button>
    </div>
    <ol class="timing-flow" aria-label="QueueOnly 邮件到模型请求的流程">
      <li class="timing-step arrived"><span class="timing-index">01</span><div><small>DELIVERY</small><strong>消息进入 mailbox</strong><span>QueueOnly 已接收</span></div></li>
      <li class="timing-step running"><span class="timing-index">02</span><div><small>IN FLIGHT</small><strong>当前采样继续运行</strong><span>不会因此取消请求</span></div></li>
      <li class="timing-step gate"><span class="timing-index">03</span><div><small>TURN GATE</small><strong data-timing-gate>${beforeFinal ? 'CurrentTurn' : 'NextTurn'}</strong><span data-timing-gate-copy>${beforeFinal ? '终态答复尚未输出' : '终态答复已经输出'}</span></div></li>
      <li class="timing-step outcome"><span class="timing-index">04</span><div><small>NEXT MODEL REQUEST</small><strong data-timing-outcome>${beforeFinal ? '可进入同一 turn 的后续请求' : '留在队列，等待后续 turn'}</strong><span data-timing-outcome-copy>${beforeFinal ? '输入在采样边界合并，再记录到会话历史' : '后续 turn 接纳 mailbox 输入后再处理'}</span></div></li>
    </ol>
    <p class="timing-boundary" aria-live="polite" data-timing-note>${beforeFinal ? '“可进入”描述的是输入队列路径，不保证模型一定读取、理解或回应这条消息。' : '终态答复后到达的消息不会悄悄延长已经显示的答复。后续同轮工作也可能重新打开 CurrentTurn。'}</p>
    <p class="timing-sources">源码：<a href="https://github.com/openai/codex/blob/3bae578af33e43268e7bc2d6d5d0266f704bb554/codex-rs/core/src/session/input_queue.rs" target="_blank" rel="noreferrer">input_queue.rs</a> · <a href="https://github.com/openai/codex/blob/3bae578af33e43268e7bc2d6d5d0266f704bb554/codex-rs/core/src/state/turn.rs" target="_blank" rel="noreferrer">turn.rs phase</a> · <a href="https://github.com/openai/codex/blob/3bae578af33e43268e7bc2d6d5d0266f704bb554/codex-rs/core/src/session/turn.rs" target="_blank" rel="noreferrer">sampling loop</a></p>
  </section>`;
}
function selectMailboxScenario(scenario) {
  mailboxScenario = scenario === 'after-final' ? 'after-final' : 'before-final';
  const timing = $('.mailbox-timing');
  if (!timing) return;
  const beforeFinal = mailboxScenario === 'before-final';
  timing.dataset.scenario = mailboxScenario;
  timing.querySelectorAll('[data-mailbox-scenario]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.mailboxScenario === mailboxScenario));
  });
  timing.querySelector('[data-timing-gate]').textContent = beforeFinal ? 'CurrentTurn' : 'NextTurn';
  timing.querySelector('[data-timing-gate-copy]').textContent = beforeFinal ? '终态答复尚未输出' : '终态答复已经输出';
  timing.querySelector('[data-timing-outcome]').textContent = beforeFinal ? '可进入同一 turn 的后续请求' : '留在队列，等待后续 turn';
  timing.querySelector('[data-timing-outcome-copy]').textContent = beforeFinal ? '输入在采样边界合并，再记录到会话历史' : '后续 turn 接纳 mailbox 输入后再处理';
  timing.querySelector('[data-timing-note]').textContent = beforeFinal
    ? '“可进入”描述的是输入队列路径，不保证模型一定读取、理解或回应这条消息。'
    : '终态答复后到达的消息不会悄悄延长已经显示的答复。后续同轮工作也可能重新打开 CurrentTurn。';
}
document.addEventListener('toggle', event => {
  if (event.target.matches('.delivery-model')) deliveryModelOpen = event.target.open;
}, true);
function scrollInspectorTo(targetId) {
  const target = document.getElementById(targetId);
  const inspector = $('#inspector');
  if (!target || !inspector) return;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (matchMedia('(min-width: 681px)').matches) {
    const headerHeight = $('#agent-detail .detail-head')?.getBoundingClientRect().height ?? 0;
    const top = target.getBoundingClientRect().top - inspector.getBoundingClientRect().top + inspector.scrollTop - headerHeight;
    inspector.scrollTo({ top: Math.max(0, top - 8), behavior });
  } else {
    target.scrollIntoView({ behavior, block: 'start' });
  }
}
function updateInspectorNav() {
  inspectorNavFrame = 0;
  const inspector = $('#inspector');
  const sections = [...document.querySelectorAll('#agent-detail .detail-section[id]')];
  const buttons = [...document.querySelectorAll('.inspector-nav [data-inspector-target]')];
  if (!inspector || !sections.length || !buttons.length) return;
  const desktop = matchMedia('(min-width: 681px)').matches;
  const atEnd = desktop
    ? inspector.scrollTop + inspector.clientHeight >= inspector.scrollHeight - 2
    : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  const anchor = desktop
    ? inspector.getBoundingClientRect().top + Math.max($('#agent-detail .detail-head')?.getBoundingClientRect().height ?? 0, inspector.clientHeight * 0.55) + 16
    : Math.min(window.innerHeight * 0.42, window.innerHeight - 80);
  let current = sections[0];
  if (atEnd) current = sections.at(-1);
  else {
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= anchor) current = section;
      else break;
    }
  }
  for (const button of buttons) {
    const active = button.dataset.inspectorTarget === current.id;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  }
}
function scheduleInspectorNavUpdate() {
  if (inspectorNavFrame) return;
  inspectorNavFrame = requestAnimationFrame(updateInspectorNav);
}
$('#inspector').addEventListener('scroll', scheduleInspectorNavUpdate, { passive:true });
window.addEventListener('scroll', scheduleInspectorNavUpdate, { passive:true });
window.addEventListener('resize', scheduleInspectorNavUpdate, { passive:true });
function render(next) {
  const focused = document.activeElement?.dataset ?? {};
  const focusedId = document.activeElement?.id;
  const explicitFocusTaskId = pendingFocusTaskId;
  pendingFocusTaskId = null;
  const focusTarget = explicitFocusTaskId ? `[data-select="${CSS.escape(explicitFocusTaskId)}"]` : focused.select ? `[data-select="${CSS.escape(focused.select)}"]` : focused.toggleChildren ? `[data-toggle-children="${CSS.escape(focused.toggleChildren)}"]` : focused.child ? `[data-child="${CSS.escape(focused.child)}"]` : focused.message ? `[data-message="${CSS.escape(focused.message)}"]` : focused.cancel ? `[data-cancel="${CSS.escape(focused.cancel)}"]` : focused.jump ? `[data-jump="${CSS.escape(focused.jump)}"]` : focused.openInbox ? `[data-open-inbox="${CSS.escape(focused.openInbox)}"]` : focusedId ? `#${CSS.escape(focusedId)}` : null;
  const treeScroll = $('#tree').scrollTop;
  const inspectorScroll = $('#inspector').scrollTop;
  const previousSelectedTaskId = renderedSelectedTaskId;
  const pageScroll = window.scrollY;
  state = next;
  const tasks = Array.isArray(next.tasks) ? next.tasks : [];
  $('#compose').hidden = Boolean(next.demoMode);
  $('#demo-mode').hidden = !next.demoMode;
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
  for (const status of ['all','running','queued','completed','failed','cancelled','timing_out','timed_out']) {
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
  renderedSelectedTaskId = selectedTaskId;
  $('#inspector').scrollTop = previousSelectedTaskId === selectedTaskId ? inspectorScroll : 0;
  scheduleInspectorNavUpdate();
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
  const model = $('#root-model').value.trim(); const reasoningEffort = $('#root-effort').value; const timeoutSeconds = Number($('#root-timeout').value);
  try { await request('/api/tasks', { prompt, parentId:null, model, modelMode:model ? 'custom' : 'default', reasoningEffort, effortMode:reasoningEffort ? 'custom' : 'default', timeoutSeconds, keepSession:$('#root-keep-session').checked }); $('#prompt').value = ''; $('#root-prompt-count').textContent = '0'; notify('Root agent added to the task queue.'); }
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
  $('#child-model-mode').value = 'inherit';
  $('#child-model').value = '';
  $('#child-model').hidden = true;
  $('#child-model-hint').textContent = `Parent: ${parent?.model || 'Codex default'}`;
  $('#child-effort').value = 'inherit';
  $('#child-effort-hint').textContent = `Parent: ${parent?.reasoningEffort || 'Codex default'}`;
  $('#child-keep-session').checked = Boolean(parent?.keepSession);
  $('#child-dialog').showModal(); $('#child-prompt').focus();
}
$('#child-model-mode').addEventListener('change', () => {
  const mode = $('#child-model-mode').value; const custom = mode === 'custom';
  $('#child-model').hidden = !custom;
  $('#child-model-hint').textContent = mode === 'inherit'
    ? `Parent: ${taskById(selectedParent)?.model || 'Codex default'}`
    : mode === 'default' ? 'Use the Codex default model.' : 'Overrides the parent model.';
  if (custom) $('#child-model').focus();
});
$('#child-effort').addEventListener('change', () => {
  const mode = $('#child-effort').value;
  $('#child-effort-hint').textContent = mode === 'inherit'
    ? `Parent: ${taskById(selectedParent)?.reasoningEffort || 'Codex default'}`
    : mode === 'default' ? 'Use the Codex default reasoning effort.' : '';
});
function openMessageDialog(id) {
  selectedMessageTask = id;
  const task = taskById(id);
  $('#message-label').textContent = task ? `Agent: ${task.prompt.slice(0,160)}` : '';
  $('#message-text').value = ''; $('#message-dialog').showModal(); $('#message-text').focus();
}
function openFollowupDialog(id) {
  selectedMessageTask = id;
  const task = taskById(id);
  $('#followup-label').textContent = task ? `Agent: ${task.prompt.slice(0,160)}` : '';
  $('#followup-prompt').value = ''; $('#followup-dialog').showModal(); $('#followup-prompt').focus();
}
function expandTaskAncestors(id) {
  const byId = new Map(state.tasks.map(task => [task.id, task]));
  let current = byId.get(id);
  while (current?.parentId) {
    collapsedTasks.delete(current.parentId);
    current = byId.get(current.parentId);
  }
}
function focusTask(id) {
  if (!taskById(id)) return;
  selectedTaskId = id;
  expandTaskAncestors(id);
  pendingFocusTaskId = id;
  render(state);
}
$('#tree').addEventListener('keydown', event => {
  const current = event.target.closest('[role="treeitem"][data-select]');
  if (!current) return;
  const items = [...$('#tree').querySelectorAll('[role="treeitem"][data-select]')];
  const index = items.indexOf(current);
  const task = taskById(current.dataset.select);
  if (!task) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const next = items[index + (event.key === 'ArrowDown' ? 1 : -1)];
    if (next) { event.preventDefault(); focusTask(next.dataset.select); }
  } else if (event.key === 'Home' || event.key === 'End') {
    const next = event.key === 'Home' ? items[0] : items.at(-1);
    if (next) { event.preventDefault(); focusTask(next.dataset.select); }
  } else if (event.key === 'ArrowRight') {
    const hasChildren = state.tasks.some(item => item.parentId === task.id);
    if (!hasChildren) return;
    event.preventDefault();
    if (collapsedTasks.has(task.id) && !current.parentElement?.querySelector('.tree-toggle[disabled]')) {
      collapsedTasks.delete(task.id);
      pendingFocusTaskId = task.id;
      render(state);
      return;
    }
    const next = items.slice(index + 1).find(item => Number(item.getAttribute('aria-level')) === Number(current.getAttribute('aria-level')) + 1);
    if (next) focusTask(next.dataset.select);
  } else if (event.key === 'ArrowLeft') {
    const hasChildren = state.tasks.some(item => item.parentId === task.id);
    const forcedOpen = current.parentElement?.querySelector('.tree-toggle[disabled]');
    if (hasChildren && !collapsedTasks.has(task.id) && !forcedOpen) {
      event.preventDefault();
      collapsedTasks.add(task.id);
      render(state);
      return;
    }
    if (task.parentId) { event.preventDefault(); focusTask(task.parentId); }
  }
});
document.addEventListener('click', async event => {
  const timingScenario = event.target.closest('[data-mailbox-scenario]');
  if (timingScenario) { selectMailboxScenario(timingScenario.dataset.mailboxScenario); return; }
  const cancelButton = event.target.closest('[data-cancel]');
  const inboxButton = event.target.closest('[data-open-inbox]');
  const childButton = event.target.closest('[data-child]');
  const messageButton = event.target.closest('[data-message]');
  const followupButton = event.target.closest('[data-followup]');
  const selectButton = event.target.closest('[data-select]');
  const jumpButton = event.target.closest('[data-jump]');
  const inspectorTarget = event.target.closest('[data-inspector-target]');
  const toggleButton = event.target.closest('[data-toggle-children]');
  if (cancelButton) {
    try { await request(`/api/tasks/${cancelButton.dataset.cancel}/cancel`, {}); notify('Stop requested. Child agents continue independently.'); }
    catch(error) { notify(error.message, true); }
    return;
  }
  if (inboxButton) {
    selectedTaskId = inboxButton.dataset.openInbox;
    expandTaskAncestors(selectedTaskId);
    render(state);
    requestAnimationFrame(() => scrollInspectorTo('agent-mailbox'));
    return;
  }
  if (inspectorTarget) { scrollInspectorTo(inspectorTarget.dataset.inspectorTarget); return; }
  if (childButton) { openChildDialog(childButton.dataset.child); return; }
  if (messageButton) { openMessageDialog(messageButton.dataset.message); return; }
  if (followupButton) { openFollowupDialog(followupButton.dataset.followup); return; }
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
$('#continue-agent').addEventListener('click', async event => {
  event.preventDefault();
  const prompt = $('#followup-prompt').value.trim();
  if (!prompt || !selectedMessageTask) { $('#followup-prompt').focus(); return; }
  const button = $('#continue-agent'); button.disabled = true;
  try { await request(`/api/tasks/${selectedMessageTask}/followup`, { prompt }); $('#followup-dialog').close(); notify('Follow-up turn queued for this agent.'); }
  catch(error) { notify(error.message, true); }
  finally { button.disabled = false; }
});
$('#create-child').addEventListener('click', async event => {
  event.preventDefault();
  const prompt = $('#child-prompt').value.trim();
  if (!prompt || !selectedParent) { $('#child-prompt').focus(); return; }
  const button = $('#create-child'); button.disabled = true;
  const modelMode = $('#child-model-mode').value; const model = modelMode === 'custom' ? $('#child-model').value.trim() : '';
  const effortChoice = $('#child-effort').value; const effortMode = ['inherit','default'].includes(effortChoice) ? effortChoice : 'custom';
  const reasoningEffort = effortMode === 'custom' ? effortChoice : '';
  if (modelMode === 'custom' && !model) { $('#child-model').focus(); notify('Enter a model name or choose another model setting.', true); button.disabled = false; return; }
  try { await request('/api/tasks', { prompt, parentId:selectedParent, includeParentContext:$('#include-context').checked, keepSession:$('#child-keep-session').checked, model, modelMode, reasoningEffort, effortMode }); $('#child-dialog').close(); notify('Child agent added to the task queue.'); }
  catch(error) { notify(error.message, true); }
  finally { button.disabled = false; }
});
setInterval(() => {
  const now = Date.now();
  for (const task of state.tasks) {
    const node = document.querySelectorAll(`[data-duration-for="${CSS.escape(task.id)}"]`);
    const duration = task.startedAt ? durationLabel(Math.max(0, new Date(task.finishedAt ?? now) - new Date(task.startedAt))) : '—';
    node.forEach(element => { element.textContent = duration; });
  }
}, 1000);
$('#reload-session').addEventListener('click', () => location.reload());
connect();
