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
let deliveryFlowMode = 'queue-only';
let deliveryFlowResidency = 'loaded';
let deliverySessionState = 'idle';
let deliveryFlowStep = -1;
let boardWriteScenario = 'busy-clears';
let toolExposureScenario = 'child-unknown';
let toolExposureDisableMessages = false;
let toolExposureWaitEnabled = true;
let waitScopeScenario = 'nested-relay';
let waitScopeStep = 0;
let waitContractEvent = 'target-complete';
let appServerProjectionTool = 'spawnAgent';
let appServerHydrationView = 'turn-link';
let rendererReadRoute = 'selected-thread';
let rendererUpdateStage = 0;
let interactionCompareVersion = 'v1-capture';
let interactionCompareSelection = 'parent-0';
let residencyScenario = 'completed-followup';
let interruptCloseScenario = 'interrupt-resident';
let interruptCloseLifecycleStep = 2;
let desktopStopCascadeStep = 0;
let admissionScenario = 'sequential';
let topologyScenario = 'panel-open';
let topologyEligibilityState = 'visible';
let fullFidelityScenario = 'background';
let rendererDeltaScenario = 'item-matched';
let rendererDeltaType = 'agent-message';
let desktopRuntimeStep = 2;
let desktopTopologyStep = 0;
let persistenceCheckpointStep = 2;
let completionPayloadScenario = 'parent-input';
let parentResultState = 'active';
let completionRouteMode = 'v2';
let completionRouteStep = 0;
let embeddedProbeStep = 0;
let cliV1ProbeStep = 0;
let requestWireTransport = 'http';
let requestWireContent = 'plaintext';
let desktopPanelStatus = 'active';
let desktopPanelInline = true;
let desktopPanelSelected = null;
let desktopPanelCanInteract = true;
let desktopPanelPipelineStage = 'membership';
let desktopCollapseHasInline = true;
let desktopCollapseAllDone = false;
let desktopResourceFocus = 'local';
let desktopBuild20586Surface = 'work';
let desktopBuild20586Status = 'working';
let desktopBuild20586TurnLive = true;
let desktopBuild20586Route = 'accepted';
let desktopBuild20586CanInteract = true;
let desktopBuild20586WriterConflict = false;
let desktopBuild20586ShouldResume = true;
let desktopBuild20586ThreadScope = 'local-eligible';
let desktop20770Surface = 'work';
let treeHandoffStage = 'root-return';
let desktopPanelShouldResume = true;
let desktopPanelWriterConflict = false;
let stopCleanupMode = 'user-stop';
let stopAllDiscovery = 'success';
let shutdownPathFocus = 'desktop-stop';
let shutdownScopeMode = 'shared-runtime';
let desktopCoverageFocus = 'asar-js';
let appServerExitMode = 'desktop-sigterm';
let spawnConfigMode = 'fresh-v2';
let spawnConfigModelSource = 'inherited';
let spawnConfigRole = false;
let spawnProtocolVersion = 'v2';
let spawnProtocolOutcome = 'success';
let nativeSpawnFocus = 0;
let nativeEvidenceView = 'v2Run';
let nativeLifecycleScenario = 'complete';
let standaloneStaticSpawnFocus = 0;
let standaloneEvidenceLens = 0;
let standaloneVtableArtifact = 'desktop';
let agentControlEntry = 'new-root';
let agentControlFactoryEnabled = false;
let agentControlSource = 'installed';
let agentControlVersion = 'v2';
let versionResolutionScenario = 'feature-fallback';
let terminalScenario = 'completed';
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

function deliveryFlowMarkup() {
  const trigger = deliveryFlowMode === 'trigger-turn';
  const evicted = deliveryFlowResidency === 'evicted';
  const sessionState = deliverySessionState;
  const mode = trigger ? 'TriggerTurn' : 'QueueOnly';
  const scheduler = {
    idle: {
      title: trigger ? 'Start a regular turn' : 'Leave queued while idle',
      detail: trigger
        ? 'The scheduler sees trigger-turn mail and can create a regular turn because this session is idle.'
        : 'QueueOnly alone does not start an ordinary idle turn. A wait call may still return on mailbox activity.',
      gate: trigger ? 'trigger-turn mail' : 'no wake condition'
    },
    active: {
      title: trigger ? 'Keep pending while turn is active' : 'Queue without starting scheduler',
      detail: trigger
        ? 'TriggerTurn reaches the scheduler, but an active turn prevents a second regular turn. The mailbox item stays pending.'
        : 'QueueOnly emits mailbox activity but does not call the turn scheduler without durable sleep. The item stays pending.',
      gate: trigger ? 'active turn exists' : 'scheduler not called'
    },
    durable_sleep: {
      title: 'Wake the durable sleep',
      detail: 'With an outstanding durable sleep and an idle session, any pending mailbox mail can start a regular turn, including QueueOnly.',
      gate: 'durable sleep + idle'
    }
  }[sessionState];
  const stages = [
    ['01 · TARGET', evicted ? 'Reload child history' : 'Reuse loaded child', evicted ? '`ensure_v2_agent_loaded` reads the stored V2 thread and restores a live session before delivery.' : '`ensure_v2_agent_loaded` finds the registered thread and touches its residency.'],
    ['02 · ADMISSION', trigger ? 'Check turn capacity' : 'No turn-capacity check', trigger ? '`TriggerTurn` checks execution capacity before submitting the message.' : 'The delivery path skips the execution-turn capacity check when `trigger_turn=false`.'],
    ['03 · MAILBOX', `Enqueue · trigger_turn=${trigger}`, 'The session input queue stores the communication and publishes mailbox activity.'],
    ['04 · SCHEDULER', scheduler.title, scheduler.detail]
  ];
  const stepLabel = deliveryFlowStep < 0
    ? 'Ready · 4 steps'
    : deliveryFlowStep >= stages.length
      ? 'Trace complete · mailbox and scheduler effects remain separate'
      : `Step ${deliveryFlowStep + 1} of ${stages.length} · ${stages[deliveryFlowStep][1]}`;
  const turnResult = sessionState === 'durable_sleep'
    ? { state: 'starts', title: 'Wake a regular turn', detail: 'Pending mail can wake the idle durable sleep.' }
    : sessionState === 'active' && trigger
      ? { state: 'deferred', title: 'No second turn', detail: 'The current turn is still active; mail remains pending.' }
      : trigger
        ? { state: 'starts', title: 'Start a regular turn', detail: 'TriggerTurn requests a turn for this idle session.' }
        : { state: 'queued', title: 'No turn requested', detail: 'QueueOnly by itself does not start an idle turn.' };
  return `<section class="delivery-flow" data-mode="${deliveryFlowMode}" data-residency="${deliveryFlowResidency}" data-session-state="${sessionState}" aria-labelledby="delivery-flow-title">
    <div class="delivery-flow-heading"><div><span>V2 MESSAGE DELIVERY · SOURCE TRACE</span><h5 id="delivery-flow-title">Follow one message from caller to child turn</h5></div><span>main · aff9208</span></div>
    <p class="delivery-flow-intro">Choose the tool mode and the child’s starting residency. Both message modes ensure the existing child is loaded before delivery; the mode controls whether the message requests an ordinary turn.</p>
    <div class="delivery-flow-controls">
      <div role="group" aria-label="Message delivery mode"><button type="button" data-delivery-flow="queue-only" aria-pressed="${!trigger}">send_message · QueueOnly</button><button type="button" data-delivery-flow="trigger-turn" aria-pressed="${trigger}">followup_task · TriggerTurn</button></div>
      <div role="group" aria-label="Child session residency"><button type="button" data-delivery-residency="loaded" aria-pressed="${!evicted}">Already loaded</button><button type="button" data-delivery-residency="evicted" aria-pressed="${evicted}">Evicted · reload</button></div>
      <div class="delivery-session-control" role="group" aria-label="Child scheduler state"><button type="button" data-delivery-session="idle" aria-pressed="${sessionState==='idle'}">Idle</button><button type="button" data-delivery-session="active" aria-pressed="${sessionState==='active'}">Turn active</button><button type="button" data-delivery-session="durable_sleep" aria-pressed="${sessionState==='durable_sleep'}">Durable sleep</button></div>
    </div>
    <div class="delivery-trace-controls"><span aria-live="polite" aria-atomic="true">${escapeHtml(stepLabel)}</span><div><button type="button" data-delivery-trace="reset" ${deliveryFlowStep < 0 ? 'disabled' : ''}>Reset</button><button type="button" data-delivery-trace="advance">${deliveryFlowStep < 0 ? 'Start trace' : deliveryFlowStep >= stages.length ? 'Replay trace' : 'Next step'}</button></div></div>
    <ol class="delivery-flow-stages" aria-label="Message delivery stages" data-current-step="${deliveryFlowStep}" data-scheduler-gate="${scheduler.gate}">${stages.map(([label,title,detail],index)=>`<li class="${index===1&&trigger?'capacity-gated':''} ${index===3?'scheduler-'+sessionState:''} ${index===deliveryFlowStep?'is-active':''} ${index<deliveryFlowStep?'is-complete':''}"><span>${label}</span><strong>${title}</strong><small>${detail}</small></li>`).join('')}</ol>
    <section class="delivery-outcomes" aria-live="polite" aria-label="Independent effects after mailbox enqueue">
      <div class="delivery-outcomes-origin"><span>AFTER ENQUEUE</span><strong>One mailbox event</strong></div>
      <div class="delivery-outcome-branches">
        <article class="delivery-outcome delivery-outcome-activity"><span class="delivery-branch-label">ACTIVITY · ALWAYS EMITTED</span><strong>Wake a waiting <code>wait_agent</code></strong><small>It can return <code>MailboxActivity</code>; this does not start a turn by itself.</small></article>
        <article class="delivery-outcome delivery-outcome-turn" data-turn-result="${turnResult.state}"><span class="delivery-branch-label">TURN SCHEDULER · ${escapeHtml(scheduler.gate).toUpperCase()}</span><strong>${turnResult.title}</strong><small>${turnResult.detail}</small></article>
      </div>
    </section>
    <div class="delivery-flow-boundary"><b>MODEL READ IS LATER</b><span>Accepted submission and mailbox activity do not prove the child model has consumed the message.</span></div>
    <p class="delivery-flow-sources"><a href="https://github.com/openai/codex/blob/aff92080f2b8d5f63a63b4ada7b92054287f237c/codex-rs/core/src/agent/control/api.rs" target="_blank" rel="noreferrer">target load and mode mapping</a> · <a href="https://github.com/openai/codex/blob/aff92080f2b8d5f63a63b4ada7b92054287f237c/codex-rs/core/src/agent/control.rs" target="_blank" rel="noreferrer">turn-capacity gate</a> · <a href="https://github.com/openai/codex/blob/aff92080f2b8d5f63a63b4ada7b92054287f237c/codex-rs/core/src/session/handlers.rs" target="_blank" rel="noreferrer">mailbox enqueue and scheduler</a> · <a href="https://github.com/openai/codex/blob/aff92080f2b8d5f63a63b4ada7b92054287f237c/codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs" target="_blank" rel="noreferrer">wait outcome</a></p>
  </section>`;
}

function spawnConfigMarkup() {
  const mode = spawnConfigMode;
  const isFork = mode !== 'fresh-v2';
  const isV2 = mode !== 'full-fork-v1';
  const rejected = mode === 'full-fork-v1' && spawnConfigRole;
  const roleStageRuns = !isFork || (isV2 && spawnConfigRole);
  const implicitDefaultRole = mode === 'fresh-v2' && !spawnConfigRole;
  const roleMayOverlay = roleStageRuns && (spawnConfigRole || implicitDefaultRole);
  const sourceModel = {
    inherited: 'invoking turn model',
    configured: 'configured subagent default',
    explicit: 'explicit spawn request'
  }[spawnConfigModelSource];
  const modelResult = roleMayOverlay ? 'role config may replace model' : sourceModel;
  const developerBase = isV2 ? 'V2 subagent instructions, else parent turn' : 'parent turn instructions';
  const developerResult = rejected ? 'not created' : spawnConfigRole
    ? (isFork ? `role instructions; ${developerBase} restored only if unset` : 'role instructions overlay inherited instructions')
    : implicitDefaultRole
      ? `${developerBase}; configured default role may overlay`
      : developerBase;
  const roleStageTitle = rejected ? 'reject before role application' :
    implicitDefaultRole ? 'resolve implicit default role' :
    spawnConfigRole ? 'explicit role overlay applied' :
    mode === 'full-fork-v1' ? 'role stage skipped; inherit fork role' :
    'role stage skipped';
  const roleStageDetail = rejected ? 'V1 full-history fork rejects an agent_type/role override.' :
    implicitDefaultRole ? 'Fresh V2 resolves `default`; a configured role file may add overrides.' :
    spawnConfigRole ? 'A named role may override model, reasoning, instructions and related config.' :
    mode === 'full-fork-v1' ? 'V1 full-history fork inherits the parent agent type and skips role application.' :
    'Full-history V2 applies a role only when one was explicitly named.';
  const scenarioTitle = rejected ? 'REJECTED · V1 full-history fork cannot override role' :
    mode === 'full-fork-v2' ? 'V2 full-history fork' :
    mode === 'full-fork-v1' ? 'V1 full-history fork' : 'Fresh child thread';
  return `<section class="spawn-config-trace" aria-labelledby="spawn-config-title" data-config-mode="${mode}">
    <div class="spawn-config-heading"><div><span class="spawn-config-eyebrow">CHILD CONFIG · PRECEDENCE TRACE</span><h5 id="spawn-config-title">Child configuration is rebuilt from the live parent turn</h5></div><span>public main · 7ae8319</span></div>
    <p class="spawn-config-intro">选择 spawn 分支和输入来源，沿源码顺序查看继承、覆盖与拒绝边界。此图展示静态规则，不读取当前 Codex 会话的 resolved config。</p>
    <div class="spawn-config-controls">
      <div role="group" aria-label="Spawn configuration path"><button type="button" data-spawn-config-mode="fresh-v2" aria-pressed="${mode === 'fresh-v2'}">Fresh V2</button><button type="button" data-spawn-config-mode="full-fork-v2" aria-pressed="${mode === 'full-fork-v2'}">Full-history V2</button><button type="button" data-spawn-config-mode="full-fork-v1" aria-pressed="${mode === 'full-fork-v1'}">Full-history V1</button></div>
      <div role="group" aria-label="Model source"><button type="button" data-spawn-model-source="inherited" aria-pressed="${spawnConfigModelSource === 'inherited'}">Inherit</button><button type="button" data-spawn-model-source="configured" aria-pressed="${spawnConfigModelSource === 'configured'}">Configured default</button><button type="button" data-spawn-model-source="explicit" aria-pressed="${spawnConfigModelSource === 'explicit'}">Explicit request</button></div>
      <label><input type="checkbox" data-spawn-role ${spawnConfigRole ? 'checked' : ''}><span>Request an explicit role</span></label>
    </div>
    <div class="spawn-config-path" data-rejected="${rejected}" aria-live="polite">
      <article><span>01 · SNAPSHOT</span><strong>Clone parent config</strong><small>Base for child; avoid stale values by refreshing live-turn state.</small></article><i aria-hidden="true">→</i>
      <article><span>02 · LIVE TURN</span><strong>model · provider · reasoning</strong><small>Also refreshes approval policy, reviewer, cwd and permission-profile snapshot.</small></article><i aria-hidden="true">→</i>
      <article class="spawn-config-selected"><span>03 · MODEL PRECEDENCE</span><strong>${sourceModel}</strong><small>Explicit request wins over configured subagent default; model and reasoning are validated.</small></article><i aria-hidden="true">→</i>
      <article class="${roleMayOverlay ? 'spawn-config-role' : ''}"><span>04 · ROLE LAYER</span><strong>${roleStageTitle}</strong><small>${roleStageDetail}</small></article><i aria-hidden="true">→</i>
      <article class="spawn-config-final"><span>05 · FINAL CHILD CONFIG</span><strong>${rejected ? 'not created' : modelResult}</strong><small>Developer instructions: ${developerResult}. Service tier is applied; runtime authority is re-applied.</small></article>
    </div>
    <div class="spawn-config-invariants"><span><b>CONTEXT LIMITS</b> feature may clear inherited context-window/auto-compact overrides</span><span><b>TOKEN BUDGET</b> restored from configured preference snapshot</span><span><b>BASE INSTRUCTIONS</b> newly spawned child receives text + provenance; resume reload keeps them sourced from rollout metadata</span></div>
    <p class="spawn-config-boundary">The diagram does not imply a child receives the parent’s identity or all live session state. Fresh V2 resolves the default role when no role is named; whether that changes config depends on the active role declaration and file. This is a static rule trace, not a resolved session config.</p>
    <p class="spawn-config-sources"><a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/agent/child_config.rs#L51-L100" target="_blank" rel="noreferrer">spawn precedence</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/agent/child_config.rs#L103-L200" target="_blank" rel="noreferrer">snapshot and runtime refresh</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/agent/child_config.rs#L204-L324" target="_blank" rel="noreferrer">model validation and role stage</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/agent/role.rs#L51-L67" target="_blank" rel="noreferrer">default role resolution</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/agent/role.rs#L69-L160" target="_blank" rel="noreferrer">role config overlay</a></p>
  </section>`;
}
function selectSpawnConfigOption(kind, value) {
  if (kind === 'mode') spawnConfigMode = ['full-fork-v2','full-fork-v1'].includes(value) ? value : 'fresh-v2';
  if (kind === 'model') spawnConfigModelSource = ['configured','explicit'].includes(value) ? value : 'inherited';
  if (kind === 'role') spawnConfigRole = Boolean(value);
  const panel = $('.spawn-config-trace');
  if (panel) panel.outerHTML = spawnConfigMarkup();
}
function spawnProtocolMarkup() {
  const v2 = spawnProtocolVersion === 'v2';
  const failed = spawnProtocolOutcome === 'prepare-failure';
  const stages = v2
    ? [
      ['01 · INVOCATION', 'Parse V2 arguments', 'Required: task_name + message. fork_turns defaults to all; `fork_context` is rejected.'],
      ['02 · PREPARE', failed ? 'Config preparation fails' : 'Prepare child config', failed ? 'Returns a tool error before a child thread is created.' : 'Resolve model/role, construct task source, and choose fork history.'],
      ['03 · THREAD SPAWN', failed ? 'not reached' : 'thread_spawn(...)', failed ? 'No child thread or Started activity from this handler.' : 'Create the child thread and admit its initial TriggerTurn message.'],
      ['04 · ACTIVITY', failed ? 'no Started activity' : 'emit Started activity', failed ? 'The activity is emitted only after successful thread creation.' : 'Includes the child thread id and canonical task path.'],
      ['05 · CALL ANALYTICS', failed ? 'track Failed call' : 'track completed call', 'The outer V2 executor records the call after the handler returns.']
    ]
    : [
      ['01 · INVOCATION', 'Parse V1 arguments', 'Accepts message or structured items; `fork_context` is a boolean.'],
      ['02 · TURN ITEM', 'Emit InProgress call item', 'This happens before child config preparation.'],
      ['03 · PREPARE', failed ? 'Config preparation fails' : 'Prepare child config', failed ? 'Returns early with a tool error; this handler does not emit its completion item.' : 'Resolve model/role and refresh live parent-turn policy.'],
      ['04 · AGENT CONTROL', failed ? 'not reached' : 'agent_control.spawn(...)', failed ? 'No child thread is requested.' : 'Create child thread and send initial user input.'],
      ['05 · TURN ITEM', failed ? 'remains InProgress here' : 'Emit completed call item', failed ? 'The earlier InProgress item was already emitted; this path returns before the completion emission.' : 'Adds receiver identity and resulting agent status.']
    ];
  const mode = failed ? 'prepare-failure' : 'success';
  return `<section class="spawn-protocol-trace" aria-labelledby="spawn-protocol-title" data-version="${spawnProtocolVersion}" data-outcome="${mode}">
    <div class="spawn-protocol-heading"><div><span class="spawn-protocol-eyebrow">SPAWN CALL · EVENT ORDER TRACE</span><h5 id="spawn-protocol-title">When does a spawn become visible?</h5></div><span>public main · 7ae8319</span></div>
    <p class="spawn-protocol-intro">比较两代 handler 的输入契约、创建顺序与失败时留下的记录。这里追踪源码中的事件顺序，不代表 UI 一定已渲染或用户一定看见。</p>
    <div class="spawn-protocol-controls">
      <div role="group" aria-label="Select spawn protocol version"><button type="button" data-spawn-protocol-version="v1" aria-pressed="${!v2}">V1 · multi_agent_v1</button><button type="button" data-spawn-protocol-version="v2" aria-pressed="${v2}">V2 · task tree</button></div>
      <div role="group" aria-label="Select spawn result"><button type="button" data-spawn-protocol-outcome="success" aria-pressed="${!failed}">Preparation succeeds</button><button type="button" data-spawn-protocol-outcome="prepare-failure" aria-pressed="${failed}">Preparation fails</button></div>
    </div>
    <div class="spawn-protocol-input"><span>TOOL INPUT SHAPE</span><strong>${v2 ? 'task_name + message required' : 'message or structured items'}</strong><small>${v2 ? 'fork_turns: none / all / positive count; omitted defaults to all' : 'agent_type, model, reasoning_effort and fork_context are optional'}</small></div>
    <div class="spawn-protocol-flow" aria-live="polite">${stages.map(([label,title,detail],index) => `<article class="spawn-protocol-step ${failed && ((v2 && index === 1) || (!v2 && index === 2)) ? 'failed' : ''} ${failed && index > (v2 ? 1 : 2) ? 'not-reached' : ''}"><span>${label}</span><strong>${title}</strong><small>${detail}</small></article>${index < stages.length-1 ? '<i aria-hidden="true">→</i>' : ''}`).join('')}</div>
    <p class="spawn-protocol-boundary">V1 config-preparation failure occurs after an InProgress turn item was emitted and returns before this handler emits its completion item. V2 config-preparation failure is recorded by the outer executor as a failed tool call; the Started activity follows successful thread creation. Static source ordering only: no live Desktop event stream or rendered React state was captured.</p>
    <p class="spawn-protocol-sources"><a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/tools/handlers/multi_agents/spawn.rs#L53-L190" target="_blank" rel="noreferrer">V1 handler and turn items</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs#L43-L240" target="_blank" rel="noreferrer">V2 handler and analytics</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L65-L145" target="_blank" rel="noreferrer">tool schemas</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#spawn-call-records-have-different-failure-ordering-in-v1-and-v2-2026-10-16" target="_blank" rel="noreferrer">evidence ledger</a></p>
    ${nativeCliTraceMarkup()}
  </section>`;
}

function nativeLifecycleMarkup() {
  const scenarios = {
    complete: {
      label: 'Turn completes',
      eyebrow: 'FINAL TURN · ROUTED RESULT',
      nodes: [
        ['SESSION', 'TurnComplete', 'V2 spawned child reaches a final status.'],
        ['PARENT ACTIVITY', 'Completed item', 'Emitted when a parent-turn reference is available.'],
        ['MAILBOX', 'Result queued', 'Inter-agent result uses trigger_turn = false.'],
        ['CHILD LIFETIME', 'Still resident', 'This path does not release registry ownership or mark the persisted edge Closed.']
      ],
      tone: 'complete',
      boundary: 'A completed turn and a closed child are different states. The source path routes the result; it does not perform explicit close cleanup.'
    },
    close: {
      label: 'Parent calls close_agent',
      eyebrow: 'EXPLICIT OPERATION · TREE SHUTDOWN',
      nodes: [
        ['REQUEST', 'close_agent(child)', 'Caller explicitly selects the child to close.'],
        ['PERSISTENCE', 'Edge → Closed', 'Written for non-ephemeral child sessions before shutdown.'],
        ['TREE SCOPE', 'Child + live descendants', 'The runtime snapshots descendants and shuts down each live thread.'],
        ['CLEANUP', 'Remove owned state', 'Flush rollout, then remove thread, residency, registry entry, and mailbox.']
      ],
      tone: 'close',
      boundary: 'Explicit close is the path that records Closed and performs tree cleanup. It is separate from receiving a final turn event.'
    },
    died: {
      label: 'InternalAgentDied',
      eyebrow: 'ABNORMAL FAILURE · OWNERSHIP RELEASE',
      nodes: [
        ['REQUEST', 'Thread operation fails', 'The controller receives InternalAgentDied for this child.'],
        ['IN-MEMORY', 'Release local ownership', 'Remove thread, V2 residency, and spawned-thread registry entry.'],
        ['PERSISTENCE', 'Edge status unknown', 'This error handler does not write the spawn edge as Closed.'],
        ['PARENT RESULT', 'Separate route', 'This cleanup handler alone does not prove a completion message reached the parent.']
      ],
      tone: 'died',
      boundary: 'The failure path releases in-memory ownership. The inspected handler does not establish durable edge closure or parent-result delivery.'
    },
    closedResume: {
      label: 'Closed child after cold resume',
      eyebrow: 'PERSISTED GRAPH · RUNTIME RESTORE GAP',
      nodes: [
        ['CLOSE', 'Edge → Closed', 'close_agent records the target edge as Closed, then shuts down its runtime and releases its registry metadata.'],
        ['ROOT RESUME', 'Restore only Open edges', 'The root restore query filters descendants by Open and restores identity metadata without reopening runtimes.'],
        ['QUERY', 'Still in thread tree', 'Tree/list queries without an Open filter can still expose the historical child relationship.'],
        ['DIRECT RESUME', 'Owner loader lacks metadata', 'The V2 loader requires parent ownership and registered child metadata; this closed child has not been restored into that registry.'],
        ['APP-SERVER', 'Resume path returns error', 'The request guidance says resume the parent first or use thread/read, but this snapshot’s Open-only restore does not re-register the Closed child.'],
        ['INSPECT', 'thread/read remains available', 'The observed route is historical inspection. No source path in this trace reopens the Closed edge or reloads the child runtime.']
      ],
      tone: 'closed',
      boundary: 'Static source inference for public Codex commit e89b7c4. It links close cleanup, root metadata restoration, the owner-controlled loader, and app-server error mapping; no live resume attempt was captured.'
    }
  };
  const selected = scenarios[nativeLifecycleScenario] ? nativeLifecycleScenario : 'complete';
  nativeLifecycleScenario = selected;
  const scenario = scenarios[selected];
  const recoverySources = selected === 'closedResume' ? '<p class="native-lifecycle-sources"><a href="https://github.com/openai/codex/blob/e89b7c442c0433ad5167e72a5a25bb6d0712766a/codex-rs/core/src/agent/control/spawn.rs#L195-L279" target="_blank" rel="noreferrer">Open-only restore</a><a href="https://github.com/openai/codex/blob/e89b7c442c0433ad5167e72a5a25bb6d0712766a/codex-rs/core/src/thread_manager.rs#L1284-L1316" target="_blank" rel="noreferrer">parent-owned loader</a><a href="https://github.com/openai/codex/blob/e89b7c442c0433ad5167e72a5a25bb6d0712766a/codex-rs/app-server/src/request_processors/thread_processor.rs#L3991-L4012" target="_blank" rel="noreferrer">resume error mapping</a><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-closed-v2-child-cold-resume-restores-tree-visibility-but-not-runtime-identity-2026-10-19" target="_blank" rel="noreferrer">evidence ledger</a></p>' : '';
  return `<div class="native-lifecycle-trace" data-tone="${scenario.tone}" data-scenario="${selected}">
    <div class="native-lifecycle-controls" role="group" aria-label="Compare child lifecycle and recovery paths">${Object.entries(scenarios).map(([key,value]) => `<button type="button" data-native-lifecycle="${key}" aria-pressed="${selected === key}">${value.label}</button>`).join('')}</div>
    <div class="native-lifecycle-heading"><span>${scenario.eyebrow}</span><b>${scenario.label}</b></div>
    <ol class="native-lifecycle-flow" aria-live="polite">${scenario.nodes.map(([tag,title,detail],index) => `<li data-tone="${scenario.tone}"><span class="native-lifecycle-index">${String(index + 1).padStart(2,'0')}</span><div><small>${tag}</small><b>${title}</b><p>${detail}</p></div></li>`).join('')}</ol>
    <p class="native-lifecycle-boundary"><b>Interpretation</b>${scenario.boundary}</p>
    ${recoverySources}
    <p class="native-lifecycle-sources"><a href="https://github.com/openai/codex/blob/89461ea6833832b0551ce24ee32205824d5c108d/codex-rs/core/src/session/mod.rs#L2504-L2572" target="_blank" rel="noreferrer">terminal callback</a><a href="https://github.com/openai/codex/blob/89461ea6833832b0551ce24ee32205824d/codex-rs/core/src/agent/control/completion.rs#L25-L153" target="_blank" rel="noreferrer">result routing</a><a href="https://github.com/openai/codex/blob/89461ea6833832b0551ce24ee32205824d/codex-rs/core/src/agent/control/legacy.rs#L7-L124" target="_blank" rel="noreferrer">explicit close</a><a href="https://github.com/openai/codex/blob/89461ea6833832b0551ce24ee32205824d/codex-rs/core/src/agent/control.rs#L347-L361" target="_blank" rel="noreferrer">death cleanup</a></p>
  </div>`;
}

function nativeEvidenceJourneyMarkup() {
  const views = {
    source: {
      eyebrow: 'PUBLIC SOURCE + INSTALLED BINARY · STATIC RECONSTRUCTION',
      label: 'Native V2 handler path',
      steps: [
        ['SOURCE', 'V2 spawn_agent handler', 'Version-matched handler prepares the request and calls the shared AgentControl interface.'],
        ['BINARY + SOURCE', 'Candidate controller tables', 'Both installed tables contain LocalAgentControl::spawn at +0x28; no evidence ties the handler receiver to either table.'],
        ['SOURCE ORDER', 'Started follows acceptance', 'The handler emits Started after AgentControl::spawn returns. This is the source contract, not a captured Desktop event.']
      ],
      boundary: 'Static V2 explanation. The installed Desktop UI was not the source of the captured CLI run below.'
    },
    cli: {
      eyebrow: 'CAPTURED ROLLOUTS · INSTALLED CLI 0.163.0-ALPHA.10.2',
      label: 'Observed V1 CLI run',
      steps: [
        ['PARENT TURN · V1', 'codex exec', 'The parent turn context records multi_agent_version = v1; the invocation explicitly enabled multi_agent in read-only mode.'],
        ['SPAWN EVENT', 'spawn_agent → child thread', 'The parent event stream records child 01a145e7-03fd-7cb2-b0f6-d6acbe0d8caa, linked back to parent 01a145e6-d7ff-7793-9b37-1f1b50fc57ed.'],
        ['WAIT COMPLETE', 'Child returns marker', 'The child rollout records parent_thread_id and V1; the parent receives CODEX-SUBAGENT-PROBE-1017 and completes.']
      ],
      boundary: 'Runtime evidence for this CLI exec only. It does not identify a Desktop conversation’s controller, vtable, or panel updates.'
    },
    lab: {
      eyebrow: 'THIS LAB · LOCAL IMPLEMENTATION FLOW',
      label: 'CLI-backed Lab coordinator',
      steps: [
        ['REQUEST', 'spawn_agent handler', 'The bridge validates the request and creates a local in-memory task record.'],
        ['QUEUE RECEIPT', 'queue_admitted = true', 'The response confirms scheduler admission; process_start_confirmed remains false at this point.'],
        ['SCHEDULER', 'Launch codex exec later', 'The scheduler starts the child process and reports its result through task state and the parent inbox.']
      ],
      boundary: 'Implementation semantics from this Lab’s code. Queue admission and child-process start are different events.'
    },
    v2Attempt: {
      eyebrow: 'CAPTURED CLI ATTEMPT · NO CHILD EVIDENCE',
      label: 'Marker claim rejected by the event trace',
      steps: [
        ['MODEL TEXT', '“I’ll spawn one child”', 'The parent announces an intention. No spawn_agent item follows in the captured stream.'],
        ['TOOL EVENT', 'wait → 0 recipients', 'The only collaboration call is wait; receiver_thread_ids and agents_states are empty.'],
        ['FINAL TEXT', 'Marker appears without a child', 'The parent repeats the requested marker, but there is no child rollout or child result to support it.']
      ],
      boundary: 'Classified as an invalid subagent probe. The feature flag was enabled in a separate CLI listing, but this ephemeral turn has no saved multi_agent_version metadata; the resolved version and reason for the missing spawn remain unknown.'
    },
    v2Run: {
      eyebrow: 'PERSISTED V2 RUN · PARENT AND CHILD LINKED',
      label: 'Spawn is present in the rollout, missing from the CLI JSON projection',
      steps: [
        ['PARENT TURN · V2', 'Resolved version = v2', 'CLI 0.163.0-alpha.10.2 ran with a per-invocation V2 override. The persisted turn_context records V2.'],
        ['PERSISTED RESPONSE ITEMS', 'spawn_agent → child_ok', 'The parent rollout records the completed spawn_agent function call and its matching output. The CLI --json event stream omitted this spawn item.'],
        ['LINKED CHILD ROLLOUT', 'Parent ID matches · CHILD_OK', 'A separate child rollout records thread_spawn.parent_thread_id matching the parent and completes with the requested result.']
      ],
      boundary: 'This proves a persisted V2 child run for this CLI invocation. The CLI event projection showed wait with empty recipient/state fields, so that projection alone cannot establish absence. Why the projections differ, which controller served the run, and whether Desktop rendered the native panel remain unknown.'
    },
    jsonGap: {
      eyebrow: 'VERSION-MATCHED SOURCE · CLI 0.163.0-ALPHA.10.2 · 4EBC485',
      label: 'V2 child activity reaches app-server, then falls out of exec JSON',
      steps: [
        ['CORE · V2 SPAWN', 'Creates child, emits SubAgentActivity', 'After AgentControl::spawn succeeds, the V2 handler emits a Started activity item carrying the child thread ID and task path.'],
        ['APP-SERVER', 'Canonical item notifications', 'Core emits ItemStarted and ItemCompleted. The app-server forwards these notifications, preserving the SubAgentActivity item.'],
        ['CLI · exec --json', 'No matching output variant', 'The JSON mapper handles CollabAgentToolCall, but its fallback returns None for SubAgentActivity. Both lifecycle notifications are omitted.'],
        ['INDEPENDENT RECORD', 'Rollout still links the child', 'The same run’s persisted parent function call and child parent_thread_id prove execution despite the missing JSON item.']
      ],
      boundary: 'The 0.163.0-alpha.10.2 source matches the installed CLI version and explains the observed JSON omission. This establishes the CLI projection boundary only; Desktop renderer delivery and native panel paint are separate and remain unverified.'
    },
    wake: {
      eyebrow: 'LATEST PUBLIC MAIN · 89461EA · SOURCE ONLY',
      label: 'Queued child mail can wake an eligible idle root',
      steps: [
        ['DELIVERY', 'Queue the inter-agent message', 'The handler enqueues mailbox communication before asking the shared scheduler to consider pending work.'],
        ['FEATURE GATE', 'WakeOnAgentMessages enabled', 'Mailbox updates also consult the scheduler from the session submission loop; a message does not bypass scheduling.'],
        ['ELIGIBILITY', 'Idle, uninterrupted root in an automatic mode', 'No active turn may exist; pending mail, root-session identity, non-interrupted state, and a mode that permits automatic turns are required.'],
        ['BOUNDARY', 'Plan mode and child sessions stay queued', 'Source tests cover interrupted root, Plan mode, and a subagent session: no turn is reserved and the communication remains in the mailbox.']
      ],
      boundary: 'This behavior is present in public main at 89461ea. It is not established for the installed 0.163.0-alpha.10.2 CLI or Desktop; this is a source path, not a live runtime capture.'
    },
    lifecycle: {
      eyebrow: 'LATEST PUBLIC MAIN · 89461EA · SOURCE ONLY',
      label: 'A final turn is not a close operation',
      steps: [],
      boundary: 'Compare the separate source paths for normal completion, explicit close, and abnormal thread death.'
    }
  };
  const view = views[nativeEvidenceView] ? nativeEvidenceView : 'v2Run';
  nativeEvidenceView = view;
  const item = views[view];
  const evidenceUrl = view === 'jsonGap'
    ? 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-version-matched-source-explains-the-v2-cli-json-projection-gap-2026-10-19'
    : view === 'wake'
    ? 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-latest-public-main-can-wake-an-idle-root-on-queued-agent-mail-2026-10-19'
    : view === 'lifecycle'
    ? 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-terminal-child-result-delivery-does-not-close-or-release-the-child-2026-10-19'
    : view === 'v2Run'
    ? 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-persisted-v2-child-run-is-absent-from-the-cli-json-spawn-projection-2026-10-19'
    : view === 'v2Attempt'
    ? 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-v2-cli-attempt-did-not-create-a-child-2026-10-17'
    : 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-successful-installed-cli-subagent-probe-2026-10-17';
  return `<section class="native-evidence-journey" aria-labelledby="native-evidence-journey-title">
    <header><div><span>EIGHT EVIDENCE VIEWS</span><h5 id="native-evidence-journey-title">Separate the claimed action from the recorded child</h5></div><a href="${evidenceUrl}" target="_blank" rel="noreferrer">Open evidence record ↗</a></header>
    <div class="native-evidence-tabs" role="group" aria-label="Choose an evidence view">${[['v2Run','V2 run · child linked'],['jsonGap','Why JSON omits spawn'],['wake','Queued mail wake · latest main'],['lifecycle','Complete vs close'],['source','Native source'],['cli','Captured V1 run'],['v2Attempt','V2 attempt · no child'],['lab','This Lab']].map(([key,label]) => `<button type="button" data-native-evidence-view="${key}" aria-pressed="${view === key}">${label}</button>`).join('')}</div>
    <div class="native-evidence-panel" aria-live="polite" data-layer="${view}">
      <div class="native-evidence-panel-heading"><b>${item.label}</b><span>${item.eyebrow}</span></div>
      ${view === 'lifecycle' ? nativeLifecycleMarkup() : `<ol class="native-evidence-steps">${item.steps.map(([tag,title,detail],index) => `<li><span>${String(index + 1).padStart(2,'0')}</span><div><small>${tag}</small><b>${title}</b><p>${detail}</p></div></li>`).join('')}</ol><p class="native-evidence-boundary"><b>Boundary</b> ${item.boundary}</p>`}
    </div>
  </section>`;
}

function nativeSpawnTraceMarkup() {
  const sourceRoot = 'https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/core/src';
  const steps = [
    {
      label: 'Tool handler',
      tag: 'SOURCE + BINARY SYMBOL',
      title: 'V2 handler receives spawn_agent',
      text: 'The version-matched source enters Handler::handle, then awaits handle_spawn_agent. The installed Mach-O has the matching V2 handler symbol at 0x1057de9a0. A symbol locates code; it does not prove this Desktop path ran.',
      file: 'tools/handlers/multi_agents_v2/spawn.rs',
      href: `${sourceRoot}/tools/handlers/multi_agents_v2/spawn.rs`
    },
    {
      label: 'Prepare request',
      tag: 'PINNED SOURCE',
      title: 'Resolve config, identity, and initial input',
      text: 'The shared thread_spawn::spawn path validates the initial message, prepares the child config and role, creates its task path and spawn source, then builds the AgentControl request.',
      file: 'thread_spawn.rs',
      href: `${sourceRoot}/thread_spawn.rs`
    },
    {
      label: 'Build controller',
      tag: 'INSTALLED BINARY + SOURCE CORRELATION',
      title: 'The local controller has a construction path',
      text: 'The installed binary places ThreadManager::agent_control_for_config at 0x1055d9870; it calls an internal routine at 0x10561cac0. That routine generates a UUID v7 and stores it at object offset +0x60. The matched public source maps this boundary to LocalAgentControl::new(...), without proving package build provenance.',
      file: 'controller construction · static disassembly',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-local-controller-construction-path-in-the-installed-binary-2026-10-17'
    },
    {
      label: 'Decode vtables',
      tag: 'STATIC SLOT DISPATCH · LIVE TABLE UNKNOWN',
      title: 'Both candidate tables dispatch through identity',
      text: 'Disassembly shows a static indirect call through slot +0x18 (identity) for each candidate table: A at 0x104bf5ddc and B at 0x10574466c. Both tables also contain resolve at +0x20 and spawn at +0x28. This proves static callsites use these slots; it does not identify the table selected by the constructor or the V2 handler receiver.',
      file: 'candidate method-table slot dispatch',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-candidate-table-references-dispatch-through-the-first-method-slot'
    },
    {
      label: 'Create child',
      tag: 'SOURCE CONTRACT · BINARY DISPATCH UNKNOWN',
      title: 'The handler calls through AgentControl::spawn',
      text: 'The pinned source calls AgentControl::spawn with MessageDeliveryMode::TriggerTurn. The installed binary exports LocalAgentControl::spawn at 0x105623b3c, but the handler’s indirect receiver has not been connected to either candidate table. The concrete controller used by a particular spawn remains unknown.',
      file: 'agent/control/spawn.rs',
      href: `${sourceRoot}/agent/control/spawn.rs`
    },
    {
      label: 'Return activity',
      tag: 'PINNED SOURCE',
      title: 'Emit Started after acceptance',
      text: 'After spawn returns, the handler emits SubAgentActivityKind::Started and formats the task name result. The receipt marks accepted creation; it is not child completion.',
      file: 'tools/handlers/multi_agents_v2/spawn.rs',
      href: `${sourceRoot}/tools/handlers/multi_agents_v2/spawn.rs`
    },
    {
      label: 'Telemetry call',
      tag: 'DIRECT MACHINE-CODE CALL',
      title: 'The handler records the collaboration tool call',
      text: 'LLDB resolves the direct BL at 0x1057df0b4 to AnalyticsEventsClient::track_collab_tool_call. This independently matches the pinned handler’s analytics call; it does not recover the rest of the native call graph.',
      file: 'installed Mach-O · 0x1057df0b4',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-exact-tag-source-comparison-and-one-resolved-v2-handler-call-2026-10-17'
    }
  ];
  nativeSpawnFocus = Math.max(0, Math.min(steps.length - 1, Number(nativeSpawnFocus) || 0));
  const step = steps[nativeSpawnFocus];
  const constructionEvidence = 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-local-controller-construction-path-in-the-installed-binary-2026-10-17';
  return `<section class="native-spawn-trace" aria-labelledby="native-spawn-trace-title">
    <div class="native-spawn-heading"><div><span>INSTALLED ARM64 · STATIC V2 CROSS-CHECK</span><h5 id="native-spawn-trace-title">Follow the request across source and binary evidence</h5></div><small>Codex 0.163.0-alpha.10.2 · tag 4ebc485</small></div>
    ${nativeEvidenceJourneyMarkup()}
    <div class="controller-map" aria-label="Controller construction and spawn dispatch evidence map">
      <div class="controller-map-lane"><span class="controller-lane-label">SESSION SETUP</span><button type="button" data-native-spawn-step="2"><b>ThreadManager</b><small>agent_control_for_config</small><code>0x1055d9870</code></button><i aria-hidden="true">→</i><button type="button" data-native-spawn-step="2"><b>LocalAgentControl</b><small>constructor boundary</small><code>0x10561cac0</code></button><i class="controller-unknown-edge" aria-hidden="true">⇢ ?</i><button type="button" data-native-spawn-step="3" class="controller-unknown-node"><b>vtable selection</b><small>not resolved</small></button></div>
      <div class="controller-candidates"><span>STATIC METHOD TABLES</span><button type="button" data-native-spawn-step="3"><b>TABLE A</b><small>0x10e3978a0 · ref 0x104bf5dcc</small><small>+18 identity · +20 resolve · +28 spawn</small></button><button type="button" data-native-spawn-step="3"><b>TABLE B</b><small>0x10e3bbca0 · refs 0x10561bdbc / 0x10574465c</small><small>+18 identity · +20 resolve · +28 spawn</small></button></div>
      <div class="controller-slot-flow" aria-label="Static indirect calls and equivalent identity method bodies in candidate tables"><span>STATIC CALLSITES</span><div><b>TABLE A</b><code>+0x18</code><i aria-hidden="true">→</i><strong>identity()</strong><small>blr at 0x104bf5ddc</small></div><div><b>TABLE B</b><code>+0x18</code><i aria-hidden="true">→</i><strong>identity()</strong><small>blr at 0x10574466c</small></div><p>Both identity entries read the same 16-byte UUID at object +0x60. Their equivalent code does not reveal which vtable a live task selected.</p><div class="controller-identity-body"><span>ENTRY A · 0x104afe99c</span><span>ENTRY B · 0x105624944</span><div><code>ldr q0, [x0, #0x60]</code><i aria-hidden="true">→</i><code>str q0, [x8]</code><i aria-hidden="true">→</i><code>ret</code></div></div></div>
      <div class="controller-map-lane controller-turn-lane"><span class="controller-lane-label">TURN / SPAWN</span><button type="button" data-native-spawn-step="0"><b>V2 handler</b><small>spawn_agent</small></button><i aria-hidden="true">→</i><button type="button" data-native-spawn-step="4"><b>AgentControl::spawn</b><small>indirect target unknown</small></button><i aria-hidden="true">→</i><button type="button" data-native-spawn-step="5"><b>Started</b><small>after spawn returns</small></button></div>
      <p><b>Solid:</b> symbol/source-correlated locations and static references. <b>Dashed:</b> the selected runtime controller is not recovered.</p>
      <a href="${constructionEvidence}" target="_blank" rel="noreferrer">Open construction and vtable evidence ↗</a>
    </div>
    <div class="native-spawn-rail" role="group" aria-label="V2 spawn evidence checkpoints">${steps.map((item, index) => `<button type="button" data-native-spawn-step="${index}" aria-pressed="${index === nativeSpawnFocus}"><span>0${index + 1}</span><b>${item.label}</b></button>`).join('')}</div>
    <article class="native-spawn-detail" aria-live="polite"><div><span>${step.tag}</span><a href="${step.href}" target="_blank" rel="noreferrer">${step.file} ↗</a></div><h6>${step.title}</h6><p>${step.text}</p>
      <div class="spawn-admission-compare" aria-label="Compare native spawn acceptance with local Lab queue admission">
        <section><small>CODEX NATIVE · ACCEPTANCE RECEIPT</small><b>AgentControl::spawn returns</b><p>The handler can then emit <code>Started</code>. The receipt means the child turn was accepted, not completed.</p></section>
        <section><small>THIS LAB · QUEUE ADMISSION</small><b><code>spawn_agent</code> returns queued</b><p>The local task exists in memory; its CLI process may not have started. Launch failure is reported later through task state and the parent inbox.</p></section>
      </div>
    </article>
    <p class="native-spawn-boundary"><b>Evidence boundary</b> Same-version source improves comparison confidence, but there is no signed build provenance. The captured runtime path above is standalone CLI V1; no Desktop conversation spawn or panel update was captured.</p>
  </section>`;
}
function standaloneStaticSpawnTraceMarkup() {
  const evidenceUrl = 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-standalone-binary-data-confirms-the-agentcontrolspawn-vtable-slot';
  const sourceRoot = 'https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/core/src';
  const steps = [
    ['BINARY IDENTITY', 'Hash-pinned standalone target', 'The standalone CLI is version 0.162.1, ARM64 Mach-O UUID 73DB38F2-5290-3277-BCCC-287C54E2F0CD, SHA-256 74c6a6d263f40d65f99c27a815275f5b4ed0bcc2baecc396b4cf3255498bdfc0. The V2 handler symbol is at 0x105a6af0c.', 'Binary observation · nm', evidenceUrl],
    ['SOURCE BUILDER', 'Spawn metadata call resolves', 'The async poll contains a direct call to thread_spawn_source at 0x105a6b91c. Exact-tag source constructs the spawn source and request; this call site is directly resolved in the standalone binary.', 'Direct machine-code call', `${sourceRoot}/tools/handlers/multi_agents_v2/spawn.rs`],
    ['SPAWN DISPATCH', 'The +0x28 slot matches spawn; runtime receiver unknown', 'Direct dataflow: [x19 + 0x298] is copied to [x19 + 0x2c0] at 0x105a6b314–0x105a6b318; from there, x25 is loaded at 0x105a6bb84. The adjacent words x25+0x978 and x25+0x980 load into x21 and x28; x28 is saved at [sp+0x38] and reloaded at 0x105a6bef8, then [x28+0x28] is loaded into x8 immediately before blr x8 at 0x105a6bf0c. Exact-tag source identifies SessionServices.agent_control as Arc<dyn AgentControl>, making the x21/data + x28/vtable interpretation a strong source-correlated inference; the call’s x0 is x27+0x10 and x1 points to the prepared request. The method table slot order and LocalAgentControl pointer are independently confirmed in binary data, but this does not resolve the runtime value of x28 or prove the concrete implementation selected. The call returns two words stored in the async frame; at 0x105a6bf30 code loads a function pointer from +0x18 of the second word, keeps the first word in x0, restores x1 from x27, and calls it. The resume path repeats this shape at 0x105a6b530. The panic Location at 0x105a6b124 decodes to spawn.rs:112:3; this supports source attribution but does not expose the inline/codegen chain.', 'Direct register flow + source-correlated trait-object inference', `${sourceRoot}/agent/control/spawn.rs`],
    ['ACCEPTANCE + TELEMETRY', 'Source ordering and one resolved call', 'The matching source emits Started only after spawn returns. The binary also directly calls track_collab_tool_call at 0x105a6cc44. Telemetry does not prove the indirect spawn target or a launched child.', 'Source order + direct call', `${sourceRoot}/tools/handlers/multi_agents_v2/spawn.rs`]
  ];
  standaloneStaticSpawnFocus = Math.max(0, Math.min(steps.length - 1, Number(standaloneStaticSpawnFocus) || 0));
  standaloneEvidenceLens = Math.max(0, Math.min(2, Number(standaloneEvidenceLens) || 0));
  const [label, title, text, tag, href] = steps[standaloneStaticSpawnFocus];
  const evidenceLenses = [
    ['MACHINE-CODE OBSERVATION', 'Observed register and instruction flow', 'The disassembly shows x28 loaded from [x25+0x980], saved and reloaded, then used for [x28+0x28] → x8 before blr x8. This establishes the address flow; it does not prove x28’s runtime type or value.', 'machine'],
    ['BINARY METHOD-TABLE CONFIRMATION', 'The +0x28 slot names spawn', 'Two __DATA_CONST tables contain 0x10497fc98 at +0x28; nm names that address LocalAgentControl::spawn, and the pinned AgentControl source order matches. This confirms the slot-to-method mapping in static binary data.', 'table'],
    ['RUNTIME UNKNOWN', 'The selected receiver is not recovered', 'No runtime capture ties x28 to either candidate table. The indirect call’s x0 is separately formed as x27+0x10, and its relationship to x21 is unresolved. Which concrete implementation this run would call remains unknown.', 'unknown']
  ];
  const activeLens = evidenceLenses[standaloneEvidenceLens];
  const dispatchDiagram = standaloneStaticSpawnFocus === 2 ? `<div class="standalone-dispatch-visuals" data-active-lens="${activeLens[3]}">
    <div class="standalone-evidence-lenses" role="group" aria-label="Choose the evidence layer to inspect">${evidenceLenses.map(([name,, , kind], index) => `<button type="button" class="standalone-evidence-lens lens-${kind}" data-standalone-evidence-lens="${index}" aria-pressed="${index === standaloneEvidenceLens}"><span>0${index + 1}</span><b>${name}</b></button>`).join('')}</div>
    <p class="standalone-evidence-focus lens-${activeLens[3]}" aria-live="polite"><b>${activeLens[1]}</b>${activeLens[2]}</p>
    <div class="standalone-dispatch-map" role="img" aria-label="Machine-code observation: frame copy, adjacent context words, x28 spill and reload, slot load at plus 0x28, then indirect call"><div data-evidence-target="machine"><small>MACHINE CODE · FRAME</small><b>x19 → x25</b><code>[+0x298] → [+0x2c0]</code></div><i aria-hidden="true">→</i><div data-evidence-target="machine"><small>ADJACENT WORDS</small><b>x21 / x28</b><code>[x25+0x978] / [x25+0x980]</code></div><i aria-hidden="true">→</i><div data-evidence-target="machine"><small>REGISTER FLOW</small><b>x28 → x8</b><code>spill/reload · [x28+0x28]</code></div><i aria-hidden="true">→</i><div class="standalone-dispatch-target" data-evidence-target="machine"><small>INDIRECT CALL</small><b>blr x8</b><code>0x105a6bf0c</code></div></div>
    <section class="standalone-vtable-map" data-evidence-target="table" aria-label="Static method table entries confirm the AgentControl spawn slot at offset plus 0x28"><header><b>METHOD TABLE · BINARY DATA</b><span>+0x28 → LocalAgentControl::spawn</span></header><div class="standalone-vtable-rows"><article><small>HEADER</small><b>drop · size · align</b><code>0x104cf8d04 · 0x70 · 8</code></article><i aria-hidden="true">→</i><article><small>+0x18</small><b>identity</b><code>0x104980a9c</code></article><i aria-hidden="true">→</i><article><small>+0x20</small><b>resolve</b><code>0x104980804</code></article><i aria-hidden="true">→</i><article class="standalone-vtable-spawn"><small>+0x28</small><b>spawn</b><code>0x10497fc98</code></article></div><p>Both candidate __DATA_CONST tables have this +0x28 pointer. The runtime value of x28 has not been matched to either table.</p></section>
    ${standaloneVtableInspectionMarkup()}
    <aside class="standalone-runtime-unknown" data-evidence-target="unknown"><span>RUNTIME RECEIVER · UNKNOWN</span><b>x28 value and selected table were not captured</b><small>The static slot match does not establish which implementation this execution would dispatch to.</small></aside>
    <section class="standalone-poll-map" aria-label="ABI-based interpretation of the following indirect call"><header><b>THE NEXT CALL · ABI INFERENCE</b><span>strong Future::poll match</span></header><div class="standalone-poll-steps"><article><small>RETURNED PAIR</small><b>x0 · data</b><code>x1 · vtable-like metadata</code></article><i aria-hidden="true">→</i><article><small>SELECT SLOT</small><b>[x1 + 0x18]</b><code>function pointer → x9</code></article><i aria-hidden="true">→</i><article><small>RESTORE CONTEXT</small><b>x0 stays · x1 = x27</b><code>x27 copied from entry x1</code></article><i aria-hidden="true">→</i><article class="standalone-poll-call"><small>INDIRECT CALL</small><b>blr x9</b><code>0x105a6bf30</code></article></div><p>Resume path reloads the saved pair and repeats the same slot/context pattern at <code>0x105a6b530</code>.</p></section>
  </div>` : '';
  return `<section class="standalone-static-trace" aria-labelledby="standalone-static-title">
    <div class="standalone-static-heading"><div><span>STANDALONE CLI · STATIC V2 BINARY CROSS-CHECK</span><h5 id="standalone-static-title">A second binary, a separate evidence path</h5></div><small>0.162.1 · tag 092d3ac</small></div>
    <p class="standalone-static-intro">This hash-pinned CLI disassembly is separate from the Desktop 0.163.0-alpha.10.2 symbol cross-check above and the V1 JSONL runtime capture below.</p>
    <div class="standalone-static-rail" role="group" aria-label="Standalone CLI static evidence checkpoints">${steps.map((item, index) => `<button type="button" data-standalone-static-step="${index}" aria-pressed="${index === standaloneStaticSpawnFocus}"><span>0${index + 1}</span><b>${item[0]}</b></button>`).join('')}</div>
    <article class="standalone-static-detail" aria-live="polite"><div><span>${tag}</span><a href="${href}" target="_blank" rel="noreferrer">${standaloneStaticSpawnFocus === 0 ? 'evidence ledger' : standaloneStaticSpawnFocus === 2 ? 'confirmed slot evidence ledger' : 'exact-tag handler source'} ↗</a></div><h6>${title}</h6><p>${text}</p>${dispatchDiagram}</article>
    <p class="standalone-static-boundary"><b>Boundary</b> The frame copy and first target’s pointer path are directly observed. Static method tables confirm that AgentControl +0x28 is LocalAgentControl::spawn, but the runtime x28 value and concrete selected table remain unresolved. The returned pair’s repeated +0x18/context call supports a future-poll interpretation. The matching handler uses <code>Arc&lt;dyn AgentControl&gt;</code>; the source can populate it with a local or host-provided controller, so this does not identify the binary receiver. The panic Location decodes to <code>spawn.rs:112:3</code>; LLDB’s nearby <code>handle_task_abort</code> label was a nearest-symbol annotation, not the encoded source location. This supports the spawn-handler attribution but does not recover the inline/codegen chain. Version-matched source is comparative evidence, not signed build provenance. No child was launched; the separate V1 runtime record does not exercise this V2 handler.</p>
  </section>`;
}
function standaloneVtableInspectionMarkup() {
  const artifacts = {
    standalone: {
      label: 'Standalone CLI · 0.162.1',
      hash: 'SHA-256 74c6a6d263f40d65f99c27a815275f5b4ed0bcc2baecc396b4cf3255498bdfc0',
      evidenceUrl: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-standalone-binary-data-confirms-the-agentcontrolspawn-vtable-slot',
      tables: [
        ['0x10e084ef0', '0x104cf8d04', '0x104980a9c', '0x104980804', '0x10497fc98'],
        ['0x10e0bc698', '0x1056bbc80', '0x1053a89d8', '0x104980804', '0x10497fc98']
      ]
    },
    desktop: {
      label: 'Desktop embedded · 0.163.0-alpha.10.2',
      hash: 'SHA-256 1afb28c01d7d49e892bd75f11076b10f1451e34e0ee308a95e5ab7f69f9c84fe',
      evidenceUrl: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-installed-0-163-0-agentcontrol-method-table-entries-2026-10-17',
      tables: [
        ['0x10e3978a0', '0x104e6f79c', '0x104afe99c', '0x1056246ac', '0x105623b3c'],
        ['0x10e3bbca0', '0x10595d09c', '0x105624944', '0x1056246ac', '0x105623b3c']
      ]
    }
  };
  const selected = artifacts[standaloneVtableArtifact] || artifacts.desktop;
  const evidenceUrl = selected.evidenceUrl;
  return `<section class="cross-version-table" data-evidence-target="table" aria-label="Inspect candidate AgentControl method tables from two hash-pinned binaries">
    <header><div><b>METHOD TABLE INSPECTOR · STATIC BINARY DATA</b><span>${selected.label} · two candidates</span></div><a href="${evidenceUrl}" target="_blank" rel="noreferrer">evidence ledger ↗</a></header>
    <div class="vtable-artifact-picker" role="group" aria-label="Choose binary sample to inspect">${[['standalone','Standalone CLI · 0.162.1'],['desktop','Desktop embedded · 0.163.0']].map(([id,label]) => `<button type="button" data-vtable-artifact="${id}" aria-pressed="${id === standaloneVtableArtifact}">${label}</button>`).join('')}</div>
    <div class="vtable-cards" aria-live="polite">${selected.tables.map(([address,drop,identity,resolve,spawn],index) => `<article class="vtable-card"><div class="vtable-card-heading"><span>CANDIDATE TABLE 0${index+1}</span><code>${address}</code></div><div class="vtable-layout"><span>drop</span><code>${drop}</code><span>size / align</span><code>0x70 / 8</code></div><div class="vtable-method"><span>+0x18 · identity</span><code>${identity}</code></div><div class="vtable-method"><span>+0x20 · resolve</span><code>${resolve}</code></div><div class="vtable-method vtable-spawn"><span>+0x28 · spawn</span><code>${spawn}</code></div></article>`).join('')}</div>
    <p class="vtable-slot-note"><strong>Same slot order in both samples:</strong> <code>identity → resolve → spawn</code>. The named <code>+0x28</code> pointer is the LocalAgentControl implementation. These are static candidates; neither binary's runtime receiver was captured.</p>
    <span class="vtable-hash" title="${selected.hash}">${selected.hash}</span>
  </section>`;
}
function nativeCliTraceMarkup() {
  const events = [
    ['01', 'spawn_agent · started', 'in_progress', 'The parent begins the collaboration tool call.'],
    ['02', 'spawn_agent · completed', 'child: pending_init', 'One receiver is returned before the child initializes.'],
    ['03', 'wait · started', 'in_progress', 'The parent waits on that same child thread.'],
    ['04', 'wait · completed', 'child: completed', 'The wait result carries the child status and message.'],
    ['05', 'parent · agent_message', 'result returned', 'The root turn reports the child marker and finding.']
  ];
  return `<section class="native-cli-trace" aria-labelledby="native-cli-trace-title">
    <div class="native-cli-heading"><div><span class="native-cli-eyebrow">OBSERVED RUN · STANDALONE CODEX CLI 0.162.1</span><h6 id="native-cli-trace-title">One child, from spawn receipt to parent result</h6></div><span class="native-cli-proof">JSONL · read-only · ephemeral</span></div>
    <p class="native-cli-intro">The captured event stream separates “spawn completed” from “child completed”. Select a step to inspect the evidence.</p>
    <ol class="native-cli-timeline" aria-label="Observed native CLI event sequence">${events.map(([index,title,status],i) => `<li><button type="button" class="native-cli-event ${i===1?'is-active':''}" data-native-cli-step="${i}" aria-pressed="${i===1}"><span class="native-cli-index">${index}</span><span class="native-cli-copy"><strong>${title}</strong><small>${status}</small></span></button>${i<events.length-1?'<i aria-hidden="true">↓</i>':''}</li>`).join('')}</ol>
    <div class="native-cli-detail" aria-live="polite"><span>EVENT 02 · SPAWN RECEIPT</span><p>The receiver list contains one child; its state is <code>pending_init</code> and its message is <code>null</code>. A separate <code>wait</code> call later observes completion.</p></div>
    <div class="native-cli-meta"><span><b>FLAGS</b> <code>multi_agent=true</code> · <code>multi_agent_v2=false</code></span><span><b>CHILD OUTPUT</b> README observation returned through <code>wait</code>, then parent message</span></div>
    <p class="native-cli-boundary">This is an observed standalone CLI JSONL sequence, not a Desktop capture. It proves serialized event order and reported statuses; it does not expose the child’s internal transcript.</p>
    <p class="native-cli-source"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/native-cli-v1-run.md" target="_blank" rel="noreferrer">Run details, redacted excerpt and SHA-256</a></p>
  </section>`;
}
function selectSpawnProtocol(key, value) {
  if (key === 'version') spawnProtocolVersion = value === 'v1' ? 'v1' : 'v2';
  if (key === 'outcome') spawnProtocolOutcome = value === 'prepare-failure' ? 'prepare-failure' : 'success';
  const panel = $('.spawn-protocol-trace');
  if (panel) panel.outerHTML = spawnProtocolMarkup();
}
function selectNativeCliStep(index) {
  const steps = [
    ['EVENT 01 · SPAWN STARTED', 'The JSONL item begins with <code>tool=spawn_agent</code> and <code>status=in_progress</code>; no receiver is listed yet.'],
    ['EVENT 02 · SPAWN RECEIPT', 'The receiver list contains one child; its state is <code>pending_init</code> and its message is <code>null</code>. A separate <code>wait</code> call later observes completion.'],
    ['EVENT 03 · WAIT STARTED', 'The parent starts <code>tool=wait</code> for the same child ID. This is a new collaboration tool call after the spawn receipt.'],
    ['EVENT 04 · CHILD COMPLETED', 'The wait call completes with child state <code>completed</code> and returns the README finding in the child message field.'],
    ['EVENT 05 · PARENT RESULT', 'After wait returns, the root agent emits an <code>agent_message</code> containing the child marker and finding.']
  ];
  const trace = $('.native-cli-trace');
  if (!trace) return;
  const selected = Math.max(0, Math.min(steps.length - 1, Number(index) || 0));
  trace.querySelectorAll('[data-native-cli-step]').forEach(button => {
    const active = Number(button.dataset.nativeCliStep) === selected;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const [label,copy] = steps[selected];
  trace.querySelector('.native-cli-detail').innerHTML = `<span>${label}</span><p>${copy}</p>`;
}
function terminalLifecycleMarkup() {
  const scenarios = {
    completed: {
      title: 'TurnComplete · no error', status: 'Completed(last_agent_message)', final: 'yes',
      activity: 'Completed activity may be emitted', result: 'Formatted child result queued to structural parent',
      note: 'Completed activity targets the initiating thread when parent-turn metadata and initiator resolution are available. Result delivery is a separate queue-only message with trigger_turn=false.'
    },
    errored: {
      title: 'TurnComplete(error) / terminal error', status: 'Errored(error)', final: 'yes',
      activity: 'No Completed activity', result: 'Error result + next-action guidance queued',
      note: 'The completion activity is gated on Completed status. Error status is terminal, so the formatted result can still be queued for the structural parent.'
    },
    interrupted: {
      title: 'TurnAborted · Interrupted or BudgetLimited', status: 'Interrupted', final: 'no',
      activity: 'No terminal Completed activity', result: 'No terminal result message',
      note: 'Interrupted is excluded by is_final. A successful explicit interrupt_agent call can separately emit an Interrupted activity; that activity is not proof the child produced a result.'
    },
    guardian: {
      title: 'TurnAborted · Guardian TooManyDenials', status: 'Child remains Interrupted', final: 'parent route treats outcome as Errored',
      activity: 'No Completed activity', result: 'Guardian safety-stop message queued',
      note: 'Special case: the child status is not rewritten, but the parent receives a Guardian-specific result with recovery guidance.'
    }
  };
  const s = scenarios[terminalScenario] ?? scenarios.completed;
  const ids = Object.keys(scenarios);
  const labels = {completed:'Completed', errored:'Errored', interrupted:'Interrupted', guardian:'Guardian stop'};
  const selectedIndex = ids.indexOf(terminalScenario);
  const stages = [
    ['01 · CHILD EVENT', s.title, 'Session emits terminal turn event'],
    ['02 · STATUS', s.status, `is_final = ${s.final}`],
    ['03 · ACTIVITY STREAM', s.activity, 'Typed activity is separate from the result payload'],
    ['04 · PARENT INBOX', s.result, 'Queue acceptance does not prove parent-model consumption']
  ];
  return `<section class="terminal-lifecycle" aria-labelledby="terminal-lifecycle-title" data-scenario="${terminalScenario}">
    <div class="terminal-lifecycle-heading"><div><span class="terminal-lifecycle-eyebrow">V2 · TERMINAL TURN ROUTING</span><h5 id="terminal-lifecycle-title">A child ending can produce different parent signals</h5></div><span>public main · 111362a</span></div>
    <p class="terminal-lifecycle-intro">切换终态分支，查看 child status、activity stream 和 parent inbox 的分流。状态事件、UI 活动卡片和发给父线程的结果消息不是同一件事。</p>
    <div class="terminal-lifecycle-controls" role="group" aria-label="Choose a V2 child terminal outcome">${ids.map(id => `<button type="button" data-terminal-scenario="${id}" aria-pressed="${terminalScenario === id}">${labels[id]}</button>`).join('')}</div>
    <div class="terminal-lifecycle-map" aria-live="polite">${stages.map(([eyebrow,title,detail], i) => `<article class="terminal-lifecycle-node node-${i+1}"><span>${eyebrow}</span><strong>${title}</strong><small>${detail}</small></article>${i < stages.length - 1 ? '<i aria-hidden="true">→</i>' : ''}`).join('')}</div>
    <div class="terminal-lifecycle-note"><b>PATH DETAIL</b><span>${s.note}</span></div>
    <p class="terminal-lifecycle-boundary">This is a static source trace, not a captured live Desktop event stream. A successful send means the parent accepted queued input; it does not prove its model has read or acted on it.</p>
    <p class="terminal-lifecycle-sources"><a href="https://github.com/openai/codex/blob/111362a6a0a92d08885b1ae62d3760714907ad94/codex-rs/core/src/agent/status.rs#L6-L30" target="_blank" rel="noreferrer">status mapping and finality</a> · <a href="https://github.com/openai/codex/blob/111362a6a0a92d08885b1ae62d3760714907ad94/codex-rs/core/src/session/mod.rs#L2504-L2572" target="_blank" rel="noreferrer">V2 terminal callback</a> · <a href="https://github.com/openai/codex/blob/111362a6a0a92d08885b1ae62d3760714907ad94/codex-rs/core/src/agent/control/completion.rs#L27-L154" target="_blank" rel="noreferrer">parent activity and result routing</a> · <a href="https://github.com/openai/codex/blob/111362a6a0a92d08885b1ae62d3760714907ad94/codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs#L48-L76" target="_blank" rel="noreferrer">explicit interrupt activity</a></p>
  </section>`;
}
function selectTerminalScenario(value) {
  terminalScenario = ['errored','interrupted','guardian'].includes(value) ? value : 'completed';
  const panel = $('.terminal-lifecycle');
  if (panel) panel.outerHTML = terminalLifecycleMarkup();
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
function renderInteractionSequence(task, parent, children, interactionItems) {
  const participants = [...new Map([parent, task, ...children].filter(Boolean).map(item => [item.id, item])).values()];
  if (participants.length < 2) return '';
  const participantIds = new Set(participants.map(item => item.id));
  const items = [];
  const eventNames = {
    started:'Agent process started', session_ready:'Codex session became available',
    agent_spawned:'Child agent created', finished:'Agent process finished',
    timeout:'Runtime limit reached', timing_out:'Stopping after runtime limit',
    cancelled:'Agent cancelled', message:'Agent output received', raw:'Unparsed CLI event',
  };
  for (const actor of participants) {
    if (actor.createdAt) items.push({ at:actor.createdAt, actorId:actor.id, kind:'created', label:'Task admitted to Lab', detail:'Local task record created' });
    for (const event of actor.events ?? []) {
      if (!event.at) continue;
      items.push({ at:event.at, actorId:actor.id, kind:event.kind ?? 'event', label:eventNames[event.kind] ?? String(event.kind ?? 'event').replaceAll('_',' '), detail:event.detail ?? '' });
    }
    if (actor.startedAt && !(actor.events ?? []).some(event => event.kind === 'started')) {
      items.push({ at:actor.startedAt, actorId:actor.id, kind:'started', label:eventNames.started, detail:'Start timestamp recorded by Lab' });
    }
    if (actor.finishedAt && !(actor.events ?? []).some(event => event.kind === 'finished')) {
      items.push({ at:actor.finishedAt, actorId:actor.id, kind:'finished', label:eventNames.finished, detail:`status=${actor.status}` });
    }
  }
  for (const { recipient, message } of interactionItems) {
    if (!participantIds.has(recipient.id) || !participantIds.has(message.from)) continue;
    const result = message.kind === 'task_result';
    items.push({ at:message.at, actorId:message.from, targetId:recipient.id, kind:result ? 'result' : 'message', label:result ? 'Child result queued' : 'Message queued', detail:message.text ?? '' });
    if (message.deliveryState === 'read' && message.readAt) {
      items.push({ at:message.readAt, actorId:recipient.id, targetId:message.from, kind:'supplied', label:'Inbox item supplied to task tool', detail:result ? 'Result included in coordinator tool input' : 'Message included in coordinator tool input' });
    }
  }
  const ordered = items.filter(item => Number.isFinite(new Date(item.at).getTime())).sort((a,b) => new Date(a.at) - new Date(b.at));
  if (!ordered.length) return '';
  const visible = ordered.slice(-16);
  const actorName = id => id === task.id ? 'Selected task' : id === parent?.id ? 'Parent task' : 'Child task';
  const laneTasks = participants;
  const laneIndex = new Map(laneTasks.map((actor, index) => [actor.id, index]));
  const laneHeight = 42;
  const chartHeight = Math.max(72, laneTasks.length * laneHeight + 24);
  const chartWidth = 960;
  const labelWidth = 190;
  const chartStart = labelWidth + 16;
  const chartEnd = chartWidth - 20;
  const xFor = index => visible.length < 2 ? (chartStart + chartEnd) / 2 : chartStart + (chartEnd - chartStart) * index / (visible.length - 1);
  const kindClass = item => item.kind === 'result' ? 'result' : ['message','supplied'].includes(item.kind) ? 'handoff' : ['failed','timeout','timing_out','cancelled'].includes(item.kind) ? 'attention' : ['started','agent_spawned','created'].includes(item.kind) ? 'start' : 'finish';
  const laneMarkup = laneTasks.map((actor, index) => {
    const y = 20 + index * laneHeight;
    const laneLabel = index === 0 && actor.id === parent?.id ? 'PARENT' : actor.id === task.id ? 'SELECTED' : actor.id === parent?.id ? 'PARENT' : 'CHILD';
    const prompt = String(actor.prompt ?? 'Agent').length > 27 ? `${String(actor.prompt).slice(0,24)}…` : String(actor.prompt ?? 'Agent');
    return `<g class="sequence-lane"><line x1="${chartStart}" x2="${chartEnd}" y1="${y}" y2="${y}"/><text class="sequence-lane-role" x="8" y="${y - 3}">${laneLabel}</text><text class="sequence-lane-name" x="8" y="${y + 10}">${escapeHtml(prompt)}</text></g>`;
  }).join('');
  const eventMarkup = visible.map((item, index) => {
    const actorLane = laneIndex.get(item.actorId);
    if (actorLane === undefined) return '';
    const x = xFor(index);
    const y = 20 + actorLane * laneHeight;
    const kind = kindClass(item);
    const number = String(ordered.length - visible.length + index + 1).padStart(2,'0');
    const title = `${number} · ${item.label} · ${when(item.at)}${item.targetId ? ` · ${actorName(item.actorId)} → ${actorName(item.targetId)}` : ''}`;
    if (item.targetId && laneIndex.has(item.targetId)) {
      const targetY = 20 + laneIndex.get(item.targetId) * laneHeight;
      const middleY = (y + targetY) / 2;
      const path = `M ${x} ${y} Q ${x + 12} ${middleY} ${x} ${targetY}`;
      return `<g class="sequence-plot-event ${kind}" data-sequence-index="${index + 1}" role="button" tabindex="0" aria-label="${escapeHtml(title)} · Select event"><title>${escapeHtml(title)}</title><path class="sequence-handoff-line" d="${path}" marker-end="url(#sequence-arrow)"/><circle class="sequence-plot-mark" cx="${x}" cy="${y}" r="8"/><text class="sequence-plot-number" x="${x}" y="${y + 2.5}">${number.slice(-2)}</text><circle class="sequence-plot-target" cx="${x}" cy="${targetY}" r="3"/></g>`;
    }
    return `<g class="sequence-plot-event ${kind}" data-sequence-index="${index + 1}" role="button" tabindex="0" aria-label="${escapeHtml(title)} · Select event"><title>${escapeHtml(title)}</title><line class="sequence-event-tick" x1="${x}" x2="${x}" y1="${y - 10}" y2="${y + 10}"/><circle class="sequence-plot-mark" cx="${x}" cy="${y}" r="8"/><text class="sequence-plot-number" x="${x}" y="${y + 2.5}">${number.slice(-2)}</text></g>`;
  }).join('');
  const rows = visible.map((item, index) => {
    const target = item.targetId ? taskById(item.targetId) : null;
    const excerpt = item.detail ? escapeHtml(item.detail.length > 180 ? `${item.detail.slice(0,177)}…` : item.detail) : '';
    const sequenceNumber = ordered.length - visible.length + index + 1;
    const route = `${actorName(item.actorId)}${target ? ` → ${actorName(target.id)}` : ''}`;
    return `<li><div class="sequence-event ${escapeHtml(item.kind)}" data-sequence-index="${index + 1}" role="button" tabindex="0" aria-label="${sequenceNumber} · ${escapeHtml(item.label)} · ${escapeHtml(route)} · Select event"><time datetime="${escapeHtml(item.at)}">${escapeHtml(when(item.at))}</time><span class="sequence-mark" aria-hidden="true"></span><div class="sequence-copy"><div class="sequence-meta"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(route)}</span></div>${excerpt ? `<p>${excerpt}</p>` : ''}</div><span class="sequence-index">${String(sequenceNumber).padStart(2,'0')}</span></div></li>`;
  }).join('');
  return `<section class="interaction-sequence" data-sequence-step="${visible.length}" aria-label="Chronological parent and child interaction sequence"><div class="sequence-heading"><div><span class="sequence-eyebrow">EVENT ORDER</span><h5>Lifecycle and handoffs</h5></div><span>${ordered.length} recorded</span></div><div class="sequence-plot-scroll"><svg class="sequence-plot" viewBox="0 0 ${chartWidth} ${chartHeight}" role="group" aria-label="Swimlane diagram. Activate a numbered event to select it."><defs><marker id="sequence-arrow" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5"/></marker></defs>${laneMarkup}${eventMarkup}</svg></div><div class="sequence-legend"><span><i class="legend-lifecycle"></i> lifecycle</span><span><i class="legend-message"></i> message handoff</span><span><i class="legend-result"></i> child result</span></div><p class="sequence-interaction-hint">Select a numbered marker or event row to jump to that step.</p><div class="sequence-scrubber"><button type="button" data-sequence-move="-1" aria-label="Previous event">←</button><label><span>TRACE STEP</span><input type="range" min="1" max="${visible.length}" value="${visible.length}" aria-label="Select event in chronological sequence"></label><button type="button" data-sequence-move="1" aria-label="Next event">→</button><output class="sequence-step-readout" aria-live="polite">${visible.length} / ${visible.length} · ${escapeHtml(visible.at(-1).label)}</output></div><ol class="sequence-list">${rows}</ol><p>Times combine Lab task/mailbox records with captured CLI events. Swimlane spacing shows event order, not elapsed-time scale. “Supplied” means the coordinator included the inbox item in a task-tool call; model interpretation is not observable here.${ordered.length > visible.length ? ` Showing the latest ${visible.length} of ${ordered.length} recorded events.` : ''}</p></section>`;
}
function updateSequenceStep(container, value) {
  if (!container) return;
  const range = container.querySelector('input[type="range"]');
  const max = Number(range?.max) || 1;
  const step = Math.max(1, Math.min(max, Number(value) || 1));
  container.dataset.sequenceStep = String(step);
  if (range) range.value = String(step);
  container.querySelectorAll('[data-sequence-index]').forEach(item => {
    const index = Number(item.dataset.sequenceIndex);
    item.classList.toggle('is-current', index === step);
    item.classList.toggle('is-future', index > step);
    if (item.classList.contains('sequence-event')) {
      if (index === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
  });
  const current = container.querySelector(`.sequence-event[data-sequence-index="${step}"] strong`);
  const output = container.querySelector('.sequence-step-readout');
  const label = current?.textContent ?? 'event';
  if (output) output.textContent = `${step} / ${max} · ${label}`;
  if (range) range.setAttribute('aria-valuetext', `${step} of ${max}: ${label}`);
}
const desktopRuntimeStages = [
  { title:'Parent rollout links two completed spawns', evidence:'One parent turn contains two completed CollabAgentToolCall records. Each record lists a receiver thread ID.', boundary:'This establishes recorded parent-to-child references; it does not show what the desktop renderer displayed.' },
  { title:'Both child rollouts resolve back to that parent', evidence:'Two child session records identify Codex Desktop, thread_source=subagent, depth 1, V1, and the same parent thread. Their IDs match the parent receivers.', boundary:'The identifiers were compared locally and omitted from this shareable summary.' },
  { title:'Desktop app-server reads those child threads', evidence:'The GUI-associated Desktop log contains thread/read, turn/started, and thread/name/set requests for the same child IDs near their rollout creation time.', boundary:'This is direct Desktop-side request handling evidence, not a panel-render callback.' },
  { title:'Native panel paint remains unobserved', evidence:'No inspected event names a panel component, acknowledges a renderer commit, or records a visible child card.', boundary:'The final UI state is unknown; do not infer a successful render from app-server reads.' }
];
const desktopTopologyStages = [
  { lane:'PARENT TURN', title:'A parent item names a child', kind:'STATIC SOURCE', detail:'The reducer calls discoverForSpawn for collabAgentToolCall with tool=spawnAgent, or subAgentActivity with kind=started. The renderer projector also collects receiverThreadIds and non-interacted activity items.', proof:'app-initial reducer + app-primary Mat', limit:'A matching item is a candidate relationship; it does not by itself prove discovery completed.' },
  { lane:'RUNTIME REDUCER', title:'Topology discovery is requested', kind:'STATIC SOURCE', detail:'discoverForSpawn accepts those two item forms. For a single receiver already cached with the expected parent, it refreshes that child; otherwise it starts discovery from the parent.', proof:'app-initial SubagentTopology.discoverForSpawn', limit:'This is the code path defined by the bundle; the inspected live run was not instrumented to prove this method fired.' },
  { lane:'THREAD STORE', title:'Child metadata is hydrated', kind:'STATIC SOURCE', detail:'The known-child path calls thread/read with includeTurns=false, background priority and collab_hydration source, then upserts the returned thread before discovering descendants.', proof:'app-initial refreshAndDiscoverSubtree', limit:'Thread metadata hydration is separate from reading child transcript history.' },
  { lane:'DESCENDANT SNAPSHOT', title:'Relationships are reconciled', kind:'STATIC SOURCE', detail:'Discovery lists descendant threads with pagination and source-kind filtering where supported. Fallback paths can inspect cloud item history or paginated turn history, read missing threads, validate parent identity and reconcile a completeness-aware snapshot.', proof:'app-initial listDescendantThreads + history readers', limit:'Which fallback runs depends on protocol support, history mode and cache state; the diagram does not claim every route runs every reader.' },
  { lane:'PARENT ROW PROJECTOR', title:'Candidate rows are built and filtered', kind:'STATIC SOURCE', detail:'app-primary combines parent-turn memberships with cached, summary and descendant-snapshot candidates, deduplicates them, then applies latest-reference and runtime/terminal suppression rules.', proof:'app-primary Mat / Nat / Fat / Lat', limit:'Static predicates do not identify which source supplied a specific live row.' },
  { lane:'REACT / SCREEN', title:'Commit and visible paint', kind:'UNKNOWN', detail:'The inspected evidence has no React commit acknowledgement, mounted component event, screenshot or visible-card confirmation tied to these children.', proof:'Open evidence boundary', limit:'Do not infer a rendered panel row from app-server reads or static renderer code.' }
];
function desktopTopologyMarkup() {
  const step = Math.max(0, Math.min(desktopTopologyStages.length - 1, desktopTopologyStep));
  const stage = desktopTopologyStages[step];
  return `<section class="desktop-topology" aria-labelledby="desktop-topology-title">
    <header class="desktop-topology-head"><div><span>INSTALLED DESKTOP · BUILD 20586 · STATIC SOURCE TRACE</span><h5 id="desktop-topology-title">How a parent spawn can become a child row</h5><p>Follow the code path stage by stage. Amber marks an unobserved runtime boundary.</p></div><b>26.1013.31256</b></header>
    <div class="desktop-topology-rail" role="group" aria-label="Select a stage in the Desktop subagent topology path">${desktopTopologyStages.map((item,index)=>`<button type="button" class="${index===step?'is-selected':''} ${item.kind==='UNKNOWN'?'is-unknown':''}" data-desktop-topology-step="${index}" aria-pressed="${index===step}"><span>${String(index+1).padStart(2,'0')}</span><small>${escapeHtml(item.lane)}</small><strong>${escapeHtml(item.title)}</strong><i aria-hidden="true">${index===desktopTopologyStages.length-1?'?':'→'}</i></button>`).join('')}</div>
    <div class="desktop-topology-readout" aria-live="polite" data-kind="${stage.kind==='UNKNOWN'?'unknown':'source'}"><div><span>${escapeHtml(stage.kind)}</span><h6>${escapeHtml(stage.title)}</h6><p>${escapeHtml(stage.detail)}</p><small><b>Source:</b> ${escapeHtml(stage.proof)}</small></div><aside><strong>Evidence boundary</strong><p>${escapeHtml(stage.limit)}</p></aside></div>
    <footer class="desktop-topology-foot"><span>Bundle SHA-256 prefixes</span><code>app-initial d6278b41…bab78fe</code><code>app-primary a4e892d5…fe6dd78</code><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-panel-row-candidate-and-suppression-rules-build-20586-2026-10-17" target="_blank" rel="noreferrer">Open evidence ledger ↗</a></footer>
  </section>`;
}
function selectDesktopTopologyStep(value) {
  const next = Number.parseInt(value, 10);
  desktopTopologyStep = Number.isFinite(next) ? Math.max(0, Math.min(desktopTopologyStages.length - 1, next)) : 0;
  const card = $('.desktop-topology');
  if (card) card.outerHTML = desktopTopologyMarkup();
}
function desktopRuntimeMarkup() {
  const step = Math.max(0, Math.min(desktopRuntimeStages.length - 1, desktopRuntimeStep));
  const stage = desktopRuntimeStages[step];
  const runtimeNodes = [
    ['PARENT ROLLOUT', 'Parent receiver recorded', 'runtime-observed'],
    ['CHILD ROLLOUT', 'Depth 1 · same parent', 'runtime-observed'],
    ['DESKTOP LOG', 'thread/read · turn/started · thread/name/set', 'runtime-observed'],
    ['VISIBLE UI', 'Visible card unknown', 'runtime-unknown'],
  ];
  const childTracks = ['Child A', 'Child B'].map((child, index) => `<div class="desktop-runtime-child-track"><strong>${child}<small>masked child ID ${index + 1}</small></strong>${runtimeNodes.map(([label, detail, status], stageIndex) => `<span class="${status}" data-runtime-stage="${stageIndex}"><small>${label}</small><b>${detail}</b></span>`).join('')}</div>`).join('');
  return `<section class="desktop-runtime-proof" aria-labelledby="desktop-runtime-proof-title" data-step="${step}">
    <header class="desktop-runtime-proof-head"><div><span>CAPTURED DESKTOP RUNTIME · REDACTED LINKAGE</span><h5 id="desktop-runtime-proof-title">From parent spawn to Desktop reads — then an open render boundary</h5></div><b>26.1013.31256 · 20586</b></header>
    <p class="desktop-runtime-proof-intro">Two real V1 child threads were linked across parent/child rollouts and the running Desktop log. Select a checkpoint to inspect what each source proves.</p>
    <div class="desktop-runtime-proof-tabs" role="group" aria-label="Select a Desktop runtime evidence checkpoint">${desktopRuntimeStages.map((item,index)=>`<button type="button" data-desktop-runtime-step="${index}" aria-pressed="${step===index}"><span>0${index+1}</span>${escapeHtml(['Parent calls','Child linkage','Desktop reads','Panel boundary'][index])}</button>`).join('')}</div>
    <div class="desktop-runtime-proof-map" data-step="${step}" aria-label="Two masked child IDs aligned across parent rollout, child rollout, Desktop app-server log, and unknown visible rendering">
      <div class="desktop-runtime-child-head"><span>CHILD ID</span><span>PARENT ROLLOUT</span><span>CHILD ROLLOUT</span><span>DESKTOP LOG</span><span>VISIBLE UI</span></div>
      ${childTracks}
      <div class="desktop-runtime-static-route"><strong>STATIC RENDERER PATH <small>same build · source inspection only</small></strong><span>Subagent panel selection</span><i>→</i><span>Thread/history projection</span><i>→</i><span>Virtualized rows</span><i>→</i><b>React commit / paint unknown</b></div>
      <p class="desktop-runtime-separation">The runtime rows above are correlated by matching child IDs. The renderer path below is static source analysis; no captured evidence joins it to either child’s live UI.</p>
    </div>
    <div class="desktop-runtime-proof-readout" aria-live="polite"><span>${String(step+1).padStart(2,'0')} / 04</span><div><strong>${escapeHtml(stage.title)}</strong><p>${escapeHtml(stage.evidence)}</p><small>${escapeHtml(stage.boundary)}</small></div></div>
    <footer class="desktop-runtime-proof-foot"><span>Evidence:</span><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-live-desktop-app-server-reads-for-parent-linked-child-threads-2026-10-17" target="_blank" rel="noreferrer">research ledger</a><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/desktop-child-runtime-2026-10-17.json" target="_blank" rel="noreferrer">redacted evidence summary</a></footer>
  </section>`;
}
function selectDesktopRuntimeStep(value) {
  const next = Number.parseInt(value, 10);
  desktopRuntimeStep = Number.isFinite(next) ? Math.max(0, Math.min(desktopRuntimeStages.length - 1, next)) : 0;
  const card = $('.desktop-runtime-proof');
  if (card) card.outerHTML = desktopRuntimeMarkup();
}
function renderDesktopGate() {
  return `<section class="desktop-gate" aria-label="Static Codex Desktop subagent interaction gate"><div class="desktop-gate-heading"><div><span class="desktop-gate-eyebrow">DESKTOP BUNDLE · STATIC TRACE</span><h5>Why a child row can open an interactive thread</h5></div><span>26.1007.71326</span></div><p class="desktop-gate-intro">Select the parent-thread evidence. The local selector folds these items into a <code>canInteract</code> hint before the Subagents panel opens a child.</p><div class="desktop-gate-cases" role="group" aria-label="Select parent-thread evidence scenario"><button type="button" data-desktop-case="same-turn" aria-pressed="true">spawnAgent in this turn</button><button type="button" data-desktop-case="activity-only" aria-pressed="false">Activity only</button><button type="button" data-desktop-case="prior-turn" aria-pressed="false">Spawn was in prior turn</button></div><div class="desktop-gate-flow" data-case="same-turn" aria-live="polite"><article class="desktop-gate-node"><small>PARENT TURN EVIDENCE</small><strong data-gate-evidence>collabAgentToolCall · spawnAgent</strong><span data-gate-scope>matching child reference in this parent turn</span></article><i aria-hidden="true">→</i><article class="desktop-gate-node gate-selector"><small>LOCAL ROW SELECTOR</small><strong>Dat → kat</strong><span>fold evidence into child row</span></article><i aria-hidden="true">→</i><article class="desktop-gate-node gate-outcome"><small data-gate-flag>canInteract = true</small><strong data-gate-outcome>interactive thread route</strong><span data-gate-effect>composer may be available; resume hook can be eligible</span></article></div><p class="desktop-gate-boundary" data-gate-boundary>UI routing hint only. It does not establish server authorization, a live child process, or that a resume actually occurs.</p><p class="desktop-gate-source">Inspected asset SHA-256: <code>c002f1b37cb1…ca528f</code> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md" target="_blank" rel="noreferrer">research ledger and evidence notes</a></p></section>`;
}
function fullFidelityMarkup() {
  const scenarios = {
    background: { surfaces: '0 active surfaces', status: 'BLOCKED', detail: 'The child ID may be known, but the connection has no registered full-fidelity surface for this child.', windows: 'No child delta is forwarded to Desktop windows by this gate.', count: '0' },
    selected: { surfaces: '1 active surface', status: 'OPEN', detail: 'The child ID is registered and at least one surface is registered for that same child.', windows: 'Allowed notifications are broadcast to all live windows; registration is not a per-window delivery filter.', count: '1' },
    shared: { surfaces: '2 → 1 → 0 surfaces', status: 'OPEN → OPEN → BLOCKED', detail: 'Removing one surface leaves the child eligible while another remains. Removing the last surface closes the gate.', windows: 'The gate is keyed by child ID and stays open while its surface set is non-empty.', count: '2 → 1 → 0' }
  };
  const scenario = scenarios[fullFidelityScenario] ?? scenarios.background;
  const events = ['item/agentMessage/delta','item/plan/delta','item/reasoning/summaryTextDelta','item/reasoning/textDelta','item/commandExecution/outputDelta'];
  return `<section class="fidelity-map" aria-labelledby="fidelity-title">
    <div class="fidelity-heading"><div><span class="fidelity-eyebrow">DESKTOP BUNDLE · STATIC FORWARDING TRACE</span><h5 id="fidelity-title">When do child deltas reach the renderer?</h5></div><span>26.1007.71326</span></div>
    <p class="fidelity-intro">Two independent facts must hold on the Electron connection: the child thread ID is known, and at least one full-fidelity surface is registered for that child.</p>
    <div class="fidelity-controls" role="group" aria-label="Choose a child full-fidelity surface scenario">
      <button type="button" data-fidelity-case="background" aria-pressed="${fullFidelityScenario === 'background'}">Background child</button>
      <button type="button" data-fidelity-case="selected" aria-pressed="${fullFidelityScenario === 'selected'}">One surface</button>
      <button type="button" data-fidelity-case="shared" aria-pressed="${fullFidelityScenario === 'shared'}">Two surfaces</button>
    </div>
    <div class="fidelity-flow" data-case="${fullFidelityScenario}" aria-live="polite">
      <article class="fidelity-node"><span>CONNECTION CHILD SET</span><strong>child ID registered</strong><small>Observed insertion path: qualifying <code>thread/started</code></small></article><i aria-hidden="true">+</i>
      <article class="fidelity-node"><span>PER-CHILD SURFACE SET</span><strong>${scenario.surfaces}</strong><small>${scenario.detail}</small></article><i aria-hidden="true">→</i>
      <article class="fidelity-node fidelity-gate"><span>FIVE DELTA FILTER</span><strong>${scenario.status}</strong><small>Forwarding eligibility for this child</small></article>
    </div>
    <div class="fidelity-events"><span>FILTERED EVENT FAMILIES</span>${events.map(name => `<code>${name}</code>`).join('')}</div>
    <p class="fidelity-outcome"><b>${scenario.count} SURFACE SCENARIO</b>${scenario.windows}</p>
    <p class="fidelity-boundary">This is a client-side forwarding gate. Earlier server event handling may already have occurred. A forwarded delta can still be ignored unless the renderer has the conversation and a matching item/type loaded. Static bundle evidence only; it does not establish a live event or visible transcript update.</p>
    <p class="fidelity-sources"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-parent-activity-discovery-and-full-fidelity-forwarding-use-separate-client-gates" target="_blank" rel="noreferrer">child registration and Desktop gate</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#renderer-handling-after-full-fidelity-ipc-broadcast" target="_blank" rel="noreferrer">renderer delta merge behavior</a></p>
  </section>`;
}
function selectFullFidelityScenario(scenarioName) {
  const container = $('.fidelity-map');
  if (!container) return;
  fullFidelityScenario = ['background','selected','shared'].includes(scenarioName) ? scenarioName : 'background';
  container.outerHTML = fullFidelityMarkup();
}
function rendererDeltaMarkup() {
  const deltaTypes = {
    'agent-message': { label:'Agent message', methods:'item/agentMessage/delta', queue:'frame text queue', target:'matching turn + agent-message item ID/type' },
    plan: { label:'Plan', methods:'item/plan/delta', queue:'frame text queue', target:'matching turn + plan item ID/type' },
    reasoning: { label:'Reasoning', methods:'item/reasoning/summaryTextDelta · item/reasoning/textDelta', queue:'frame text queue', target:'matching turn + reasoning item ID/type' },
    'command-output': { label:'Command output', methods:'item/commandExecution/outputDelta', queue:'separate output queue · 50 ms flush', target:'matching commandExecution item ID' }
  };
  const scenarios = {
    'child-unregistered': { child:'BLOCKED · unknown child or no registered surface', conversation:'NOT REACHED', item:'NOT REACHED', result:'NO IPC BROADCAST', tone:'dropped', detail:'The Desktop connection gate rejects this child delta before renderer delivery.' },
    'conversation-missing': { child:'PASSED · child has an eligible surface', conversation:'MISSING OR ZERO TURNS', item:'NOT LOOKED UP', result:'DROP CONVERSATION GROUP', tone:'dropped', detail:'The receiving renderer cannot resolve the conversation, or its canonical history/turn list is empty.' },
    'item-missing': { child:'PASSED · child has an eligible surface', conversation:'FOUND · HISTORY PRESENT', item:'NO MATCHING TARGET ID/TYPE', result:'NO ITEM PATCH', tone:'filtered', detail:'This delta family still needs the matching turn and item. Command output requires an existing commandExecution item.' },
    'item-matched': { child:'PASSED · child has an eligible surface', conversation:'FOUND · HISTORY PRESENT', item:'TARGET ID/TYPE MATCHES', result:'STORE UPDATED', tone:'applied', detail:'The local transcript store can be patched. This does not prove a React commit or visible paint.' }
  };
  const scenario = scenarios[rendererDeltaScenario] ?? scenarios['conversation-missing'];
  const delta = deltaTypes[rendererDeltaType] ?? deltaTypes['agent-message'];
  return `<section class="renderer-delta" aria-labelledby="renderer-delta-title">
    <div class="renderer-delta-heading"><div><span class="renderer-delta-eyebrow">DESKTOP + RENDERER BUNDLES · STATIC GATE TRACE</span><h5 id="renderer-delta-title">Inspect where a child delta can stop</h5></div><span>FORWARDING 26.1007.71326 · MERGE 26.1007.30912</span></div>
    <p class="renderer-delta-intro">Choose a delta family, then a receiver condition. The stages distinguish the Desktop child/surface gate, the renderer queue, conversation readiness, and the final item match.</p>
    <div class="renderer-delta-controls" role="group" aria-label="Choose delta family">
      <button type="button" data-renderer-delta-type="agent-message" aria-pressed="${rendererDeltaType === 'agent-message'}">Agent message</button>
      <button type="button" data-renderer-delta-type="plan" aria-pressed="${rendererDeltaType === 'plan'}">Plan</button>
      <button type="button" data-renderer-delta-type="reasoning" aria-pressed="${rendererDeltaType === 'reasoning'}">Reasoning</button>
      <button type="button" data-renderer-delta-type="command-output" aria-pressed="${rendererDeltaType === 'command-output'}">Command output</button>
    </div>
    <div class="renderer-delta-controls renderer-delta-gates" role="group" aria-label="Choose receiving state">
      <button type="button" data-renderer-delta="child-unregistered" aria-pressed="${rendererDeltaScenario === 'child-unregistered'}">Child gate closed</button>
      <button type="button" data-renderer-delta="conversation-missing" aria-pressed="${rendererDeltaScenario === 'conversation-missing'}">Conversation unavailable</button>
      <button type="button" data-renderer-delta="item-missing" aria-pressed="${rendererDeltaScenario === 'item-missing'}">Target item missing</button>
      <button type="button" data-renderer-delta="item-matched" aria-pressed="${rendererDeltaScenario === 'item-matched'}">Target item matches</button>
    </div>
    <div class="renderer-delta-flow" data-case="${scenario.tone}" aria-live="polite">
      <article class="renderer-delta-node"><span>DESKTOP FORWARD GATE</span><strong>${scenario.child}</strong><small>Child ID known + at least one registered full-fidelity surface</small></article><i aria-hidden="true">→</i>
      <article class="renderer-delta-node"><span>${escapeHtml(delta.label.toUpperCase())} · EVENT</span><strong>${escapeHtml(delta.methods)}</strong><small>Accepted family enters the ${escapeHtml(delta.queue)}</small></article><i aria-hidden="true">→</i>
      <article class="renderer-delta-node"><span>CONVERSATION STORE</span><strong>${scenario.conversation}</strong><small>Queued deltas are grouped by conversation ID; history/turn presence is checked</small></article><i aria-hidden="true">→</i>
      <article class="renderer-delta-node"><span>ITEM TARGET</span><strong>${scenario.item}</strong><small>Expected target: ${escapeHtml(delta.target)}</small></article><i aria-hidden="true">→</i>
      <article class="renderer-delta-node renderer-delta-result"><span>LOCAL OUTCOME</span><strong>${scenario.result}</strong><small>${scenario.detail}</small></article>
    </div>
    <p class="renderer-delta-boundary">The Desktop forwarding gate, event queue, and receiving-store merge come from separate bundle builds; this diagram combines static paths and is not one captured session. An accepted update still does not prove a React commit or visible paint.</p>
    <p class="renderer-delta-source"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#renderer-handling-after-full-fidelity-ipc-broadcast" target="_blank" rel="noreferrer">renderer queue and item merge evidence</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-parent-activity-discovery-and-full-fidelity-forwarding-use-separate-client-gates" target="_blank" rel="noreferrer">Desktop forwarding gate evidence</a></p>
  </section>`;
}
function selectRendererDeltaScenario(scenarioName) {
  const container = $('.renderer-delta');
  if (!container) return;
  rendererDeltaScenario = ['child-unregistered','conversation-missing','item-missing','item-matched'].includes(scenarioName) ? scenarioName : 'item-matched';
  container.outerHTML = rendererDeltaMarkup();
}
function selectRendererDeltaType(typeName) {
  const container = $('.renderer-delta');
  if (!container) return;
  rendererDeltaType = ['agent-message','plan','reasoning','command-output'].includes(typeName) ? typeName : 'agent-message';
  container.outerHTML = rendererDeltaMarkup();
}
function completionPayloadMarkup() {
  const selected = completionPayloadScenario;
  return `<section class="completion-payload" aria-labelledby="completion-payload-title">
    <div class="completion-payload-heading"><div><span class="completion-payload-eyebrow">CHILD OUTPUT · THREE CONSUMERS</span><h5 id="completion-payload-title">One child, three different ways to read its output</h5></div><span>static source trace · Desktop build 26.1007.71326 + V2 snapshot 740e5af</span></div>
    <p class="completion-payload-intro">Select a consumer to highlight its path. The parent receives a completion message, Work requests a compact final-response preview, and the local Codex panel hydrates a child transcript.</p>
    <div class="completion-payload-controls" role="group" aria-label="Select child output consumer">
      <button type="button" data-completion-payload="parent-input" aria-pressed="${selected === 'parent-input'}">Parent input</button>
      <button type="button" data-completion-payload="work-panel" aria-pressed="${selected === 'work-panel'}">Work preview</button>
      <button type="button" data-completion-payload="local-transcript" aria-pressed="${selected === 'local-transcript'}">Local transcript</button>
    </div>
    <div class="completion-payload-routes" data-route="${selected}" aria-live="polite">
      <article class="completion-payload-route ${selected === 'parent-input' ? 'selected' : ''}">
        <span class="completion-payload-route-label">RUNTIME · PARENT THREAD</span>
        <ol><li><b>01</b><span><strong>Child turn finishes</strong><small>Assistant text is collected into a nonblank completion body; this source path does not filter by <code>final_answer</code> phase.</small></span></li>
          <li><b>02</b><span><strong>Completion route</strong><small>Rendered text is sent as inter-agent communication to the structural parent, separately from the lifecycle activity.</small></span></li>
          <li><b>03</b><span><strong>Typed history item</strong><small>The parent records a typed <code>AgentMessage</code>; scheduling metadata such as <code>trigger_turn</code> stays separate.</small></span></li>
          <li><b>04</b><span><strong>Sampling boundary</strong><small>If retained by history projection and request policy, the item can enter a later model request.</small></span></li></ol>
        <div class="completion-payload-result"><b>PROVEN UP TO</b><span>Serialized parent request path</span></div>
      </article>
      <article class="completion-payload-route ${selected === 'work-panel' ? 'selected' : ''}">
        <span class="completion-payload-route-label">WORK UI · COMPLETED CHILD DETAIL</span>
        <ol><li><b>01</b><span><strong>Select completed child</strong><small>The query is keyed by parent conversation, child thread and activation IDs.</small></span></li>
          <li><b>02</b><span><strong>Fetch one turn</strong><small>The client requests the child’s latest turn data.</small></span></li>
          <li><b>03</b><span><strong>Choose display text</strong><small>Scan items backwards: prefer the newest nonempty <code>agentMessage</code> with <code>phase=final_answer</code>; otherwise use the newest nonempty agent message.</small></span></li>
          <li><b>04</b><span><strong>Render or retry</strong><small>If neither fetched text nor snapshot status text is available, the panel can show loading/unavailable.</small></span></li></ol>
        <div class="completion-payload-result"><b>PROVEN UP TO</b><span>Client query and presentation rules</span></div>
      </article>
      <article class="completion-payload-route ${selected === 'local-transcript' ? 'selected' : ''}">
        <span class="completion-payload-route-label">CODEX UI · LOCAL CHILD TRANSCRIPT</span>
        <ol><li><b>01</b><span><strong>Open the selected child</strong><small>The local panel passes its child thread identity to the transcript owner; it does not use Work’s final-response query.</small></span></li>
          <li><b>02</b><span><strong>Load turns and items</strong><small>The local history path can page turns, then hydrate the selected turn’s full items using item pages of 30 until no cursor remains.</small></span></li>
          <li><b>03</b><span><strong>Project transcript blocks</strong><small>Typed subagent activity and collaboration items can become dedicated blocks, subject to the history option, projection budget and item rules such as skipping <code>wait</code>.</small></span></li>
          <li><b>04</b><span><strong>Render transcript</strong><small>This path represents a projected child conversation, not a single extracted final-answer string.</small></span></li></ol>
        <div class="turn-index-callout" aria-label="Turn-scoped item pagination in public Codex main">
          <span>STORAGE TRACE · RELATED CHANGE 922510f</span>
          <div><b>turn_id filter</b><i>→</i><b>turn-page index</b><i>→</i><b>cursor + limit</b></div>
          <p>The thread-store now forces <code>idx_thread_items_by_turn_page</code> for turn-scoped item pages. Its source comment says a thread-wide index can scan earlier turns when the requested turn’s last page is underfilled.</p>
          <div class="source-refresh" aria-label="Upstream source freshness">
            <span class="source-refresh-node related">922510f <b>transcript index</b></span><i aria-hidden="true">→</i><span class="source-refresh-node latest">7ae8319 <b>latest main</b></span>
            <p>Intervening commits include a TUI fix that suppresses matching streamed/completed assistant messages around interleaved commands (<code>c313eb7</code>) and bounded SQLite BUSY retries used by message-board writes (<code>7ae8319</code>). These are separate paths; neither changes the turn-index claim above.</p>
            <a href="https://github.com/openai/codex/compare/922510f4d7570b42838e015787ed53abfa8761a1...7ae831991792744434027c431dfbc7e81dd5c12c" target="_blank" rel="noreferrer">View the pinned path comparison</a>
          </div>
        </div>
        <div class="completion-payload-result"><b>PROVEN UP TO</b><span>Static transcript component path</span></div>
      </article>
    </div>
    <p class="completion-payload-boundary">These consumers expose different slices of the child: a queued typed completion, one selected Work response, or a paginated local transcript with filtered item projection. Static source does not prove a live request, response, model consumption, React commit or visible paint.</p>
    <p class="completion-payload-source"><a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control/completion.rs" target="_blank" rel="noreferrer">V2 completion routing</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/context/inter_agent_completion_message.rs" target="_blank" rel="noreferrer">completion body</a> · <a href="https://github.com/openai/codex/blob/922510f4d7570b42838e015787ed53abfa8761a1/codex-rs/thread-store/src/local/thread_history/segment_paging.rs#L292-L323" target="_blank" rel="noreferrer">turn-scoped index</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-local-and-work-subagent-panels-use-distinct-child-result-paths" target="_blank" rel="noreferrer">local and Work panel paths</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#selected-child-full-hydration-pages-all-items" target="_blank" rel="noreferrer">selected-turn item pagination</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#selected-child-full-items-pass-through-a-filtered-renderer-projection" target="_blank" rel="noreferrer">renderer projection limits</a></p>
  </section>`;
}
function selectCompletionPayload(scenario) {
  const container = $('.completion-payload');
  if (!container) return;
  completionPayloadScenario = ['work-panel','local-transcript'].includes(scenario) ? scenario : 'parent-input';
  container.outerHTML = completionPayloadMarkup();
}
function parentResultStateMarkup() {
  const cases = {
    active: { label: 'PARENT · LOADED + ACTIVE', location: 'Session mailbox', handling: 'An active turn may accept it while mailbox delivery is open; otherwise it waits for a later turn.', storage: 'In process memory until accepted as turn input.', outcome: 'QUEUED · TURN RECEPTIVITY DECIDES', tone: 'active' },
    idle: { label: 'PARENT · LOADED + IDLE', location: 'Session mailbox', handling: 'QueueOnly does not start an ordinary turn. A durable-sleep marker is the wake exception.', storage: 'Pending in the session input queue.', outcome: 'PENDING · NO ORDINARY WAKE', tone: 'idle' },
    evicted: { label: 'PARENT · LOCALLY EVICTED', location: 'Runtime mailbox', handling: 'No session reload is needed while the runtime retains the eviction record; later load drains this mailbox.', storage: 'In-memory only; unread delivery is not shown as disk-persisted.', outcome: 'RETAINED · AWAITING SESSION LOAD', tone: 'evicted' },
    cold: { label: 'PARENT · COLD RESTORE', location: 'Restore history, then deliver', handling: 'Without a local eviction record, the QueueOnly path lazily restores the parent before session delivery.', storage: 'History is restored; the new unread result remains queued in memory.', outcome: 'RESTORE FIRST · THEN QUEUE', tone: 'cold' }
  };
  const scenario = cases[parentResultState] ?? cases.active;
  return `<section class="parent-result-state" aria-labelledby="parent-result-state-title">
    <div class="parent-result-state-heading"><div><span>PARENT DELIVERY · V2 SOURCE TRACE</span><h5 id="parent-result-state-title">A child result does not always wake its parent</h5></div><span>Codex source · 740e5af</span></div>
    <p class="parent-result-state-intro">Choose the parent’s residency when the child finishes. Every result uses <code>QueueOnly</code> (<code>trigger_turn=false</code>); residency determines where it waits, while turn receptivity determines when it is recorded.</p>
    <div class="parent-result-state-controls" role="group" aria-label="Choose parent session state">
      <button type="button" data-parent-result-state="active" aria-pressed="${parentResultState === 'active'}">Active turn</button><button type="button" data-parent-result-state="idle" aria-pressed="${parentResultState === 'idle'}">Idle session</button><button type="button" data-parent-result-state="evicted" aria-pressed="${parentResultState === 'evicted'}">Locally evicted</button><button type="button" data-parent-result-state="cold" aria-pressed="${parentResultState === 'cold'}">Cold restore</button>
    </div>
    <div class="parent-result-state-flow" data-case="${scenario.tone}" aria-live="polite">
      <article><span>01 · CHILD</span><strong>Terminal outcome</strong><small>Completion result is formatted separately from lifecycle activity.</small></article><i aria-hidden="true">→</i>
      <article><span>02 · ROUTE</span><strong>Structural parent</strong><small><code>QueueOnly</code> · <code>trigger_turn=false</code></small></article><i aria-hidden="true">→</i>
      <article class="parent-result-state-current"><span>${scenario.label}</span><strong>${scenario.location}</strong><small>${scenario.handling}</small></article><i aria-hidden="true">→</i>
      <article class="parent-result-state-storage"><span>04 · BEFORE PARENT READ</span><strong>${scenario.storage}</strong><small>Mailbox acceptance does not persist an unread result to the rollout.</small></article><i aria-hidden="true">→</i>
      <article class="parent-result-state-boundary-node"><span>05 · TURN INPUT</span><strong>Record in parent history</strong><small>When processed as turn input, the typed AgentMessage and metadata enter the rollout; request assembly follows.</small><button class="parent-result-request-link" type="button" data-inspector-target="request-wire-title">Open request trace ↓</button></article>
      <b class="parent-result-state-outcome">${scenario.outcome}</b>
    </div>
    <div class="parent-result-checkpoints" aria-label="Result delivery and persistence milestones"><span class="checkpoint-queued"><b>1</b><strong>Queued</strong><small>runtime/session memory</small></span><i aria-hidden="true">→</i><span><b>2</b><strong>Recorded</strong><small>only after turn input</small></span><i aria-hidden="true">→</i><span><b>3</b><strong>Request built</strong><small>model can then receive it</small></span></div>
    <p class="parent-result-state-boundary">A queued result is not yet rollout-persisted or model-consumed. Runtime mailbox contents are in-memory; recovery of unread results after process shutdown is not established. Static source trace, not a live session.</p>
    <p class="parent-result-state-source"><a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control/completion.rs" target="_blank" rel="noreferrer">Completion routing</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control/delivery.rs" target="_blank" rel="noreferrer">Delivery policy</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#parent-result-delivery-after-child-termination" target="_blank" rel="noreferrer">Evidence ledger</a></p>
  </section>`;
}
function selectParentResultState(stateName) {
  parentResultState = ['idle','evicted','cold'].includes(stateName) ? stateName : 'active';
  const container = $('.parent-result-state');
  if (container) container.outerHTML = parentResultStateMarkup();
}
function completionRouteMarkup() {
  const runtime = completionRouteMode === 'runtime-probe';
  const legacy = completionRouteMode === 'legacy';
  const steps = runtime
    ? [
      ['OBSERVED · DESKTOP CLI','Parent → child edge persisted','Temporary state DB contains a parent-child spawn edge and a child thread row for embedded CLI 0.162.0-alpha.17.2.'],
      ['OBSERVED · CHILD ROLLOUT','Requested marker recorded','The child rollout contains the requested marker. This proves child-side output was recorded.'],
      ['OBSERVED · PARENT HISTORY','wait completed · timed_out=false','The parent history contains a completed V2 wait item with no timeout. Its receiver list is empty.'],
      ['OBSERVED · PARENT ROLLOUT','AgentMessage persisted after wait','The raw parent rollout records wait output (timed_out=false), then an AgentMessage with the exact child marker, before the parent turn completes.']
    ]
    : legacy
    ? [
      ['SPAWN GATE','Non-V2 ThreadSpawn','spawn.rs starts this watcher only when multi_agent_version != V2.'],
      ['STATUS STREAM','Subscribe before reading state','Receives an initial snapshot, then coalesced status changes; remembers the last config if the child unloads.'],
      ['FINALITY','Wait for a final status','PendingInit, Running and Interrupted are non-final. If the stream ends/errors, query status once.'],
      ['PARENT DELIVERY','Two result paths','Shutdown during tree teardown is suppressed. Otherwise V2-path children queue a result; legacy children inject SubagentNotification.']
    ]
    : [
      ['SESSION EVENT','TurnComplete / TurnAborted','V2 spawn does not start the legacy completion watcher.'],
      ['OUTCOME','Build AgentTurnOutcome','Session terminal handling passes the child outcome to AgentControl::turn_finished.'],
      ['ACTIVITY','Completed activity','On successful completion with a parent turn ID, notify the initiating thread when resolvable; otherwise use the structural parent.'],
      ['RESULT','QueueOnly to structural parent','Format the terminal result and send with trigger_turn=false; it does not itself start a parent turn.']
    ];
  const step = Math.max(0, Math.min(completionRouteStep, steps.length - 1));
  const stepNames = steps.map(([, title]) => title);
  return `<section id="completion-route" class="completion-route" aria-labelledby="completion-route-title">
    <div class="completion-route-heading"><div><span class="completion-route-eyebrow">${runtime ? 'RUNTIME OBSERVATION · ISOLATED PROBE' : 'TERMINAL ROUTING · MATCHED SOURCE TAG'}</span><h5 id="completion-route-title">子代理结束后，父线程如何收到结果？</h5></div><span>${runtime ? 'Desktop CLI 0.162.0-alpha.17.2' : 'rust-v0.162.0-alpha.17.2'}</span></div>
    <p class="completion-route-intro">${runtime ? '这是临时 CODEX_HOME 中一次隔离运行的完整 rollout 摘要。逐步查看父子关系、wait 与结果消息的实际记录顺序。' : '切换路径查看 legacy status watcher 与 V2 session terminal event。它们共享结果交付目标，但触发机制不同。'}</p>
    <div class="completion-route-controls" role="group" aria-label="选择子代理终态路由">
      <button type="button" data-completion-route="legacy" aria-pressed="${legacy}">Legacy watcher</button>
      <button type="button" data-completion-route="v2" aria-pressed="${!legacy && !runtime}">V2 source path</button>
      <button type="button" data-completion-route="runtime-probe" aria-pressed="${runtime}">本机探针</button>
    </div>
    <div class="completion-route-stepper" role="group" aria-label="逐步查看事件">
      <span aria-live="polite" aria-atomic="true">事件 ${step + 1} / ${steps.length} · ${escapeHtml(stepNames[step])}</span>
      <div><button type="button" data-completion-route-step="prev" ${step === 0 ? 'disabled' : ''}>上一步</button><button type="button" data-completion-route-step="next" ${step === steps.length - 1 ? 'disabled' : ''}>下一步</button></div>
    </div>
    <ol class="completion-route-flow" data-mode="${runtime ? 'runtime' : legacy ? 'legacy' : 'v2'}" data-current-step="${step}" aria-label="子代理终态与父线程结果的事件顺序">${steps.map(([label,title,detail], index) => `<li class="${index === step ? 'is-active' : index < step ? 'is-complete' : ''}" aria-current="${index === step ? 'step' : 'false'}"><span>${label}</span><strong>${title}</strong><small>${detail}</small>${index < steps.length - 1 ? '<i aria-hidden="true">→</i>' : ''}</li>`).join('')}</ol>
    <p class="completion-route-boundary"><b>证据边界</b>${runtime ? '本次原始 JSONL 已确认父 rollout 在非超时 wait 输出之后、父 turn 结束之前记录 typed AgentMessage；较早的 Summary 投影会省略 typed subagent items。该探针运行的是桌面包内 CLI，不是 Desktop 会话宿主或可见 UI 抓取，也没有检查模型请求的精确序列化输入。' : '这是匹配版本公开源码的静态调用路径；没有证明安装包与该 commit 的构建关系，也没有观测本机运行时事件。'}</p>
    <p class="completion-route-sources">${runtime ? '<a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#embedded-desktop-cli-v2-spawn-and-wait-probe-2026-10-16" target="_blank" rel="noreferrer">探针记录与证据边界</a>' : '<a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control.rs" target="_blank" rel="noreferrer">legacy watcher</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control/spawn.rs" target="_blank" rel="noreferrer">spawn gate</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/session/mod.rs" target="_blank" rel="noreferrer">V2 session event</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control/completion.rs" target="_blank" rel="noreferrer">completion routing</a>'}</p>
  </section>`;
}
function selectCompletionRoute(mode) {
  completionRouteMode = ['legacy','runtime-probe'].includes(mode) ? mode : 'v2';
  completionRouteStep = 0;
  const section = $('.completion-route');
  if (section) section.outerHTML = completionRouteMarkup();
}
function advanceCompletionRouteStep(direction) {
  const count = $('.completion-route-flow')?.children.length || 1;
  completionRouteStep = Math.max(0, Math.min(count - 1, completionRouteStep + (direction === 'next' ? 1 : -1)));
  const section = $('.completion-route');
  if (section) section.outerHTML = completionRouteMarkup();
}
function requestWireMarkup() {
  const transport = requestWireTransport === 'websocket' ? 'websocket' : 'http';
  const content = requestWireContent === 'encrypted' ? 'encrypted' : 'plaintext';
  const contentType = content === 'encrypted' ? 'encrypted_content' : 'input_text';
  const contentValue = content === 'encrypted' ? '"…opaque…"' : '"NEW_TASK … child result …"';
  const transportLabel = transport === 'http' ? 'HTTP · POST /responses' : 'WEBSOCKET · JSON TEXT FRAME';
  const transportDetail = transport === 'http'
    ? 'EncodedJsonBody serializes the ResponsesApiRequest before the HTTP request is sent.'
    : 'ResponseCreateWsRequest carries the same typed input, serializes as JSON, then is sent in a text frame.';
  return `<section class="request-wire" aria-labelledby="request-wire-title">
    <div class="request-wire-heading"><div><span class="request-wire-eyebrow">PARENT SAMPLING · PUBLIC SOURCE SNAPSHOT</span><h5 id="request-wire-title">How a child result becomes a model request</h5></div><span>Codex · 67a7096 · 2026-09-27</span></div>
    <p class="request-wire-intro">Follow an admitted mailbox item through parent history projection into the typed Responses request. This panel is pinned to a dated public source snapshot. Switch transport and content representation to inspect the source-defined shapes.</p>
    <div class="request-wire-controls">
      <div role="group" aria-label="Choose source transport"><span>TRANSPORT</span><button type="button" data-request-wire-transport="http" aria-pressed="${transport === 'http'}">HTTP</button><button type="button" data-request-wire-transport="websocket" aria-pressed="${transport === 'websocket'}">WebSocket</button></div>
      <div role="group" aria-label="Choose AgentMessage content representation"><span>CONTENT</span><button type="button" data-request-wire-content="plaintext" aria-pressed="${content === 'plaintext'}">Plain text</button><button type="button" data-request-wire-content="encrypted" aria-pressed="${content === 'encrypted'}">Encrypted</button></div>
    </div>
    <ol class="request-wire-flow" aria-label="Parent request construction sequence">
      <li><span>01 · ADMISSION</span><strong>Mailbox phase accepts item</strong><small><code>trigger_turn=false</code> alone does not wake an idle parent.</small></li>
      <li><span>02 · HISTORY</span><strong>Record typed <code>AgentMessage</code></strong><small>Author, recipient and content remain structured.</small></li>
      <li><span>03 · PROJECTION</span><strong><code>clone_history().for_prompt(...)</code></strong><small>Normalization or truncation can change retained request items.</small></li>
      <li class="request-wire-current"><span>04 · REQUEST INPUT</span><strong><code>ResponsesApiRequest.input</code></strong><small><code>Vec&lt;ResponseItem&gt;</code> keeps the agent-message discriminator.</small></li>
      <li class="request-wire-transport"><span>05 · ${transportLabel}</span><strong>${transport === 'http' ? 'JSON body → /responses' : 'JSON → text frame'}</strong><small>${transportDetail}</small></li>
    </ol>
    <div class="request-window" role="img" aria-label="A result arriving after a sampling request was sent stays queued for a later sampling request; it cannot rewrite the request already in flight">
      <div class="request-window-heading"><span>IN-FLIGHT BOUNDARY</span><small>Example: result arrives after request A was sent</small></div>
      <div class="request-window-lanes">
        <div class="request-window-lane frozen"><span class="request-window-lane-label">REQUEST A · ALREADY SENT</span><div class="request-window-track"><b>history snapshot</b><i aria-hidden="true">→</i><b>serialized input</b><i aria-hidden="true">→</i><b>response stream</b></div><small>Its input is fixed for this dispatch.</small></div>
        <div class="request-window-lane later"><span class="request-window-lane-label">CHILD RESULT · ARRIVES DURING A</span><div class="request-window-track"><b>mailbox</b><i aria-hidden="true">→</i><b>phase accepts</b><i aria-hidden="true">→</i><b>record AgentMessage</b><i aria-hidden="true">→</i><b>build request B</b></div><small>It can affect a later sampling request after the turn processes it; it is not spliced into A.</small></div>
      </div>
    </div>
    <div class="request-wire-payload" aria-live="polite"><div><span>SIMPLIFIED TYPED SHAPE</span><small>${content === 'encrypted' ? 'Content value is opaque; this view does not decrypt it.' : 'Illustrative fields; IDs and optional metadata omitted.'}</small></div><pre><code>{
  "type": "agent_message",
  "author": "child-…",
  "recipient": "parent-…",
  "content": [{ "type": "${contentType}", "${content === 'encrypted' ? 'content' : 'text'}": ${contentValue} }]
}</code></pre></div>
    <p class="request-wire-boundary">Static source trace only, pinned to the public 2026-09-27 snapshot. It does not establish that a live item passed admission, survived projection, used the selected transport, was accepted remotely, or was consumed by a model. The controls change this illustration, not Codex configuration.</p>
    <p class="request-wire-source"><a href="https://github.com/openai/codex/tree/67a709665ac7b50311b93e32612c9a8281684787" target="_blank" rel="noreferrer">public Codex snapshot · 2026-09-27</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#parent-model-request-serialization-and-transport-boundary" target="_blank" rel="noreferrer">request and transport evidence ledger</a></p>
  </section>`;
}
function selectRequestWireOption(kind, value) {
  if (kind === 'transport') requestWireTransport = value === 'websocket' ? 'websocket' : 'http';
  else requestWireContent = value === 'encrypted' ? 'encrypted' : 'plaintext';
  const container = $('.request-wire');
  if (container) container.outerHTML = requestWireMarkup();
}
function stopCleanupMarkup() {
  const userStop = stopCleanupMode === 'user-stop';
  return `<div class="stop-cleanup" aria-label="Desktop stop descendant cleanup trace">
    <div class="stop-cleanup-heading"><span>DESKTOP STOP · STATIC BUNDLE TRACE</span><strong>26.1007.71326</strong></div>
    <div class="stop-cleanup-modes" role="group" aria-label="Select interruption source">
      <button type="button" data-stop-cleanup-mode="user-stop" aria-pressed="${userStop}">User presses Stop</button>
      <button type="button" data-stop-cleanup-mode="system" aria-pressed="${!userStop}">System interruption</button>
    </div>
    <ol class="stop-cleanup-flow" aria-live="polite">
      <li><i>01</i><span><b>Interrupt root</b><small>Conversation manager awaits its own interrupt path.</small></span></li>
      <li class="${userStop ? 'async' : 'awaited'}"><i>02</i><span><b>${userStop ? 'Schedule child cleanup' : 'Await child cleanup'}</b><small>${userStop ? 'Descendant cascade runs in the background; Stop can return first.' : 'Eligible non-user requests await the helper; follower or turn guards can bypass cascade.'}</small></span><em>${userStop ? 'BACKGROUND' : 'AWAITED'}</em></li>
      <li><i>03</i><span><b>Two-pass best effort</b><small>Interrupt known descendants, rediscover once, then handle still-active threads.</small></span></li>
    </ol>
    <p class="stop-cleanup-note">Failures are logged; rediscovery failure ends the second pass. Neither mode proves every child stopped. Static code evidence; no live Stop action was observed.</p>
    <p class="stop-cleanup-source"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-26100771326-stop-path-schedules-child-cleanup" target="_blank" rel="noreferrer">Evidence ledger ↗</a> · app-shared SHA-256 <code>3b4cabc3…31d1bf5</code></p>
  </div>`;
}
function stopAllDispatchMarkup() {
  const discovered = stopAllDiscovery === 'success';
  return `<section class="stop-all-dispatch" aria-labelledby="stop-all-dispatch-title">
    <div class="stop-all-dispatch-head"><div><span>INSTALLED DESKTOP · PANEL + MANAGER</span><h4 id="stop-all-dispatch-title">“Stop all” can finish before child interrupts</h4></div><strong>26.1007.71326</strong></div>
    <div class="stop-all-discovery-control" role="group" aria-label="Choose descendant refresh result">
      <span>Topology refresh</span>
      <button type="button" data-stop-all-discovery="success" aria-pressed="${discovered}">Succeeds</button>
      <button type="button" data-stop-all-discovery="failure" aria-pressed="${!discovered}">Fails</button>
      <small>${discovered ? 'Use the reconciled descendant snapshot.' : 'Failure is swallowed; continue with the snapshot already in the store.'}</small>
    </div>
    <div class="stop-all-lanes" aria-label="Panel dispatch and child cleanup are separate timelines">
      <div class="stop-all-lane panel-lane"><div class="stop-all-lane-title"><span>01</span><b>PANEL ACTION · LOADING STATE</b></div>
        <ol><li><b>Refresh descendants</b><small>${discovered ? 'Reconcile current tree' : 'Refresh fails → keep current tree'}</small></li><li><b>Prepare eligible rows</b><small>Hydrate missing / non-running children; ignore errors</small></li><li class="dispatch-edge"><b>Invoke each callback</b><small>Plain loop; callback promise is not returned</small></li><li class="panel-settles"><b>Clear loading</b><small>Handler settles after dispatch</small></li></ol>
      </div>
      <div class="stop-all-lane child-lane"><div class="stop-all-lane-title"><span>02</span><b>PER CHILD · INTERRUPT + DESCENDANTS</b></div>
        <ol><li><b><code>yda(... user)</code></b><small>Async callback work continues independently</small></li><li><b>Interrupt this child</b><small>Manager awaits its self-interrupt</small></li><li class="cascade-edge"><b>Schedule its descendants</b><small>User-stop starts best-effort cleanup in background</small></li><li><b>Two-pass sweep</b><small>Known descendants → rediscover → remaining active</small></li></ol>
      </div>
    </div>
    <div class="stop-all-clock-note"><span aria-hidden="true">↗</span><p><b>Two clocks, no shared completion receipt.</b> The panel can stop showing “Stopping” after callbacks are dispatched. That does not confirm the child interrupt RPCs finished, the descendant sweeps finished, or every agent reached a terminal state.</p></div>
    <p class="stop-all-evidence"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#stop-all-panel-action" target="_blank" rel="noreferrer">Stop-all evidence ledger ↗</a> · panel offsets <code>1,243,059–1,243,550</code> · callback offsets <code>5,441,899–5,454,015</code></p>
    <p class="stop-all-boundary">Static installed-bundle trace; no Stop all click or child terminal-state transition was observed.</p>
  </section>`;
}
function shutdownPathCompareMarkup() {
  const desktop = shutdownPathFocus === 'desktop-stop';
  const desktopExit = shutdownPathFocus === 'desktop-exit';
  const rust = shutdownPathFocus === 'root-suspension';
  return `<div class="shutdown-path-compare" data-focus="${shutdownPathFocus}" aria-labelledby="shutdown-path-title">
    <div class="shutdown-path-heading"><span>RELATED QUESTION · DISTINCT OWNERS</span><strong id="shutdown-path-title">Which stop path are we describing?</strong></div>
    <div class="shutdown-path-controls" role="group" aria-label="Focus a shutdown path">
      <button type="button" data-shutdown-path="desktop-stop" aria-pressed="${desktop}">Desktop Stop</button>
      <button type="button" data-shutdown-path="desktop-exit" aria-pressed="${desktopExit}">Desktop app exit</button>
      <button type="button" data-shutdown-path="root-suspension" aria-pressed="${rust}">Rust root suspension</button>
    </div>
    <div class="shutdown-path-lanes">
      <article class="shutdown-path-lane desktop"><span>INSTALLED DESKTOP · APP-SHARED BUNDLE</span><strong>User Stop interrupts root, then schedules descendant cascade</strong><small>Two-pass per-thread best effort; the UI call may return before cleanup. Exact bundle SHA-256: <code>3b4cabc3…31d1bf5</code>.</small><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-26100771326-stop-path-schedules-child-cleanup" target="_blank" rel="noreferrer">Desktop source evidence ↗</a></article>
      <article class="shutdown-path-lane desktop-exit"><span>INSTALLED DESKTOP · 26.1013.31256 / BUILD 20586</span><strong>Will-quit waits for selected cleanup, then bounds context disposal</strong><small>The flush group settles first; context disposal gets up to 5 seconds before remaining resources are disposed and the app quits. This does not establish descendant-tree cleanup.</small><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-installed-desktop-exit-path-rechecked-in-build-20586-2026-10-17" target="_blank" rel="noreferrer">Current Desktop exit evidence ↗</a></article>
      <article class="shutdown-path-lane rust"><span>PUBLIC CODEX MAIN · 4EB4A65</span><strong>Root suspension signals shared-runtime shutdown, then closes root writer</strong><small>It emits root <code>ShutdownComplete</code>; host-owned tree wait and writer fencing remain a separate handoff. No production caller was found in checked <code>codex-rs</code>.</small><a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/session/turn_suspension.rs#L83-L110" target="_blank" rel="noreferrer">Suspension source ↗</a></article>
    </div>
    <p class="shutdown-path-conclusion" aria-live="polite">${desktop ? '<b>FOCUS · DESKTOP STOP</b> Static installed-bundle code shows a best-effort UI descendant cascade. It does not establish that this path invokes Rust root suspension.' : desktopExit ? '<b>FOCUS · DESKTOP EXIT</b> The selected exit flush group and bounded context disposal are visible in the installed main bundle. No descendant-tree wait is established by this trace.' : '<b>FOCUS · RUST CORE</b> Public source defines a host tree-wait contract. It does not establish that the packaged Desktop host follows this path or completes that handoff.'}</p>
    <p class="shutdown-path-boundary">These three paths have different owners and evidence snapshots. Their presence in one diagram is a comparison, not proof that they converge or are interchangeable.</p>
  </div>`;
}
function desktopCoverageMarkup() {
  const selected = desktopCoverageFocus;
  const detail = {
    'asar-js': {
      label: 'FULL ASAR · JAVASCRIPT',
      value: '15,127 files · 414.7 MB decoded',
      result: 'No tree-shutdown identifier found. The only token hit was thread/suspend in a Racket built-in symbol list.',
      boundary: 'Complete for .js members and these exact strings; does not cover renamed or dynamically assembled behavior.'
    },
    'native-strings': {
      label: 'PACKAGED ARM64 · PRINTABLE STRINGS',
      value: 'Codex 0.163.0-alpha.10.2',
      result: 'spawn_agent, wait_agent, and AgentMessage are present. Exact tree-wait API names are absent; ShutdownComplete occurs without an identified owner.',
      boundary: 'String presence is not a call graph. This is not complete native disassembly or proof of runtime execution.'
    },
    unknown: {
      label: 'OUTSIDE THIS SCAN',
      value: 'Native logic · external app-server · dynamic modules',
      result: 'Equivalent behavior could use different symbols, non-string native logic, or code loaded outside the scanned JavaScript set.',
      boundary: 'Packaged Desktop tree-wait caller and actual cleanup behavior remain unknown.'
    }
  }[selected];
  return `<section class="desktop-coverage" data-focus="${selected}" aria-labelledby="desktop-coverage-title">
    <div class="desktop-coverage-heading"><span>INSTALLED DESKTOP · BUILD 20586</span><strong id="desktop-coverage-title">What exactly was searched?</strong></div>
    <div class="desktop-coverage-controls" role="group" aria-label="Choose static scan layer">
      <button type="button" data-desktop-coverage="asar-js" aria-pressed="${selected === 'asar-js'}">All ASAR JavaScript</button>
      <button type="button" data-desktop-coverage="native-strings" aria-pressed="${selected === 'native-strings'}">Codex binary strings</button>
      <button type="button" data-desktop-coverage="unknown" aria-pressed="${selected === 'unknown'}">Uncovered layers</button>
    </div>
    <article class="desktop-coverage-card" aria-live="polite"><span>${detail.label}</span><strong>${detail.value}</strong><p>${detail.result}</p><small>${detail.boundary}</small></article>
    <p class="desktop-coverage-manifest">ASAR manifest SHA-256 <code>975b3d35…a62</code> · binary UUID <code>924A7A64-F1CB-3C8C-8E34-71F3FFA416CF</code> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-complete-installed-asar-javascript-exact-name-census-2026-10-17" target="_blank" rel="noreferrer">full scan ledger ↗</a></p>
  </section>`;
}
function shutdownScopeMarkup() {
  const modes = {
    'shared-runtime': {
      title: 'Shared runtime fence',
      detail: 'request_agent_tree_shutdown(child A) resolves the loaded thread, then fences and signals sessions sharing its LocalAgentRuntime. This illustration assumes all four example sessions share that runtime; the source defines scope by runtime membership, not spawn ancestry.',
      nodes: ['root', 'child-a', 'grandchild', 'sibling'],
      source: 'https://github.com/openai/codex/blob/092d3acd6bec3e3a14bdc7e7a2810ab628ab759d/codex-rs/core/src/thread_manager/shutdown.rs#L710-L746',
      label: 'ThreadManager::request_agent_tree_shutdown'
    },
    'spawn-subtree': {
      title: 'Explicit spawn subtree close',
      detail: 'close_agent(child A) persists the edge as closed, then shutdown_agent_tree walks live descendants from the in-memory spawn tree. Root and sibling are outside this selected subtree.',
      nodes: ['child-a', 'grandchild'],
      source: 'https://github.com/openai/codex/blob/092d3acd6bec3e3a14bdc7e7a2810ab628ab759d/codex-rs/core/src/agent/control/legacy.rs#L535-L679',
      label: 'close_agent → shutdown_agent_tree'
    },
    'single-thread': {
      title: 'Idle thread unload',
      detail: 'The app-server idle unload path waits for this thread shutdown, then removes that exact runtime only if it still matches. That path does not itself traverse spawn descendants.',
      nodes: ['child-a'],
      source: 'https://github.com/openai/codex/blob/092d3acd6bec3e3a14bdc7e7a2810ab628ab759d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L2888-L3005',
      label: 'unload_thread_without_subscribers'
    }
  }[shutdownScopeMode];
  const node = (id, name, role) => `<div class="shutdown-scope-node ${modes.nodes.includes(id) ? 'in-scope' : ''} ${id === 'child-a' ? 'selected' : ''}" data-scope-node="${id}"><span>${role}</span><b>${name}</b><small>${modes.nodes.includes(id) ? 'IN SCOPE' : 'OUTSIDE SCOPE'}</small></div>`;
  return `<section class="shutdown-scope" data-mode="${shutdownScopeMode}" aria-labelledby="shutdown-scope-title">
    <div class="shutdown-scope-heading"><span>FIXED SOURCE SNAPSHOT · rust-v0.162.1</span><h4 id="shutdown-scope-title">A shutdown name does not define its tree boundary</h4><p>Choose an operation to compare source-defined scope on the same four-node example. Runtime membership is explicitly illustrative.</p></div>
    <div class="shutdown-scope-controls" role="group" aria-label="Choose shutdown operation">
      <button type="button" data-shutdown-scope="shared-runtime" aria-pressed="${shutdownScopeMode === 'shared-runtime'}">Shared runtime fence</button>
      <button type="button" data-shutdown-scope="spawn-subtree" aria-pressed="${shutdownScopeMode === 'spawn-subtree'}">Close child subtree</button>
      <button type="button" data-shutdown-scope="single-thread" aria-pressed="${shutdownScopeMode === 'single-thread'}">Unload one thread</button>
    </div>
    <div class="shutdown-scope-content">
      <div class="shutdown-scope-tree" role="img" aria-label="Example spawn tree. Root has child A and a sibling. Child A has a grandchild. Highlighted nodes are within the selected operation's shutdown scope.">
        ${node('root', 'Root', 'PARENT')}
        <div class="shutdown-scope-children"><div class="shutdown-scope-branch">${node('child-a', 'Child A', 'SELECTED TARGET')}<div class="shutdown-scope-grandchild">${node('grandchild', 'Grandchild', 'DESCENDANT')}</div></div><div class="shutdown-scope-branch">${node('sibling', 'Sibling', 'SIBLING')}</div></div>
      </div>
      <article class="shutdown-scope-explanation" aria-live="polite"><span>OPERATION</span><strong>${modes.title}</strong><code>${modes.label}</code><p>${modes.detail}</p><a href="${modes.source}" target="_blank" rel="noreferrer">Pinned source ↗</a></article>
    </div>
    <p class="shutdown-scope-boundary"><b>Interpretation boundary:</b> the diagram distinguishes source-level ownership and traversal. It does not claim the installed Desktop host invokes any one of these paths for a user Stop.</p>
  </section>`;
}
function appServerExitScenarioMarkup() {
  const scenarios = {
    'desktop-sigterm': {
      title: 'Desktop close → child.kill() → SIGTERM → normal stdio cleanup',
      label: 'DESKTOP-SPAWNED STDIO · SIGNAL HANDLER ENABLED',
      steps: ['Electron calls child.kill() → SIGTERM', 'Start the 45 s process watchdog; close stdio forwarding', 'Drain tracked startup tasks (up to 10 s)', 'After drain, snapshot registered threads; shut down concurrently (10 s each)', 'Remove completed threads; retain timed-out or failed entries'],
      note: 'Startup registers only after SessionConfigured. If the 10 s drain expires first, a still-starting thread may miss the later map snapshot; this source-possible edge is not a reproduced race. This tag exposes AgentTreeShutdown.wait(), a separate handle not called by this exit path. Electron does not await child exit.',
      source: 'https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/app-server-transport/src/transport/stdio.rs#L28-L50'
    },
    'stdio-eof': {
      title: 'stdin EOF → ConnectionClosed → normal stdio cleanup',
      label: 'STDIO EOF · SAME PROCESS WATCHDOG',
      steps: ['stdin reader reaches EOF', 'stdio transport starts the 45 s watchdog', 'transport emits ConnectionClosed', 'Snapshot ThreadManager map; shut down concurrently (10 s each)'],
      note: 'This is a transport-close route, not evidence that Desktop exit closes stdin; the watchdog can exit with code 1.',
      source: 'https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/app-server-transport/src/transport/stdio.rs#L125-L132'
    },
    'managed-daemon': {
      title: 'Managed Unix socket daemon → forced shutdown branch',
      label: 'SEPARATE TRANSPORT · NOT DESKTOP STDIO',
      steps: ['Managed daemon enters forced shutdown', 'Abort connection-cleanup tasks', 'Return AppServerExit::Forced', 'CLI calls process::exit(0)'],
      note: 'This branch skips normal background drain and tracked-thread shutdown; it is not the Desktop child.kill() path.',
      source: 'https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/app-server/src/main.rs#L127-L134'
    }
  };
  const scenario = scenarios[appServerExitMode] ?? scenarios['desktop-sigterm'];
  const drainSource = appServerExitMode === 'desktop-sigterm' ? ' · <a href="https://github.com/openai/codex/blob/rust-v0.162.0-alpha.17.2/codex-rs/app-server/src/request_processors/thread_processor.rs#L1248-L1294" target="_blank" rel="noreferrer">startup drain + thread shutdown ↗</a>' : '';
  return `<article class="app-server-exit-scenario"><span>${scenario.label}</span><strong>${scenario.title}</strong><ol aria-label="Shutdown sequence">${scenario.steps.map((step, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${step}</li>`).join('')}</ol><p>${scenario.note}</p><div><a href="${scenario.source}" target="_blank" rel="noreferrer">Pinned transport source ↗</a>${drainSource}</div></article>`;
}
function appServerExitCompareMarkup() {
  return `<div class="app-server-exit-compare" aria-label="Version-matched app-server shutdown scenarios">
    <div class="app-server-exit-compare-head"><span>EMBEDDED CLI · 0.162.0-alpha.17.2 · MATCHED UPSTREAM TAG</span><b>Choose the transport-close trigger</b></div>
    <div class="app-server-exit-controls" role="group" aria-label="Choose app-server shutdown scenario">
      <button type="button" data-app-server-exit="desktop-sigterm" aria-pressed="${appServerExitMode === 'desktop-sigterm'}">Desktop · SIGTERM</button>
      <button type="button" data-app-server-exit="stdio-eof" aria-pressed="${appServerExitMode === 'stdio-eof'}">stdio · EOF</button>
      <button type="button" data-app-server-exit="managed-daemon" aria-pressed="${appServerExitMode === 'managed-daemon'}">Unix socket · forced daemon</button>
    </div>
    ${appServerExitScenarioMarkup()}
    <p class="app-server-exit-boundary"><b>Boundary:</b> tracked-thread shutdown is not the pinned tag’s <code>AgentTreeShutdown.wait()</code>; explicit <code>close_agent</code> uses a separate subtree path. The Desktop asks its direct child to stop but does not await exit; neither descendant coverage nor tree-wait/persistence handoff completion is proven.</p>
  </div>`;
}
function desktopExitFlushMarkup() {
  return `<div class="desktop-exit-flush" aria-label="Installed Desktop app exit flush and disposal trace">
    <div class="desktop-exit-flush-heading"><span>INSTALLED DESKTOP · MAIN PROCESS · 26.1007.71326</span><strong id="desktop-exit-flush-title">App exit has a bounded flush barrier</strong></div>
    <ol class="desktop-exit-flush-flow">
      <li><i>01</i><span><b>Electron emits <code>will-quit</code></b><small>Main bundle registers the application-exit handler.</small></span></li>
      <li><i>02</i><span><b>Flush attempts settle</b><small>The normal path uses <code>Promise.allSettled</code>; fast exit skips one flush.</small></span></li>
      <li><i>03</i><span><b>Dispose context and flush</b><small><code>flushAndDisposeContext</code> disposes the host context and awaits <code>x.flush()</code>.</small></span></li>
      <li><i>04</i><span><b>Continue on settle or 5 s timeout</b><small>The bounded wait lets exit proceed after completion, rejection, or timeout.</small></span></li>
    </ol>
    <div class="connection-dispose-trace" aria-label="Connection close and transport disposal calls during context disposal">
      <div class="connection-dispose-head"><span>INSIDE STEP 03 · HOST CONNECTION</span><b>Close is initiated; exit completion is not shown</b></div>
      <ol>
        <li><b>Manager calls <code>dispose()</code></b><small>Per-host connection calls are synchronous.</small></li>
        <li><b><code>stopProcess()</code></b><small>Stops timers, clears queues, detaches connection.</small></li>
        <li><b><code>connection.close()</code></b><small>Called without awaiting its result.</small></li>
        <li class="transport-boundary"><b>stdio <code>connection.close()</code></b><small>Calls <code>child.kill()</code>; exit is not awaited. <code>closeGracefully()</code> is used by a separate network/config helper, not this exit chain.</small></li>
      </ol>
    </div>
    ${appServerExitCompareMarkup()}
    <p class="desktop-exit-flush-boundary"><b>Separate from descendant cleanup.</b> The traced chain requests termination of the directly spawned Codex CLI/app-server process, but does not await its exit before app quit. It does not establish termination of that process's descendants or app-server agent-tree cleanup. The bundle shows no tree-wait call or link to the renderer's user-Stop cascade; dynamic IPC/RPC, native-host, and external app-server paths remain unknown.</p>
    <p class="desktop-exit-flush-source"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-app-exit-flush-is-bounded-and-separate-from-tree-cleanup-2026-10-16" target="_blank" rel="noreferrer">Exit-path evidence ledger ↗</a> · main bundle SHA-256 <code>87d52265…ea6d32d51</code> · connection asset SHA-256 <code>86fb2066…a66df25</code> · stdio asset SHA-256 <code>52f0be37…fda6344e</code> · offsets <code>3,248,213</code>, <code>1,218,413</code>, <code>1,229,877</code>, <code>258,189</code></p>
  </div>`;
}
function topologyMarkup() {
  const scenarios = {
    'panel-open': {
      label: 'PANEL MOUNT · READ + DISCOVER',
      stages: [
        ['PARENT THREAD', 'Parent key is available', 'The shared selector subscribes to the keyed descendant snapshot.'],
        ['PANEL MOUNTS', 'Selector subscription starts', 'The getter reads current state; mounting its derived store also runs onMount.']
      ],
      branches: [
        ['SYNC · RENDER', 'Known snapshot', 'Render descendants already in local state; isLoading and isComplete describe current discovery.'],
        ['ASYNC · onMount', 'Reconciled discovery', 'When parent key and host connection are available, start discoverSubagentDescendantSnapshot(parent, {reconcile:true}).']
      ],
      outcome: 'The mounted subscription has two effects: render the known snapshot immediately and, when its gate is satisfied, initiate discovery. Later thread and parent-item events can schedule refreshes.'
    },
    'spawn-event': {
      label: 'EVENT PATH · DISCOVER FOR SPAWN',
      stages: [
        ['PARENT ITEM', 'spawnAgent / started', 'A typed item event identifies a new child reference.'],
        ['EVENT HANDLER', 'discoverForSpawn', 'A unique known child can be hydrated with its subtree.'],
        ['FALLBACK', 'Discover full subtree', 'Ambiguous or unmatched identity falls back to parent descendant discovery.']
      ],
      outcome: 'Discovery is event-driven here. The UI snapshot subscription and the discovery trigger are separate paths.'
    },
    'partial-discovery': {
      label: 'DISCOVERY · COVERAGE CHECKS',
      stages: [
        ['CANDIDATE IDS', 'thread/list or history', 'Fallback history scans spawn IDs from item or turn pages.'],
        ['IDENTITY CHECK', 'ID + parent must match', 'Candidate thread reads run with at most two children in flight.'],
        ['RESULT', 'Complete or partial', 'Read failures, cursor anomalies, or identity mismatch keep isComplete false.']
      ],
      outcome: 'A partial descendant set can still contain useful rows. Keep the unknown portion visible as unknown instead of presenting it as an empty tree.'
    },
    'select-child': {
      label: 'SELECTED CHILD · TWO DATA PATHS',
      stages: [
        ['PARENT PROJECTION', 'Build known list rows', 'The panel reads its subagent rows from the parent conversation selector.'],
        ['SELECTION', 'Find row by child ID', 'The selected child is resolved against those projected rows for its display name and canInteract value.'],
        ['CHILD METADATA', 'Verify and hydrate', 'The opener checks ancestry and may fetch missing parent or child summaries.'],
        ['CHILD HISTORY', 'Load transcript pages', 'The embedded child view uses its own thread identity and history path.']
      ],
      outcome: 'The parent projection supplies the list and selected-row facts. Child metadata and transcript hydration are follow-up reads; reading history does not itself create a parent list row.'
    },
    'row-eligibility': {
      label: 'PARENT ROW · CANDIDATE AND FILTER GATES',
      stages: [
        ['CANDIDATE INPUTS', 'Merge known relationships', 'Parent turn items, cached child conversations, active summaries, and descendant snapshots can contribute candidates.'],
        ['LINEAGE + MEMBERSHIP', 'Associate with parent turn', 'The projection checks parent identity and derives a latest parent-turn reference for each candidate.'],
        ['ROW DERIVATION', 'Need a usable reference', 'If no matching parent reference is derived, the row builder returns no list row even when a child transcript exists.'],
        ['STATUS FILTERS', 'Some rows are suppressed', 'Closed agents, hidden terminal agents, and system errors can be omitted; incomplete discovery can leave status unresolved.']
      ],
      outcome: 'Child history belongs to the child detail path. The parent list is a separate projection over relationship candidates, parent-turn references, discovery completeness, and runtime state.'
    }
  };
  const scenario = scenarios[topologyScenario] ?? scenarios['panel-open'];
  const rowEligibility = topologyScenario === 'row-eligibility' ? rowEligibilityMarkup() : '';
  return `<section class="topology-map" data-topology-map="${topologyScenario}" aria-labelledby="topology-map-title">
    <div class="topology-heading"><div><span class="topology-eyebrow">DESKTOP UI · STATIC TOPOLOGY TRACE</span><h5 id="topology-map-title">How does the Subagents panel get its rows?</h5></div><span class="topology-version">installed build · 26.1013.31256 · 20586</span></div>
    <p class="topology-intro">Separate discovery, parent-row projection, and selected-child hydration. These are connected client paths with different inputs and outputs.</p>
    <div class="topology-controls" role="group" aria-label="Choose a Desktop topology path">
      <button type="button" data-topology-case="panel-open" aria-pressed="${topologyScenario === 'panel-open'}">Open panel</button>
      <button type="button" data-topology-case="spawn-event" aria-pressed="${topologyScenario === 'spawn-event'}">Spawn event</button>
      <button type="button" data-topology-case="partial-discovery" aria-pressed="${topologyScenario === 'partial-discovery'}">Partial discovery</button>
      <button type="button" data-topology-case="select-child" aria-pressed="${topologyScenario === 'select-child'}">Select child</button>
      <button type="button" data-topology-case="row-eligibility" aria-pressed="${topologyScenario === 'row-eligibility'}">Row eligibility</button>
    </div>
    <div class="topology-flow" data-case="${topologyScenario}" aria-live="polite">
      ${scenario.stages.map(([label,title,detail],index) => `<article class="topology-node" data-stage="${index}"><span>${label}</span><strong>${title}</strong><small>${detail}</small></article>${index < scenario.stages.length-1 ? '<i aria-hidden="true">→</i>' : ''}`).join('')}
    </div>
    ${rowEligibility}
    ${scenario.branches ? `<div class="topology-branches" aria-label="Two effects of mounting the panel subscription">${scenario.branches.map(([label,title,detail]) => `<article class="topology-node"><span>${label}</span><strong>${title}</strong><small>${detail}</small></article>`).join('')}</div>` : ''}
    <p class="topology-outcome" aria-live="polite"><b>${scenario.label}</b><span>${scenario.outcome}</span></p>
    <p class="topology-boundary">Static inspection of the installed build 20586 bundles only. No live panel opening, discovery request, child metadata response, or transcript paint was observed. Incomplete discovery is not proof that a child does not exist.</p>
    <p class="topology-sources"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-panel-row-projection-and-child-hydration-are-separate-paths-build-20586-2026-10-17" target="_blank" rel="noreferrer">panel projection and child hydration evidence</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-panel-row-candidate-and-suppression-rules-build-20586-2026-10-17" target="_blank" rel="noreferrer">row candidate and suppression rules</a></p>
  </section>`;
}
function rowEligibilityMarkup() {
  const cases = {
    visible: {label:'Eligible child', ref:'spawnAgent · parent turn 8', runtime:'running', hidden:false, result:'ROW PROJECTED', reason:'A candidate has a usable parent-turn reference and none of the listed suppression conditions applies.'},
    noReference: {label:'No parent-turn reference', ref:'none', runtime:'running', hidden:false, result:'NO ROW', reason:'The row builder returns no row when it cannot derive a latest parent-turn reference, even if a child transcript exists.'},
    closeAgent: {label:'Closed by parent', ref:'closeAgent · parent turn 8', runtime:'completed', hidden:false, result:'SUPPRESSED', reason:'A closeAgent reference is excluded from the parent list projection.'},
    hiddenTerminal: {label:'Hidden terminal child', ref:'spawnAgent · parent turn 8', runtime:'completed', hidden:true, result:'SUPPRESSED', reason:'A hidden terminal agent is omitted when runtime no longer reports it as active.'},
    hiddenActive: {label:'Hidden, still active', ref:'spawnAgent · parent turn 8', runtime:'running', hidden:true, result:'ROW PROJECTED', reason:'The hidden-terminal suppression has an exception while runtime still says active.'},
    systemError: {label:'System-error runtime', ref:'spawnAgent · parent turn 8', runtime:'system error', hidden:false, result:'SUPPRESSED', reason:'A system-error runtime is suppressed by the row builder.'},
    failedIdle: {label:'Failed child, inactive', ref:'spawnAgent · parent turn 8', runtime:'failed', hidden:false, result:'SUPPRESSED', reason:'Failed or interrupted child turns are omitted unless runtime still reports the agent as active.'},
    failedActive: {label:'Failed turn, runtime active', ref:'spawnAgent · parent turn 8', runtime:'active', hidden:false, result:'ROW PROJECTED', reason:'A failed or interrupted turn is not suppressed by this predicate while runtime still says active.'},
  };
  const selected = cases[topologyEligibilityState] ?? cases.visible;
  const keys = Object.keys(cases);
  const status = selected.result === 'ROW PROJECTED' ? 'pass' : selected.result === 'NO ROW' ? 'missing' : 'filtered';
  return `<section class="row-eligibility-lab" data-row-outcome="${status}" aria-labelledby="row-eligibility-title">
    <div class="row-eligibility-heading"><div><span>STATIC PREDICATE EXPLORER</span><h6 id="row-eligibility-title">为什么候选 child 最后有行 / 没有行？</h6></div><span>BUILD 20586</span></div>
    <p>固定一个已进入候选集的 child，只切换已从该 build 读出的 parent-turn / runtime 条件。</p>
    <div class="row-eligibility-controls" role="group" aria-label="选择静态行投影条件">${keys.map(key => `<button type="button" data-row-eligibility="${key}" aria-pressed="${key === topologyEligibilityState}">${cases[key].label}</button>`).join('')}</div>
    <div class="row-eligibility-flow" aria-live="polite">
      <article><span>01 · CANDIDATE</span><strong>Child C</strong><small>Found in a parent-related candidate input</small></article><i aria-hidden="true">→</i>
      <article class="${selected.ref === 'none' ? 'gate-fail' : ''}"><span>02 · PARENT REFERENCE</span><strong>${selected.ref}</strong><small>latest parent-turn membership</small></article><i aria-hidden="true">→</i>
      <article class="${status === 'filtered' ? 'gate-fail' : ''}"><span>03 · ROW GATES</span><strong>${selected.hidden ? 'hidden · ' : ''}${selected.runtime}</strong><small>close / hidden terminal / system error / failed-turn predicates</small></article><i aria-hidden="true">→</i>
      <article class="row-eligibility-result ${status}"><span>04 · PARENT LIST</span><strong>${selected.result}</strong><small>${selected.reason}</small></article>
    </div>
    <div class="row-eligibility-inputs"><span>Candidate sources in this build</span><b>parent turn items</b><b>cached conversations</b><b>active thread summaries</b><b>descendant snapshot</b></div>
    <small class="row-eligibility-boundary">This is a source-backed predicate walkthrough, not a live selector replay. A displayed row is not proof of a React commit or visible paint.</small>
  </section>`;
}
function selectTopologyScenario(scenarioName) {
  const container = $('.topology-map');
  if (!container) return;
  topologyScenario = ['panel-open','spawn-event','partial-discovery','select-child','row-eligibility'].includes(scenarioName) ? scenarioName : 'panel-open';
  container.outerHTML = topologyMarkup();
}
function historyProjectionMarkup(complete = false) {
  const subagentLabel = complete ? 'PASSED THIS PREDICATE' : 'EXCLUDED FROM THIS PROJECTION';
  const searchLabel = complete ? 'SEARCH ITEMS AVAILABLE' : 'NO SEARCH ITEMS PROJECTED';
  return `<section class="history-gate" data-history-complete="${complete}" aria-labelledby="history-gate-title">
    <div class="history-gate-heading"><div><span class="history-gate-eyebrow">DESKTOP BUNDLE · STATIC DATA FLOW</span><h5 id="history-gate-title">What does transcript history completeness gate?</h5></div><span>26.1007.71326</span></div>
    <p class="history-gate-intro">The installed bundle derives history completeness from conversation snapshots and updates, stores it per thread, then reads it through a selector. The controls below switch only the downstream example value; they do not replay a live RPC update.</p>
    <div class="history-value-flow" role="list" aria-label="Static source path for transcript history completeness">
      <div class="history-value-step" role="listitem"><small>CONVERSATION INPUT</small><strong>reset metadata<br>or history delta</strong></div><span class="history-value-arrow" aria-hidden="true">→</span>
      <div class="history-value-step" role="listitem"><small>COMPLETENESS RULE</small><strong><code>bz(state)</code></strong><span>pagination + history shape</span></div><span class="history-value-arrow" aria-hidden="true">→</span>
      <div class="history-value-step" role="listitem"><small>TRANSCRIPT STORE</small><strong><code>historyComplete</code></strong><span>updated for this thread</span></div><span class="history-value-arrow" aria-hidden="true">→</span>
      <div class="history-value-step selected-value" role="listitem"><small>SELECTED EXAMPLE VALUE</small><strong><code>historyComplete = ${complete}</code></strong><span>downstream-only switch</span></div>
    </div>
    <div class="history-gate-controls" role="group" aria-label="Set the downstream example value"><button type="button" data-history-gate="incomplete" aria-pressed="${!complete}">Show incomplete</button><button type="button" data-history-gate="complete" aria-pressed="${complete}">Show complete</button></div>
    <div class="history-gate-branches">
      <div class="history-gate-lane gated-lane"><div class="history-lane-source"><small>INPUT · PER-THREAD SELECTOR</small><strong>historyComplete = ${complete}</strong></div><span class="history-lane-link" aria-hidden="true">↓ gates</span><article class="history-gate-branch search-branch"><span>CONSUMER 01 · CONTENT SEARCH</span><strong>${searchLabel}</strong><p>The complete-history search helper returns no projected search items until history is complete.</p><small>This helper does not build the visible transcript rows.</small></article></div>
      <div class="history-gate-lane gated-lane"><div class="history-lane-source"><small>INPUT · SAME PER-THREAD SELECTOR</small><strong>historyComplete = ${complete}</strong></div><span class="history-lane-link" aria-hidden="true">↓ passed as option</span><article class="history-gate-branch subagent-branch"><span>CONSUMER 02 · TURN ITEM PROJECTION</span><strong>${subagentLabel}</strong><p><code>isBackgroundSubagentsEnabled</code> receives this same value. When false, <code>subAgentActivity</code> and <code>collabAgentToolCall</code> items other than <code>wait</code> fail this predicate.</p><small>When true, these cases pass this predicate only; other filters and projection budgets still apply.</small></article></div>
      <div class="history-gate-lane independent-lane"><div class="history-lane-source independent-source"><small>INDEPENDENT INPUT · ROW DATA</small><strong><code>visibleTurnEntries</code></strong></div><span class="history-lane-link" aria-hidden="true">↓ supplies rows</span><article class="history-gate-branch visible-branch"><span>PARALLEL PATH · VIRTUALIZED LIST</span><strong>Transcript row entries</strong><p>The row list is built from this separate source; <code>historyComplete</code> is not its row-list input.</p><small>This call path does not prove a React commit or visible paint.</small></article></div>
    </div>
    <p class="history-gate-boundary">Static bundle trace. Incomplete history gates search projection and these subagent item types, while visible rows have a separate source path. Why history completeness is reused under the subagent option name remains unresolved; live selected-child rendering is not captured.</p>
    <p class="history-gate-sources"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#history-completeness-value-gates-two-different-projections" target="_blank" rel="noreferrer">history completeness evidence ledger</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#selected-child-renderer-flag-is-wired-to-transcript-history-completeness" target="_blank" rel="noreferrer">selector and store trace</a></p>
  </section>`;
}
function selectHistoryGate(value) {
  const container = $('.history-gate');
  if (!container) return;
  container.outerHTML = historyProjectionMarkup(value === 'complete');
}
function panelPersistenceMarkup() {
  const steps = [
    { title: 'Open panel', detail: 'Both surfaces can be opened for a parent conversation; persistence is decided by each registered tab type.' },
    { title: 'Describe route', detail: 'The Work registration has no durableRoute/restore contract. The Local registration declares durableRoute version 1 and a restore callback.' },
    { title: 'Refresh checkpoint', detail: 'For ordinary panel tabs, the snapshot keeps route descriptors; workspace-home tabs are a separate exception. This Work panel is filtered from routes and tabIds, while Local contributes its route descriptor.' },
    { title: 'Draft handoff', detail: 'A separate conditional path carries draft checkpoint state across workspace transitions: savedDraftTabs$ or setDraft, then draft read and conversation-ID handoff. It is not the storage engine for every checkpoint.' },
    { title: 'Restore', detail: 'Startup reads the conversation-scoped checkpoint and restores its routes. On the Local persistence branch, the panel overview returns with selectedConversationId set to null.' },
  ];
  const step = Math.max(0, Math.min(steps.length - 1, persistenceCheckpointStep));
  const workStates = ['Panel can be open', 'No durableRoute', 'Filtered from routes + tabIds', 'No tab descriptor to hand off', 'No route-specific restore'];
  const localStates = ['Panel can be open', 'durableRoute v1 + restore', 'Route included in YP checkpoint', 'Conditional draft checkpoint handoff', 'Overview restored · child selection cleared'];
  const phaseLabels = ['OPEN', 'ROUTE', 'SNAPSHOT', 'DRAFT', 'RESTORE'];
  const workDescriptions = [
    'The panel may be open in the current session.',
    'The Work tab registration has no durable route in this inspected build.',
    'This ordinary panel tab is filtered out of routes and tabIds. Workspace-home tabs follow a separate exception.',
    'There is no Work route descriptor to carry through the inspected draft handoff.',
    'The inspected restore path has no route-specific Work restorer.',
  ];
  const localDescriptions = [
    'The selected child can be part of the current panel state.',
    'The Local tab declares a versioned durable route and a restore callback.',
    'The Local route descriptor is included in the conversation checkpoint.',
    'When a draft transition applies, the checkpoint can be saved and handed to the conversation ID.',
    'The parent overview is restored; the previously selected child is cleared.',
  ];
  const lane = (surface, states, tone) => `<article class="panel-persist-lane ${tone}" data-active-step="${step}">
    <header><span>${surface === 'work' ? 'CHATGPT WORK' : 'LOCAL CONVERSATION'}</span><b>${surface === 'work' ? 'NO DURABLE ROUTE' : 'DURABLE ROUTE V1'}</b></header>
    <div class="panel-persist-track" aria-label="${surface === 'work' ? 'Work' : 'Local'} panel persistence path">${states.map((label, index) => `<div class="panel-persist-node ${index === step ? 'current' : index < step ? 'passed' : ''} ${surface === 'work' && index >= 1 ? 'excluded' : surface === 'local' && index >= 1 ? 'kept' : ''} ${surface === 'local' && index === 3 ? 'conditional' : ''}"><i>${index < step ? (surface === 'work' && index >= 1 ? '×' : '✓') : `0${index + 1}`}</i><small>${phaseLabels[index]}</small><strong>${label}</strong></div>${index < states.length - 1 ? `<span class="panel-persist-link ${index < step ? (surface === 'work' && index >= 1 ? 'cut' : 'live') : ''}" aria-hidden="true">${surface === 'work' && index >= 1 && step > index ? '⊘' : '→'}</span>` : ''}`).join('')}</div>
    <p>${surface === 'work' ? workDescriptions[step] : localDescriptions[step]}</p>
  </article>`;
  return `<section class="panel-persistence" aria-labelledby="panel-persistence-title" data-step="${step}">
    <header class="panel-persistence-heading"><div><span>INSTALLED DESKTOP · CHECKPOINT PATH</span><h5 id="panel-persistence-title">What happens to the Subagents panel after restore?</h5></div><b>STATIC BUNDLE TRACE</b></header>
    <p class="panel-persistence-intro">Follow registration, checkpoint refresh, the optional workspace-draft handoff, and route restoration. The dashed draft step applies only to that transition path.</p>
    <div class="panel-persistence-steps" role="group" aria-label="Select panel persistence checkpoint">${steps.map((item, index) => `<button type="button" data-panel-persist-step="${index}" aria-label="Checkpoint ${index + 1} of ${steps.length}: ${item.title}" aria-pressed="${step === index}"><i>0${index + 1}</i><span>${item.title}</span></button>`).join('')}</div>
    <div class="panel-persistence-legend" aria-label="Diagram legend"><span><i class="legend-kept" aria-hidden="true"></i>route retained</span><span><i class="legend-cut" aria-hidden="true"></i>filtered from route snapshot</span><span><i class="legend-conditional" aria-hidden="true"></i>conditional draft handoff</span></div>
    <div class="panel-persistence-lanes">${lane('work', workStates, 'work-lane')}${lane('local', localStates, 'local-lane')}</div>
    <div class="panel-persistence-readout" aria-live="polite"><span>CHECKPOINT ${step + 1} / ${steps.length}</span><strong>${steps[step].title}</strong><p>${steps[step].detail}</p></div>
    <p class="panel-persistence-boundary">Static installed-bundle evidence only. The draft handoff is conditional, and the underlying storage engine remains unidentified. No app restart or live restore event was observed; this does not prove every cold-launch branch. Local persistence restores the parent panel route, not its prior child selection.</p>
    <p class="panel-persistence-sources"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#the-work-subagents-panel-is-omitted-from-the-inspected-durable-tab-route-snapshot" target="_blank" rel="noreferrer">Open the checkpoint save/restore evidence ↗</a> · Matching installed bundle SHA-256: <code>604b5d2de4fb…</code></p>
  </section>`;
}
function selectPanelPersistenceStep(value) {
  const container = $('.panel-persistence');
  if (!container) return;
  const parsed = Number(value);
  persistenceCheckpointStep = Number.isInteger(parsed) ? Math.max(0, Math.min(4, parsed)) : 0;
  container.outerHTML = panelPersistenceMarkup();
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
function desktopBuild20586Markup() {
  const isWork = desktopBuild20586Surface === 'work';
  const stages = [
    { id:'waiting', label:'Waiting', copy:'The child is registered in the parent’s subagent list and appears in the Active section.' },
    { id:'working', label:'Working', copy:'The child remains Active. The panel can show its status message while work is underway.' },
    { id:'done', label:'Done', copy:'Selecting a completed child loads its final response. Cache identity, request parameters, and mount retry behavior use different inputs.' },
    { id:'failed', label:'Failed', copy:'The child appears in the terminal section. The detail path can show an unavailable response state.' },
  ];
  const selected = stages.find(stage => stage.id === desktopBuild20586Status) ?? stages[1];
  const threadScope = ['local-eligible', 'shared', 'local-ineligible'].includes(desktopBuild20586ThreadScope)
    ? desktopBuild20586ThreadScope
    : 'local-eligible';
  const resumeAllowed = desktopBuild20586ShouldResume
    && desktopBuild20586CanInteract
    && threadScope !== 'local-ineligible';
  const scopeLabels = {
    'local-eligible': 'Eligible local thread',
    shared: 'Shared thread',
    'local-ineligible': 'Ineligible local thread',
  };
  const routeScenarios = {
    accepted: {
      label: 'Valid parent chain',
      states: ['verified', 'not needed', 'first page ensured', 'applied'],
      detail: 'The ancestry walk reaches the requested parent on the same host. The child’s first conversation page is ensured, then the panel applies the result if it still requests this child.',
      outcome: 'Child detail opens',
    },
    wrongHost: {
      label: 'Host mismatch',
      states: ['rejected', 'skipped', 'skipped', 'list restored'],
      detail: 'A known ancestor host differs from the selected host, so the lineage check rejects this selection before transcript hydration.',
      outcome: 'Return to subagent list',
    },
    missingAncestor: {
      label: 'Missing ancestor record',
      states: ['incomplete link', 'metadata only', 'rechecked', 'applied if current'],
      detail: 'When the parent snapshot is incomplete and the caller allows repair, the client hydrates a missing ancestor with includeTurns=false, checks the chain again, then ensures the selected child’s first page.',
      outcome: 'Repair lineage, then open child',
    },
    staleSelection: {
      label: 'Selection changed mid-load',
      states: ['verified', 'may finish', 'child B selected', 'old result discarded'],
      detail: 'The old async request can finish, but the opener compares the tab’s requested child ID before applying the result. A child A continuation cannot overwrite a newer child B selection.',
      outcome: 'Keep the newer selection',
    },
  };
  const route = routeScenarios[desktopBuild20586Route] ?? routeScenarios.accepted;
  const resumeReason = !desktopBuild20586ShouldResume
    ? 'Resume was not requested.'
    : !desktopBuild20586CanInteract
      ? 'canInteract is false, so no child thread id is passed.'
      : threadScope === 'local-ineligible'
        ? 'This local thread does not meet the resume eligibility check.'
        : 'All resume conditions pass; the child thread id is supplied.';
  return `<section class="desktop-20586" aria-labelledby="desktop-20586-title">
    <header class="desktop-20586-head"><div><span>INSTALLED DESKTOP · BUILD 20586</span><h5 id="desktop-20586-title">Two subagent surfaces, two detail routes</h5></div><span class="desktop-20586-tag">STATIC BUNDLE</span></header>
    <div class="desktop-20586-switch" role="group" aria-label="Choose the installed panel surface"><button type="button" data-20586-surface="work" aria-pressed="${isWork}">ChatGPT Work</button><button type="button" data-20586-surface="local" aria-pressed="${!isWork}">Local conversation</button></div>
    ${isWork ? `<div class="desktop-20586-flow"><div class="desktop-20586-status-groups" role="group" aria-label="Explore Work subagent status"><section class="desktop-20586-status-group active-group"><header><b>ACTIVE</b><small>Waiting and Working</small></header><div>${stages.filter(stage => ['waiting','working'].includes(stage.id)).map(stage => `<button type="button" data-20586-status="${stage.id}" aria-pressed="${desktopBuild20586Status === stage.id}"><span>${stage.label}</span></button>`).join('')}</div></section><section class="desktop-20586-status-group done-group"><header><b>DONE</b><small>Terminal outcomes</small></header><div>${stages.filter(stage => ['done','failed'].includes(stage.id)).map(stage => `<button type="button" data-20586-status="${stage.id}" aria-pressed="${desktopBuild20586Status === stage.id}"><span>${stage.id === 'done' ? 'Completed' : 'Failed'}</span></button>`).join('')}</div></section></div><article class="desktop-20586-detail ${desktopBuild20586Status === 'done' ? 'has-query-map' : ''}" data-status="${selected.id}"><span class="desktop-20586-kicker">SELECTED CHILD · ${selected.label.toUpperCase()}</span><strong>${selected.copy}</strong>${desktopBuild20586Status === 'done' ? desktop20586FinalQueryMarkup() : ''}<small>Group membership follows the inspected Work panel: Waiting and Working are Active; completed and failed are separate terminal outcomes in Done.</small></article></div>` : `<div class="desktop-20586-local"><div class="desktop-20586-local-flow"><article><span>01 · DESCENDANT SNAPSHOT</span><b>Parent conversation</b><small>Local thumbnail resolves known descendant threads and shows a child count.</small></article><i aria-hidden="true">→</i><article><span>02 · SUBAGENTS PANEL</span><b>Active · Done</b><small>Active list is capped at four visible items in the inspected projection.</small></article><i aria-hidden="true">→</i><article><span>03 · CHILD DETAIL</span><b>Embedded transcript</b><small>The panel passes interaction only when the selected child's <code>canInteract</code> is exactly true.</small></article></div><section class="desktop-20586-gate" aria-labelledby="desktop-20586-gate-title"><div class="desktop-20586-gate-heading"><div><span class="desktop-20586-kicker">LOCAL CHILD · INDEPENDENT RENDERER GATES</span><b id="desktop-20586-gate-title">Change inputs to trace each UI outcome</b></div><button class="desktop-20586-conflict" type="button" data-20586-conflict aria-pressed="${desktopBuild20586WriterConflict}">Writer conflict · ${desktopBuild20586WriterConflict ? 'on' : 'off'}</button></div><div class="desktop-20586-expression" aria-label="Resume lookup requires shouldResume and canInteract and either an eligible local thread or a shared thread"><span class="${desktopBuild20586ShouldResume ? 'is-true' : 'is-false'}">shouldResume <b>${desktopBuild20586ShouldResume ? 'true' : 'false'}</b></span><i>AND</i><span class="${desktopBuild20586CanInteract ? 'is-true' : 'is-false'}">canInteract <b>${desktopBuild20586CanInteract ? 'true' : 'false'}</b></span><i>AND</i><span class="${threadScope !== 'local-ineligible' ? 'is-true' : 'is-false'}">thread scope <b>${scopeLabels[threadScope]}</b></span><i>→</i><strong class="${resumeAllowed ? 'gate-pass' : 'gate-block'}">${resumeAllowed ? 'thread id supplied' : 'lookup skipped'}</strong></div><div class="desktop-20586-gate-inputs"><fieldset><legend>Resume requested</legend><div class="desktop-20586-switch"><button type="button" data-20586-resume="yes" aria-pressed="${desktopBuild20586ShouldResume}">Yes</button><button type="button" data-20586-resume="no" aria-pressed="${!desktopBuild20586ShouldResume}">No</button></div></fieldset><fieldset><legend>canInteract prop</legend><div class="desktop-20586-switch"><button type="button" data-20586-interact="yes" aria-pressed="${desktopBuild20586CanInteract}">True</button><button type="button" data-20586-interact="no" aria-pressed="${!desktopBuild20586CanInteract}">False</button></div></fieldset><fieldset><legend>Thread scope</legend><div class="desktop-20586-switch"><button type="button" data-20586-scope="local-eligible" aria-pressed="${threadScope === 'local-eligible'}">Eligible local</button><button type="button" data-20586-scope="shared" aria-pressed="${threadScope === 'shared'}">Shared</button><button type="button" data-20586-scope="local-ineligible" aria-pressed="${threadScope === 'local-ineligible'}">Ineligible local</button></div></fieldset></div><div class="desktop-20586-gate-results"><article><span>RESUME LOOKUP</span><b class="${resumeAllowed ? 'gate-pass' : 'gate-block'}">${resumeAllowed ? 'Attempted with child thread id' : 'Not attempted'}</b><small>${resumeReason}</small></article><article><span>TRANSCRIPT</span><b>${!desktopBuild20586CanInteract || desktopBuild20586WriterConflict ? 'Read only' : 'Interactive view'}</b><small>${desktopBuild20586WriterConflict ? 'Writer conflict independently forces read-only.' : 'Read-only when canInteract is false.'}</small></article><article><span>COMPOSER</span><b>${desktopBuild20586CanInteract && !desktopBuild20586WriterConflict ? 'Shown' : 'Hidden'}</b><small>${desktopBuild20586WriterConflict ? 'Hidden by writer conflict.' : 'Shown only when canInteract is true.'}</small></article></div><p class="desktop-20586-note">These controls illustrate inspected client conditions; they do not control a live conversation or prove server authorization.</p>${desktop20586SelectionMarkup(route)}</div>`}
    ${desktopBuild20770Markup()}
    <p class="desktop-20586-source">Checked members: <code>chatgpt-subagents-panel-ad8b93c61a12.js</code> · <code>local-conversation-subagents-panel-tab-70cb3c70c0c0.js</code> · <code>verify-descendant-2646968c60d7.js</code> · <code>subagents-8eb0ab1e1e0d.js</code> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-local-child-selection-validates-ancestry-and-rejects-stale-panel-updates-build-20586-2026-10-17" target="_blank" rel="noreferrer">evidence ledger ↗</a></p>
    <p class="desktop-20586-boundary">Module hashes match this build’s ASAR manifest. Static UI logic only: this diagram does not show a live session, network response, or rendered Desktop screenshot.</p>
  </section>`;
}

function desktopBuild20770Markup() {
  const isWork = desktop20770Surface === 'work';
  return `<section class="desktop-20770" aria-labelledby="desktop-20770-title">
    <header><div><span>INSTALLED DESKTOP · 26.1013.40934 / BUILD 20770</span><strong id="desktop-20770-title">Current bundle cross-check</strong></div><span>STATIC · PARTIAL COVERAGE</span></header>
    <div class="desktop-20770-tabs" role="group" aria-label="Choose build 20770 panel projection"><button type="button" data-20770-surface="work" aria-pressed="${isWork}">ChatGPT Work</button><button type="button" data-20770-surface="local" aria-pressed="${!isWork}">Local conversation</button></div>
    ${isWork ? `<ol class="desktop-20770-flow"><li><small>STATUS PROJECTION</small><b>Waiting / Working → Active</b><span>Done / Failed → Done</span></li><li><small>SELECTED DONE CHILD</small><b>Activation-scoped cache</b><code>conversationId · threadId · activationId</code><span>GET sends conversationId, threadId, limit=1</span></li><li><small>RESPONSE CHOICE</small><b>Prefer final_answer</b><span>Else latest non-empty agent message; unavailable response retries up to 2 times.</span></li></ol><p>Work panel and thumbnail share the query cache; thumbnail preview is capped at 1,000 characters.</p>` : `<ol class="desktop-20770-flow"><li><small>DESCENDANT SNAPSHOT</small><b>Parent → child list</b><span>Active rows capped at 4; Done rows at 10; waiting count shown separately.</span></li><li><small>SELECTED CHILD</small><b>Validate ancestry + current selection</b><span>Stale async results are discarded before the panel updates.</span></li><li><small>DETAIL SURFACE</small><b>Child transcript</b><span>Model/reasoning appears in the header; interaction is passed only for canInteract === true.</span></li></ol><p>Row preview is objective text truncated to 60 characters, then status summary; active children can fall back to “Working”.</p>`}
    <small class="desktop-20770-proof">Evidence: app.asar SHA-256 <code>5ddc4e48…09c10916ddb</code> · nine selected JS resources · zero parse failures · semantic graph capped at 18,000 nodes. No live panel or request was captured.</small>
  </section>`;
}

function desktop20586SelectionMarkup(route) {
  const steps = ['Walk ancestry', 'Repair missing link', 'Load child page', 'Apply panel update'];
  return `<section class="desktop-20586-selection" aria-labelledby="desktop-20586-selection-title">
    <div class="desktop-20586-gate-heading"><div><span class="desktop-20586-kicker">ASYNC CHILD SELECTION · LINEAGE + RACE GUARD</span><b id="desktop-20586-selection-title">A valid child route must still be the current selection</b></div><span class="desktop-20586-selection-outcome">${route.outcome}</span></div>
    <div class="desktop-20586-route-choices" role="group" aria-label="Select a child navigation scenario">${[['accepted','Valid parent chain'],['wrongHost','Wrong host'],['missingAncestor','Missing ancestor'],['staleSelection','Selection changed']].map(([id,label]) => `<button type="button" data-20586-route="${id}" aria-pressed="${desktopBuild20586Route === id}">${label}</button>`).join('')}</div>
    <div class="desktop-20586-route-rail" role="img" aria-label="${steps.map((step,i)=>`${step}: ${route.states[i]}`).join('; ')}">${steps.map((step,i)=>`<article class="${i === 0 || (desktopBuild20586Route === 'missingAncestor' && i === 1) || i === 3 ? 'route-emphasis' : ''}"><span>0${i+1}</span><b>${step}</b><small>${route.states[i]}</small></article>`).join('')}</div>
    <p class="desktop-20586-route-detail">${route.detail}</p><p class="desktop-20586-route-footnote">The lineage check walks parent IDs, rejects cycles and known host mismatches, and may hydrate missing ancestors without turns. Async results are applied only while the panel still requests that child.</p>
  </section>`;
}

function desktop20586FinalQueryMarkup() {
  return `<section class="desktop-20586-query-map" aria-label="Final response query identity, request, and retry behavior">
    <header><span>FINAL RESPONSE · THREE SEPARATE INPUT PATHS</span><small>Static query logic</small></header>
    <div class="desktop-20586-query-identity"><b>Cache key</b><code>final-response + conversationId + threadId + activationId</code><small>Activation-specific cache identity</small></div>
    <div class="desktop-20586-query-request"><b>GET request</b><code>/flora/subagent/thread/turns</code><small>conversationId · threadId · limit: 1</small><em>activationId is not sent</em></div>
    <div class="desktop-20586-query-retry"><div><b>Mount retry rule</b><small>Turn liveness changes this option only</small></div><div class="desktop-20586-switch" role="group" aria-label="Set current turn liveness"><button type="button" data-20586-turn-live="yes" aria-pressed="${desktopBuild20586TurnLive}">Turn active</button><button type="button" data-20586-turn-live="no" aria-pressed="${!desktopBuild20586TurnLive}">Turn ended</button></div><code>retryOnMount: ${!desktopBuild20586TurnLive}</code></div>
    <p>Changing turn liveness leaves the cache key and request unchanged. It only flips whether the query retries when mounted.</p>
  </section>`;
}

function desktopSubagentsMarkup() {
  const agents = [
    { id:'agent-a', name:'Index transcript', role:'Trace analyst', model:'Codex default', status:'active', showInlineActivity:true },
    { id:'agent-b', name:'Inspect renderer', role:'UI investigator', model:'Codex default', status:'done', showInlineActivity:true },
    { id:'agent-c', name:'Map event route', role:'Protocol analyst', model:'Codex default', status:desktopPanelStatus, showInlineActivity:desktopPanelInline, canInteract:desktopPanelCanInteract },
    { id:'agent-empty', name:'   ', role:null, model:null, status:'active', showInlineActivity:false },
  ];
  const named = agents.filter(agent => agent.name.trim().length > 0);
  const summaryAgents = named.filter(agent => agent.showInlineActivity);
  const detailRows = named.filter(agent => !agent.showInlineActivity);
  const working = summaryAgents.filter(agent => agent.status !== 'done');
  const done = summaryAgents.filter(agent => agent.status === 'done');
  const autoCollapse = !desktopCollapseHasInline && desktopCollapseAllDone;
  const selected = agents.find(agent => agent.id === desktopPanelSelected);
  const selectedRoute = desktopPanelSelected === 'summary' ? 'summary' : selected ? (selected.canInteract === false ? 'panel' : 'thread') : 'idle';
  const avatar = agent => `<span class="desktop-agent-avatar ${agent.status === 'done' ? 'is-done' : 'is-active'}" aria-label="${escapeHtml(agent.name)} · ${agent.status}">${escapeHtml(agent.name.slice(0,1))}</span>`;
  const pipeline = {
    membership: {
      label: '01 · MEMBERSHIP',
      title: 'Find child references',
      copy: 'The selector combines parent-turn collaboration items with known descendant/source-linked threads. Spawn receivers and started subAgentActivity records contribute child IDs; interacted activity is excluded.',
      output: 'Candidate child memberships → child identity and parent relationship checks.'
    },
    reconcile: {
      label: '02 · RECONCILE',
      title: 'Merge records without erasing uncertainty',
      copy: 'The row projection reads indexed parent items, cached child conversations/summaries, thread runtime status, child turn state, and discovery completeness. A partial scan keeps missing children unknown.',
      output: 'Latest parent reference + child/runtime evidence + completeness → derived row status and interaction hint.'
    },
    display: {
      label: '03 · DISPLAY',
      title: 'Split the derived records into two views',
      copy: 'Named background-agent records with showInlineActivity enter the compact summary; other named agents become detail rows. Unnamed records are filtered before either projection.',
      output: 'Derived backgroundAgents → compact summary / detail rows → selected-child route.'
    }
  };
  const selectedPipeline = pipeline[desktopPanelPipelineStage] ?? pipeline.membership;
  return `<section class="desktop-subagents" aria-labelledby="desktop-subagents-title">
    <div class="desktop-subagents-head"><div><span class="desktop-subagents-eyebrow">INSTALLED CODEX · STATIC UI TRACE</span><h5 id="desktop-subagents-title">One child set, two panel projections</h5></div><span class="desktop-subagents-version">26.1007.71326</span></div>
    <p class="desktop-subagents-intro">A local bundle snapshot shows named background agents split by <code>showInlineActivity</code>. Change the sample child below to see which projection receives it.</p>
    <section class="desktop-panel-pipeline" aria-labelledby="desktop-panel-pipeline-title">
      <div class="desktop-panel-pipeline-head"><div><span>SELECTOR → ROWS → PANEL</span><strong id="desktop-panel-pipeline-title">Where do the panel's child rows come from?</strong></div><span>STATIC DATA FLOW</span></div>
      <div class="desktop-panel-pipeline-steps" role="group" aria-label="Inspect the Subagents panel data flow">
        ${Object.entries(pipeline).map(([key,step]) => `<button type="button" data-panel-pipeline="${key}" aria-pressed="${desktopPanelPipelineStage === key}"><small>${step.label}</small><strong>${step.title}</strong></button>`).join('')}
      </div>
      <div class="desktop-panel-pipeline-detail" data-stage="${desktopPanelPipelineStage}" aria-live="polite"><div class="desktop-pipeline-inputs"><article><span>MEMBERSHIP INPUTS</span><strong>Parent item index</strong><small><code>spawnAgent</code> receivers · started activity IDs</small></article><i aria-hidden="true">+</i><article><span>DESCENDANT INPUTS</span><strong>Thread snapshot</strong><small>Indexed descendants · source-linked threads · cached child records</small></article><i aria-hidden="true">→</i><article class="desktop-pipeline-output"><span>${selectedPipeline.label}</span><strong>${selectedPipeline.title}</strong><small>${selectedPipeline.copy}</small></article></div><p><b>Stage output</b><span>${selectedPipeline.output}</span></p></div>
      <div class="desktop-panel-pipeline-sources"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#the-local-row-selector-derives-caninteract-from-parent-thread-collaboration-items" target="_blank" rel="noreferrer">parent-item selector evidence</a><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#renderer-row-status-derivation-in-the-subagents-panel" target="_blank" rel="noreferrer">status projection evidence</a><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#descendant-discovery-is-a-bounded-client-side-reconciliation-workflow" target="_blank" rel="noreferrer">discovery and completeness</a></div>
    </section>
    <div class="desktop-subagents-source" aria-label="Illustrative background agent records">
      <div class="desktop-subagents-source-label"><span>INPUT</span><strong>backgroundAgents</strong><small>Illustrative records · not captured session data</small></div>
      <article class="desktop-agent-record ${desktopPanelInline ? 'is-routed-summary' : 'is-routed-row'}"><span class="desktop-record-icon">A</span><div><strong>Map event route</strong><small>Protocol analyst · ${desktopPanelStatus === 'active' ? 'active' : 'done'} · canInteract ${desktopPanelCanInteract}</small></div><span class="desktop-route-pill">${desktopPanelInline ? 'INLINE ACTIVITY' : 'PANEL ROW'}</span></article>
      <article class="desktop-agent-record is-routed-summary"><span class="desktop-record-icon">I</span><div><strong>Index transcript</strong><small>Trace analyst · active</small></div><span class="desktop-route-pill">INLINE ACTIVITY</span></article>
      <article class="desktop-agent-record is-routed-summary"><span class="desktop-record-icon">R</span><div><strong>Inspect renderer</strong><small>UI investigator · done</small></div><span class="desktop-route-pill">INLINE ACTIVITY</span></article>
      <article class="desktop-agent-record is-filtered"><span class="desktop-record-icon">∅</span><div><strong>Unnamed record</strong><small>displayName.trim().length === 0</small></div><span class="desktop-route-pill">FILTERED OUT</span></article>
    </div>
    <div class="desktop-projection-connectors" aria-hidden="true"><span>showInlineActivity = true <i>↓</i></span><span>showInlineActivity = false <i>↓</i></span></div>
    <div class="desktop-subagents-projections">
      <article class="desktop-projection-card summary-projection">
        <div class="desktop-projection-title"><span class="desktop-projection-icon">◉</span><div><span>COMPACT SUMMARY</span><strong>Collapsed subagents row</strong></div><small>${summaryAgents.length} in group</small></div>
        <button class="desktop-summary-button" type="button" data-native-panel-summary aria-label="Illustrative open subagents overview">
          <span class="desktop-avatar-stack">${summaryAgents.slice(0,4).map(avatar).join('')}</span>
          <span class="desktop-summary-copy"><strong>${working.length ? `${working.length} working` : `${done.length} done`}</strong>${working.length && done.length ? `<small>${done.length} done</small>` : ''}</span><span class="desktop-open-mark">↗</span>
        </button>
        <p>Clicking this row invokes <code>onOpenSubagentsPanel</code> when supplied. Up to four status-sorted child avatars are shown.</p>
      </article>
      <article class="desktop-projection-card rows-projection">
        <div class="desktop-projection-title"><span class="desktop-projection-icon">☷</span><div><span>DETAIL ROWS</span><strong>Other named agents</strong></div><small>${detailRows.length} in list</small></div>
        <div class="desktop-agent-rows">${detailRows.length ? detailRows.map(agent => `<button class="desktop-agent-row ${desktopPanelSelected === agent.id ? 'is-selected' : ''}" type="button" data-native-panel-select="${agent.id}"><span class="desktop-agent-avatar ${agent.status === 'done' ? 'is-done' : 'is-active'}">${escapeHtml(agent.name.slice(0,1))}</span><span class="desktop-agent-row-copy"><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.role)} · ${escapeHtml(agent.model)}</small></span>${agent.status === 'active' ? '<span class="desktop-working-indicator"><i></i>is working</span>' : ''}<span class="desktop-row-open">↗</span></button>`).join('') : '<div class="desktop-empty-rows">No named agents in this projection. Turn inline activity off to place the sample in this list.</div>'}</div>
        <p>Clicking a row calls <code>onOpenBackgroundAgent(agent)</code>. The active row gets an “is working” label; other statuses can remain unlabeled.</p>
      </article>
    </div>
    <div class="desktop-projection-controls"><div><span>ILLUSTRATIVE ROUTE CONTROLS</span><strong>Map event route</strong></div><div class="desktop-control-group" role="group" aria-label="Sample agent status"><button type="button" data-native-panel-status="active" aria-pressed="${desktopPanelStatus === 'active'}">active</button><button type="button" data-native-panel-status="done" aria-pressed="${desktopPanelStatus === 'done'}">done</button></div><div class="desktop-control-group" role="group" aria-label="Parent-thread interactivity evidence"><button type="button" data-native-panel-interact="true" aria-pressed="${desktopPanelCanInteract}">canInteract true</button><button type="button" data-native-panel-interact="false" aria-pressed="${!desktopPanelCanInteract}">false</button></div><label class="desktop-inline-toggle"><input type="checkbox" data-native-panel-inline ${desktopPanelInline ? 'checked' : ''}><span>showInlineActivity</span></label></div>
    <div class="desktop-collapse-rule" data-result="${autoCollapse ? 'collapsed' : 'expanded'}" aria-labelledby="desktop-collapse-title">
      <div class="desktop-collapse-heading"><div><span>SECTION STATE · STATIC PREDICATE</span><strong id="desktop-collapse-title">When does the Subagents section auto-collapse?</strong></div><b>${autoCollapse ? 'AUTO-COLLAPSE' : 'STAYS EXPANDED'}</b></div>
      <div class="desktop-collapse-controls">
        <div class="desktop-collapse-condition"><span>01 · INLINE ACTIVITY</span><strong>Any named child passes showInlineActivity?</strong><div role="group" aria-label="Whether an inline-activity child exists"><button type="button" data-collapse-inline="true" aria-pressed="${desktopCollapseHasInline}">Yes</button><button type="button" data-collapse-inline="false" aria-pressed="${!desktopCollapseHasInline}">No</button></div></div>
        <i aria-hidden="true">AND</i>
        <div class="desktop-collapse-condition"><span>02 · TERMINAL STATUS</span><strong>Every background agent is done?</strong><div role="group" aria-label="Whether every background agent is done"><button type="button" data-collapse-done="true" aria-pressed="${desktopCollapseAllDone}">Yes</button><button type="button" data-collapse-done="false" aria-pressed="${!desktopCollapseAllDone}">No</button></div></div>
        <i aria-hidden="true">→</i>
        <div class="desktop-collapse-outcome"><span>RESULT</span><strong>${autoCollapse ? 'Collapse section' : 'Keep section open'}</strong><small>${desktopCollapseHasInline ? 'Inline child present: collapse predicate fails.' : desktopCollapseAllDone ? 'No inline child and all agents done: predicate passes.' : 'At least one agent is not done: predicate fails.'}</small></div>
      </div>
      <p>This is the section auto-collapse predicate from the installed renderer. The two controls are independent illustrative aggregate inputs; they do not read a live conversation.</p>
    </div>
    <div class="desktop-panel-selection" aria-live="polite"><span>${selected ? (selectedRoute === 'panel' ? 'SELECTED CHILD · PANEL ROUTE' : 'SELECTED CHILD · THREAD ROUTE') : desktopPanelSelected === 'summary' ? 'SUMMARY CLICK PATH' : 'CLICK PATH'}</span><strong>${selected ? `Selected “${escapeHtml(selected.name)}” → ${selectedRoute === 'panel' ? 'parent Subagents panel with this child selected' : 'validated local child thread'}` : desktopPanelSelected === 'summary' ? 'Compact summary → onOpenSubagentsPanel → Subagents overview.' : 'Choose the summary or a named child row to reveal the next UI route.'}</strong></div>
    <div class="desktop-open-route" data-route="${selectedRoute}" aria-live="polite">
      ${selectedRoute === 'summary' ? `<div class="desktop-open-route-head"><span>OVERVIEW ROUTE</span><strong>Summary click opens the parent’s Subagents overview</strong></div><div class="desktop-route-steps"><article><small>01 · CLICK</small><b>Compact summary row</b><span>onOpenSubagentsPanel</span></article><i aria-hidden="true">→</i><article><small>02 · DESTINATION</small><b>Parent Subagents overview</b><span>Child selection happens in a separate step.</span></article></div>` : selectedRoute === 'idle' ? `<div class="desktop-route-idle"><span>↗</span><div><b>Two click destinations</b><small>Summary opens the overview; a child row routes according to its parent-thread evidence.</small></div></div>` : selectedRoute === 'thread' ? `<div class="desktop-open-route-head"><span>CANINTERACT = TRUE · LOCAL THREAD ROUTE</span><strong>Resolve the child before mounting its conversation</strong></div><div class="desktop-route-steps"><article><small>01 · LOOK UP</small><b>Indexed child or parent history</b><span>Find the matching spawn/activity reference.</span></article><i aria-hidden="true">→</i><article><small>02 · VALIDATE</small><b>Parent ancestry + first page</b><span>Check the requested parent, then require child first-page readiness.</span></article><i aria-hidden="true">→</i><article><small>03 · OPEN</small><b>Durable local thread tab</b><span>Composer and resume can be enabled, subject to writer conflict.</span></article></div>` : `<div class="desktop-open-route-head"><span>CANINTERACT = FALSE · EMBEDDED PANEL ROUTE</span><strong>Keep the selected child inside the parent’s Subagents panel</strong></div><div class="desktop-route-steps"><article><small>01 · SELECT</small><b>Activity-only or non-interactive child</b><span>Open the parent panel with this child selected.</span></article><i aria-hidden="true">→</i><article><small>02 · CHECK</small><b>Verify descendant relationship</b><span>Missing ancestry can be hydrated without loading turns.</span></article><i aria-hidden="true">→</i><article><small>03 · PROJECT</small><b>Embedded child transcript</b><span>Composer stays hidden; the interactive resume hook is gated off.</span></article></div>`}
    </div>
    ${selectedRoute === 'thread' ? `<div class="desktop-thread-gates" aria-live="polite"><div class="desktop-thread-gates-title"><span>THREAD RENDERER GATES</span><small>static client logic</small></div><div class="desktop-projection-controls gate-controls"><div class="desktop-control-group" role="group" aria-label="shouldResume input"><button type="button" data-native-panel-resume="true" aria-pressed="${desktopPanelShouldResume}">shouldResume true</button><button type="button" data-native-panel-resume="false" aria-pressed="${!desktopPanelShouldResume}">false</button></div><div class="desktop-control-group" role="group" aria-label="Writer conflict state"><button type="button" data-native-panel-conflict="false" aria-pressed="${!desktopPanelWriterConflict}">no conflict</button><button type="button" data-native-panel-conflict="true" aria-pressed="${desktopPanelWriterConflict}">writer conflict</button></div></div><div class="desktop-gate-matrix"><article><span>RESUME HOOK INPUT</span><strong class="${desktopPanelShouldResume && desktopPanelCanInteract ? 'gate-on' : 'gate-off'}">${desktopPanelShouldResume && desktopPanelCanInteract ? 'child ID passed' : 'null · hook gated'}</strong><small>shouldResume ∧ canInteract</small></article><article><span>COMPOSER</span><strong class="${desktopPanelCanInteract && !desktopPanelWriterConflict ? 'gate-on' : 'gate-off'}">${desktopPanelCanInteract && !desktopPanelWriterConflict ? 'shown' : 'hidden'}</strong><small>canInteract ∧ ¬writerConflict</small></article><article><span>READ ONLY</span><strong class="${!desktopPanelCanInteract || desktopPanelWriterConflict ? 'gate-warn' : 'gate-on'}">${!desktopPanelCanInteract || desktopPanelWriterConflict ? 'yes' : 'no'}</strong><small>¬canInteract ∨ writerConflict</small></article><article><span>CONFLICT UI</span><strong class="${desktopPanelWriterConflict ? 'gate-warn' : 'gate-neutral'}">${desktopPanelWriterConflict ? 'fork conflict view' : 'not rendered'}</strong><small>writer conflict branch</small></article></div><p>“Child ID passed” means the resume hook is eligible to run; it does not prove a resume request succeeds. The conflict view is a UI branch, not proof that forking succeeds.</p></div>` : ''}
    <section class="desktop-import-map" aria-labelledby="desktop-import-map-title">
      <div class="desktop-import-map-heading"><div><span>PACKAGED MODULES · STATIC IMPORTS</span><strong id="desktop-import-map-title">Local and Work panels use different detail modules</strong></div><div class="desktop-control-group" role="group" aria-label="Highlight module route"><button type="button" data-desktop-resource="local" aria-pressed="${desktopResourceFocus === 'local'}">Local</button><button type="button" data-desktop-resource="work" aria-pressed="${desktopResourceFocus === 'work'}">Work</button></div></div>
      <div class="desktop-import-lanes" data-focus="${desktopResourceFocus}">
        <article class="desktop-import-lane ${desktopResourceFocus === 'local' ? 'is-focused' : ''}"><div class="desktop-import-origin"><span>LOCAL PANEL TAB</span><code>local-conversation-subagents-panel-tab-b201494eb46e.js</code></div><i aria-hidden="true">imports</i><div class="desktop-import-targets"><code class="shared-node">app-shared-8340f229c2b3.js</code><code class="shared-node">app-initial-1ab6fbe93c4f.js</code><code>app-primary-2a670e99a60c.js</code><code>local-conversation-thread-269c4ee9ddf0.js</code><code class="shared-node">subagent-panel-43b97943968e.js</code></div></article>
        <article class="desktop-import-lane ${desktopResourceFocus === 'work' ? 'is-focused' : ''}"><div class="desktop-import-origin"><span>WORK PANEL</span><code>chatgpt-subagents-panel-7011b5d422c8.js</code></div><i aria-hidden="true">imports</i><div class="desktop-import-targets"><code class="shared-node">app-shared-8340f229c2b3.js</code><code class="shared-node">app-initial-1ab6fbe93c4f.js</code><code>chatgpt-markdown-view-e4d3cc82a757.js</code><code class="shared-node">subagent-panel-43b97943968e.js</code><code>chatgpt-subagent-final-response-query-de38dfd11904.js</code></div></article>
      </div>
      <p class="desktop-import-boundary">Each lane shows direct bundler imports only. Shared names are bundled dependencies; these edges do not prove which route executed, what the server returned, or what the UI rendered.</p>
      <p class="desktop-import-source"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-current-installed-bundle-import-graph-from-rea-2026-10-16" target="_blank" rel="noreferrer">REA import evidence · Desktop 26.1007.71326</a></p>
    </section>
    ${desktopBuild20586Markup()}
    ${panelPersistenceMarkup()}
    <p class="desktop-subagents-boundary">Static extraction from the installed app bundle; example records and controls are illustrative. <code>canInteract</code> describes client routing and composer/resume UI gates, not server authorization or current runtime status. This does not capture a live Desktop session, prove a React commit or visible paint, or represent the Lab’s CLI process tree.</p>
    <p class="desktop-subagents-source-link"><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#local-desktop-panel-entry-point" target="_blank" rel="noreferrer">Panel entry and child routing</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-26100771326-selected-child-panel-path" target="_blank" rel="noreferrer">canInteract derivation and UI gates</a> · <code>local-conversation-thread-269c4ee9ddf0.js</code> · chars 30,957–40,247 · REA Evidence <code>ev_9a2e1d42897d8f73d61bea38956116d402057de54c34849710d94e1956ca3dde</code></p>
  </section>`;
}

const embeddedProbeStages = [
  {
    title: 'Child thread exists',
    evidence: 'A read-only SQLite inspection found one parent–child spawn edge, a child thread row, and a child rollout.',
    boundary: 'Confirms creation and stored child work. The retained summary projection alone did not expose a spawn tool item.'
  },
  {
    title: 'Child writes its result',
    evidence: 'The child rollout contains the requested unique marker.',
    boundary: 'The child-side record does not by itself prove that the parent received the result.'
  },
  {
    title: 'Parent wait returns',
    evidence: 'The parent rollout records wait_agent returning with timed_out: false.',
    boundary: 'The capture does not identify which event woke the wait.'
  },
  {
    title: 'Result enters parent rollout',
    evidence: 'After the wait output, the parent rollout records a typed AgentMessage containing the same marker.',
    boundary: 'This proves recorded delivery in this run, not model interpretation or the serialized request.'
  },
  {
    title: 'Parent turn completes',
    evidence: 'The parent records task_complete after the AgentMessage.',
    boundary: 'The experiment used the embedded CLI; it did not capture the Desktop conversation host or visible UI.'
  }
];

function embeddedProbeMarkup() {
  const step = Math.max(0, Math.min(embeddedProbeStages.length - 1, embeddedProbeStep));
  const stage = embeddedProbeStages[step];
  const event = (index, label, detail) => `<button type="button" class="probe-node ${index === step ? 'current' : index < step ? 'past' : 'future'}" data-probe-step="${index}" aria-label="Step ${index + 1}: ${escapeHtml(label)}" aria-current="${index === step ? 'step' : 'false'}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></button>`;
  return `<section class="embedded-probe" aria-labelledby="embedded-probe-title" data-step="${step}">
    <div class="probe-heading"><div><span>EMBEDDED CLI · CAPTURED RUNTIME EVIDENCE</span><h5 id="embedded-probe-title">A child result reaches the parent rollout</h5></div><span class="probe-build">0.162.0-alpha.17.2</span></div>
    <p class="probe-intro">Replay the verified order from one isolated V2 run. Select a checkpoint to see which records exist at that point.</p>
    <div class="probe-lanes" aria-label="Recorded parent and child event lanes">
      <div class="probe-lane-label"><span class="probe-avatar parent">P</span><span><b>PARENT</b><small>thread + rollout</small></span></div>
      <div class="probe-lane-events">${event(0, 'spawn edge + child row', 'SQLite')}<i aria-hidden="true">· · ·</i>${event(2, 'wait_agent returns', 'not timed out')}<i aria-hidden="true">· · ·</i>${event(3, 'AgentMessage', 'same marker')}<i aria-hidden="true">· · ·</i>${event(4, 'task_complete', 'turn ends')}</div>
      <div class="probe-lane-label"><span class="probe-avatar child">C</span><span><b>CHILD</b><small>thread + rollout</small></span></div>
      <div class="probe-lane-events child-events"><i aria-hidden="true">· · ·</i>${event(1, 'marker in child rollout', 'child result')}<i aria-hidden="true">· · ·</i><span class="probe-route" aria-label="The marker is later recorded in the parent">↗ result recorded in parent</span></div>
    </div>
    <div class="probe-readout" aria-live="polite"><span class="probe-readout-index">${String(step + 1).padStart(2, '0')} / 05</span><div><strong>${escapeHtml(stage.title)}</strong><p>${escapeHtml(stage.evidence)}</p><small>${escapeHtml(stage.boundary)}</small></div></div>
    <div class="probe-controls"><button type="button" data-probe-step="${Math.max(0, step - 1)}" ${step === 0 ? 'disabled' : ''} aria-label="Previous checkpoint">←</button><input type="range" min="0" max="4" step="1" value="${step}" aria-label="Probe checkpoint" data-probe-range><button type="button" data-probe-step="${Math.min(4, step + 1)}" ${step === 4 ? 'disabled' : ''} aria-label="Next checkpoint">→</button><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#embedded-desktop-cli-v2-spawn-and-wait-probe-2026-10-16" target="_blank" rel="noreferrer">Open sanitized probe evidence ↗</a></div>
    <p class="probe-caveat"><b>Not shown:</b> exact wake cause, serialized model request, model interpretation, Desktop host events, or a live UI capture.</p>
  </section>`;
}

function selectEmbeddedProbeStep(value) {
  const next = Number.parseInt(value, 10);
  embeddedProbeStep = Number.isFinite(next) ? Math.max(0, Math.min(4, next)) : 0;
  const probe = $('.embedded-probe');
  if (probe) probe.outerHTML = embeddedProbeMarkup();
}

const cliV1ProbeStages = [
  { title: 'Parent creates one child', lane: 'PARENT · rollout ordinal 17', event: 'spawn_agent completed', detail: 'The receiver identifies child thread 01a145e7-03fd-7cb2-b0f6-d6acbe0d8caa.', evidence: 'The parent rollout records a completed spawn_agent call and returns the child thread ID.', boundary: 'A successful spawn receipt establishes child admission for this call; the linked child rollout confirms the child session.' },
  { title: 'Child runs under V1', lane: 'CHILD · session metadata', event: 'multi_agent_version: v1', detail: 'The child records its parent and thread_spawn source, then completes.', evidence: 'The child rollout links back to the parent and records multi_agent_version: v1 in session metadata and turn context.', boundary: 'This resolves the protocol version for this CLI run; it does not reveal the Desktop host controller or its UI path.' },
  { title: 'Parent waits for that child', lane: 'PARENT · rollout ordinal 23', event: 'wait completed', detail: 'The wait targets the same child thread and returns completed.', evidence: 'The parent rollout records a successful wait for the same child ID after the spawn call.', boundary: 'The event sequence shows the wait result; it does not identify the scheduler wake cause.' },
  { title: 'Parent returns the result', lane: 'PARENT · final response', event: 'marker + completed', detail: 'CODEX-SUBAGENT-PROBE-1017', evidence: 'The parent final response includes the unique marker from the controlled child task and the parent turn completes.', boundary: 'This is a standalone embedded CLI exec run, not a captured Desktop conversation or rendered Subagents panel.' }
];

function cliV1ProbeMarkup() {
  const step = Math.max(0, Math.min(cliV1ProbeStages.length - 1, cliV1ProbeStep));
  const stage = cliV1ProbeStages[step];
  return `<section class="cli-v1-probe" aria-labelledby="cli-v1-probe-title" data-step="${step}">
    <header><div><span>CAPTURED CLI RUN · V1 CONFIRMED FROM BOTH ROLLOUTS</span><h5 id="cli-v1-probe-title">One child, linked from spawn through parent result</h5></div><b>0.163.0-alpha.10.2</b></header>
    <p class="cli-v1-probe-intro">Replay the verified event chain. The parent and child rollout records agree on thread identity and the resolved protocol version.</p>
    <div class="cli-v1-probe-track" role="group" aria-label="Parent and child rollout evidence checkpoints">${cliV1ProbeStages.map((item, index) => `<button type="button" class="cli-v1-probe-node ${index === step ? 'current' : index < step ? 'past' : 'future'}" data-cli-v1-step="${index}" aria-current="${index === step ? 'step' : 'false'}"><span class="cli-v1-probe-index">0${index + 1}</span><small>${escapeHtml(item.lane)}</small><strong>${escapeHtml(item.event)}</strong><span>${escapeHtml(item.detail)}</span></button>${index < cliV1ProbeStages.length - 1 ? '<i aria-hidden="true">→</i>' : ''}`).join('')}</div>
    <div class="cli-v1-probe-readout" aria-live="polite"><span>${String(step + 1).padStart(2, '0')} / 04</span><div><strong>${escapeHtml(stage.title)}</strong><p>${escapeHtml(stage.evidence)}</p><small>${escapeHtml(stage.boundary)}</small></div></div>
    <div class="cli-v1-probe-controls"><button type="button" data-cli-v1-step="${Math.max(0, step - 1)}" ${step === 0 ? 'disabled' : ''} aria-label="Previous V1 evidence checkpoint">←</button><input type="range" min="0" max="3" step="1" value="${step}" aria-label="Select V1 probe checkpoint" data-cli-v1-range><button type="button" data-cli-v1-step="${Math.min(3, step + 1)}" ${step === 3 ? 'disabled' : ''} aria-label="Next V1 evidence checkpoint">→</button><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-cli-probe-rollouts-confirm-the-resolved-v1-session-2026-10-17" target="_blank" rel="noreferrer">Open rollout evidence ↗</a></div>
    <p class="cli-v1-probe-boundary"><b>Evidence boundary:</b> standalone CLI runtime with local parent/child rollout correlation. It does not capture Desktop host controller selection, panel events, or visible rendering.</p>
  </section>`;
}

function selectCliV1ProbeStep(value) {
  const next = Number.parseInt(value, 10);
  cliV1ProbeStep = Number.isFinite(next) ? Math.max(0, Math.min(cliV1ProbeStages.length - 1, next)) : 0;
  const probe = $('.cli-v1-probe');
  if (probe) probe.outerHTML = cliV1ProbeMarkup();
}

function renderInspector() {
  const task = taskById(selectedTaskId);
  renderMechanismExplorer();
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
    </header>
    <nav class="inspector-nav" aria-label="Jump to task details">
      <div class="inspector-current"><span>${escapeHtml(task.parentId ? 'CHILD AGENT' : 'ROOT AGENT')} · ${escapeHtml(task.status.replaceAll('_',' ').toUpperCase())}</span><strong title="${escapeHtml(task.prompt)}">${escapeHtml(task.prompt)}</strong></div>
      <div class="inspector-nav-links"><button type="button" data-inspector-target="context">Context</button><button type="button" data-inspector-target="links">Task links</button><button type="button" data-inspector-target="agent-mailbox">Mailbox</button><button type="button" data-inspector-target="output">Output</button><button type="button" data-inspector-target="activity">Activity</button></div>
    </nav>
    <section class="evidence-map" aria-labelledby="evidence-map-title">
      <div class="evidence-map-heading"><div><span>HOW TO READ THESE TRACES</span><h4 id="evidence-map-title">Four evidence lenses</h4></div><small>Each lens answers a different question</small></div>
      <div class="evidence-lenses" role="group" aria-label="Evidence sources and their limits">
        <button type="button" class="evidence-lens cli-lens" data-inspector-target="native-cli-trace-title"><span class="evidence-index">01</span><span class="evidence-lens-copy"><strong>Captured CLI run</strong><small>Shows serialized events and reported status for that run.</small><b>Does not expose hidden model context.</b></span><i aria-hidden="true">↗</i></button>
        <button type="button" class="evidence-lens source-lens" data-inspector-target="suspension-map-title"><span class="evidence-index">02</span><span class="evidence-lens-copy"><strong>Public source</strong><small>Shows implemented contracts and control flow at a pinned revision.</small><b>Does not prove a live path was taken.</b></span><i aria-hidden="true">↗</i></button>
        <button type="button" class="evidence-lens desktop-lens" data-inspector-target="desktop-subagents-title"><span class="evidence-index">03</span><span class="evidence-lens-copy"><strong>Installed Desktop bundle</strong><small>Shows packaged UI and host code paths inspected locally.</small><b>Static inspection is not a runtime capture.</b></span><i aria-hidden="true">↗</i></button>
        <article class="evidence-lens demo-lens"><span class="evidence-index">04</span><span class="evidence-lens-copy"><strong>Lab sample data</strong><small>Demonstrates task trees, timelines, inboxes, and result routes.</small><b>${isSample ? 'This selected task is illustrative.' : 'Sample records are labeled in the Inspector.'}</b></span><i aria-hidden="true">◇</i></article>
      </div>
    </section>
    <details class="source-map-index">
        <summary><span class="source-map-index-mark" aria-hidden="true">⌕</span><span class="source-map-index-title">Source map index</span><span class="source-map-index-count" data-map-count>24 / 24 MAPS</span><span class="source-map-index-hint">Search by mechanism or question</span></summary>
      <div class="source-map-groups">
        <section class="source-map-group" aria-label="Orchestration and lifecycle maps"><h5>ORCHESTRATION · LIFECYCLE</h5><div>
          <button type="button" data-inspector-target="spawn-config-title">Child config</button><button type="button" data-inspector-target="spawn-protocol-title">Spawn ordering</button><button type="button" data-inspector-target="capacity-race-title">Capacity race</button><button type="button" data-inspector-target="admission-map-title">Execution admission</button><button type="button" data-inspector-target="residency-map-title">Runtime residency</button><button type="button" data-inspector-target="suspension-map-title">Root suspension</button><button type="button" data-inspector-target="interrupt-close-title">Stop and close</button><button type="button" data-inspector-target="desktop-exit-flush-title">Desktop exit flush</button><button type="button" data-inspector-target="terminal-lifecycle-title">Terminal signals</button><button type="button" data-inspector-target="wait-scope-title">Wait scope</button>
        </div></section>
        <section class="source-map-group" aria-label="Message and result maps"><h5>MESSAGES · RESULTS</h5><div>
          <button type="button" data-inspector-target="delivery-flow-title">Delivery flow</button><button type="button" data-inspector-target="mailbox-timing-title">Mailbox timing</button><button type="button" data-inspector-target="board-write-title">Message board</button><button type="button" data-inspector-target="tool-exposure-title">Tool exposure</button><button type="button" data-inspector-target="request-wire-title">Request payload</button><button type="button" data-inspector-target="completion-route-title">Result routing</button><button type="button" data-inspector-target="completion-payload-title">Output consumers</button><button type="button" data-inspector-target="parent-result-state-title">Parent wake boundary</button><button type="button" data-inspector-target="native-cli-trace-title">CLI observation</button>
        </div></section>
        <section class="source-map-group" aria-label="Desktop interface maps"><h5>DESKTOP · RENDERING</h5><div>
          <button type="button" data-inspector-target="topology-map-title">Panel topology</button><button type="button" data-inspector-target="history-gate-title">History gate</button><button type="button" data-inspector-target="desktop-subagents-title">Subagents panel</button><button type="button" data-inspector-target="fidelity-title">Activity forwarding</button><button type="button" data-inspector-target="renderer-delta-title">Transcript updates</button>
        </div></section>
      </div>
      <label class="source-map-search"><span aria-hidden="true">⌕</span><input type="search" data-map-search aria-label="Search source maps" placeholder="Try: shutdown, message, Desktop…" autocomplete="off"><kbd>ESC</kbd></label>
      <p class="source-map-search-status" data-map-search-status aria-live="polite">Showing all 24 source-linked diagrams.</p>
    </details>
    <section class="mechanism-overview" aria-labelledby="mechanism-overview-title">
      <div class="mechanism-overview-heading"><div><span>MECHANISM MAP · SOURCE SYNTHESIS</span><h4 id="mechanism-overview-title">How a child agent fits into the parent thread</h4></div><a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/session/turn_suspension.rs" target="_blank" rel="noreferrer">root handoff check · 4eb4a65</a></div>
      <div class="mechanism-overview-flow" aria-label="Source-backed subagent lifecycle overview">
        <button type="button" data-inspector-target="context"><span>01 · PREPARE</span><strong>Context + policy</strong><small>Resolve the child snapshot, model, role and runtime authority.</small><b>Inspect input</b></button>
        <i aria-hidden="true">→</i>
        <button type="button" data-inspector-target="links"><span>02 · SPAWN</span><strong>New child thread</strong><small>V1 and V2 use different call records and creation paths.</small><b>Inspect ancestry</b></button>
        <i aria-hidden="true">→</i>
        <button type="button" data-inspector-target="agent-mailbox"><span>03 · COORDINATE</span><strong>Turns + messages</strong><small>Queueing, waking, waiting and child execution have separate rules.</small><b>Inspect mailbox</b></button>
        <i aria-hidden="true">→</i>
        <button type="button" data-inspector-target="activity"><span>04 · RETURN</span><strong>Status + result</strong><small>Terminal status, activity and parent result are distinct signals.</small><b>Inspect activity</b></button>
      </div>
      ${agentControlExplorerMarkup()}
      ${nativeSpawnTraceMarkup()}
      ${standaloneStaticSpawnTraceMarkup()}
      ${appServerProjectionMarkup()}
      <div class="parallel-lifecycle" aria-label="Parent and child lifecycle after spawn">
        <div class="parallel-lifecycle-heading"><span>AFTER SPAWN · PARALLEL THREADS</span><small>Spawn receipt does not wait for child completion</small></div>
        <div class="parallel-lifecycle-scroll">
          <svg class="parallel-lifecycle-svg" viewBox="0 0 920 174" role="img" aria-labelledby="parallel-lifecycle-title parallel-lifecycle-description">
            <title id="parallel-lifecycle-title">Parent and child run on parallel timelines</title>
            <desc id="parallel-lifecycle-description">The spawn call creates a child thread and returns after its initial input is accepted. The parent may continue or wait while the child runs. At completion, terminal status, activity, and a queued result follow separate paths back toward the parent.</desc>
            <defs><marker id="parallel-arrow-blue" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#8fb6ff" stroke-width="1.3"/></marker><marker id="parallel-arrow-gold" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#d7b46e" stroke-width="1.3"/></marker></defs>
            <text class="parallel-lane-label" x="16" y="52">PARENT</text><text class="parallel-lane-label" x="16" y="132">CHILD</text>
            <path class="parallel-lane-rule" d="M112 48H885M112 128H885"/>
            <rect class="parallel-event parent-event" x="145" y="29" width="142" height="38" rx="8"/><text class="parallel-event-kicker" x="157" y="44">SPAWN RETURNS</text><text class="parallel-event-name" x="157" y="58">input accepted</text>
            <rect class="parallel-event parent-event" x="341" y="29" width="197" height="38" rx="8"/><text class="parallel-event-kicker" x="353" y="44">PARENT TURN</text><text class="parallel-event-name" x="353" y="58">continues · or waits</text>
            <rect class="parallel-event inbox-event" x="728" y="29" width="156" height="38" rx="8"/><text class="parallel-event-kicker" x="740" y="44">PARENT MAILBOX</text><text class="parallel-event-name" x="740" y="58">result queued</text>
            <rect class="parallel-event child-event" x="341" y="109" width="197" height="38" rx="8"/><text class="parallel-event-kicker" x="353" y="124">CHILD THREAD</text><text class="parallel-event-name" x="353" y="138">independent turn runs</text>
            <rect class="parallel-event child-event" x="580" y="109" width="124" height="38" rx="8"/><text class="parallel-event-kicker" x="592" y="124">TERMINAL</text><text class="parallel-event-name" x="592" y="138">outcome</text>
            <path class="parallel-spawn-link" d="M216 67V128H334" marker-end="url(#parallel-arrow-blue)"/><path class="parallel-thread-link" d="M538 128H573" marker-end="url(#parallel-arrow-blue)"/>
            <path class="parallel-return-link activity-return" d="M642 108C642 83 615 75 586 67" marker-end="url(#parallel-arrow-blue)"/><path class="parallel-return-link result-return" d="M704 128C756 112 806 96 806 67" marker-end="url(#parallel-arrow-gold)"/>
            <text class="parallel-route-label activity-label" x="566" y="82">activity</text><text class="parallel-route-label result-label" x="776" y="98">AgentMessage · QueueOnly</text>
          </svg>
        </div>
        <div class="parallel-lifecycle-foot"><span><i class="parallel-dot activity-dot"></i>Terminal activity reports lifecycle</span><span><i class="parallel-dot result-dot"></i>Result message enters the parent mailbox</span><button type="button" data-inspector-target="agent-mailbox">Explore delivery states ↓</button></div>
      </div>
      ${embeddedProbeMarkup()}
      ${cliV1ProbeMarkup()}
      <div class="upstream-refresh" aria-label="Latest upstream changes and subagent scope">
        <div class="upstream-refresh-heading"><span>UPSTREAM DELTA · 97EBF2D → 9C84E89</span><b>BOUNDED SOURCE DIFF</b></div>
        <div class="upstream-refresh-grid">
          <a href="https://github.com/openai/codex/compare/97ebf2d94d62e2ff2045f3ea17b6e11eae9a21fb...9c84e89ce0893a552058d26dc6746ff6a40ea6e6" target="_blank" rel="noreferrer"><span>ROOT SUSPENSION · SESSION</span><strong>Remove loaded-descendant rejection</strong><small>Suspension now fences new starts and signals shutdown across the shared local agent runtime.</small></a>
          <a href="https://github.com/openai/codex/blob/9c84e89ce0893a552058d26dc6746ff6a40ea6e6/codex-rs/core/src/thread_manager/shutdown.rs" target="_blank" rel="noreferrer"><span>TREE WAIT · SEPARATE HANDLE</span><strong>Cleanup completion is tracked separately</strong><small>The suspension handler emits root ShutdownComplete without awaiting this tree-wide wait handle.</small></a>
        </div>
        <p>Suspension order: pre-flush → stop root turn without terminal event → fence starts and signal runtime shutdown → stop root producers → flush and close root writer → emit ShutdownComplete. That event does not prove all descendant cleanup has finished; the host-side wait handoff is unresolved. Static source analysis, not a live Desktop trace.</p>
      </div>
      <div class="current-main-audit" aria-label="Current public source root and child shutdown boundaries">
        <div class="current-main-audit-heading"><span>PUBLIC MAIN · ROOT / TREE HANDOFF</span><b>4eb4a65</b></div>
        <div class="current-main-audit-grid">
          <article><span>ROOT THREAD</span><strong>Emits ShutdownComplete</strong><small>The root writer is flushed and closed first. This event reports the root suspension path.</small></article>
          <article><span>DESCENDANT TREE</span><strong>Separate cleanup wait</strong><small><code>request_agent_tree_shutdown</code> returns the host-owned wait boundary; it is not awaited by this handler.</small></article>
          <article><span>HOST HANDOFF</span><strong>Wait + writer fencing</strong><small>Current source assigns descendant cleanup and persistence-writer fencing to the host. The packaged Desktop caller is still unverified.</small></article>
        </div>
        <a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/session/turn_suspension.rs" target="_blank" rel="noreferrer">Open the pinned root-suspension source ↗</a>
      </div>
      <section class="capacity-race-map" aria-labelledby="capacity-race-title">
        <div class="capacity-race-heading"><span>CAPACITY · CHECK VS ADMISSION · PUBLIC MAIN 6AE8B8A</span><h5 id="capacity-race-title">A shared limit is checked before it is incremented</h5></div>
        <div class="capacity-race-controls" role="group" aria-label="Choose a capacity timeline">
          <button type="button" data-capacity-scenario="interleaved" aria-pressed="true">Possible interleaving</button>
          <button type="button" data-capacity-scenario="atomic">Atomic permit · illustrative</button>
        </div>
        <p class="capacity-race-caption" data-capacity-caption aria-live="polite">Source contract · advisory check and later turn-start guard</p>
        <div class="capacity-race-view" data-capacity-view="interleaved">
          <div class="capacity-race-flow" aria-label="Possible cross-session capacity check interleaving">
            <article><span>01 · SHARED COUNTER</span><strong><code>active = max − 1</code></strong><small>Child sessions share the agent-tree execution limiter.</small></article>
            <i aria-hidden="true">→</i>
            <article class="capacity-check"><span>02 · ADVISORY CHECK</span><strong>A checks · B checks</strong><small>Each may see the same available slot; the check does not reserve capacity.</small></article>
            <i aria-hidden="true">→</i>
            <article class="capacity-increment"><span>03 · LATER TURN START</span><strong>＋1 · ＋1</strong><small>Separate child-session guards can increment the shared counter after both checks pass.</small></article>
          </div>
        </div>
        <div class="capacity-race-view" data-capacity-view="atomic" hidden>
          <div class="capacity-race-flow capacity-atomic-flow" aria-label="Illustrative atomic permit counterfactual">
            <article><span>01 · SHARED COUNTER</span><strong><code>active = max − 1</code></strong><small>One slot remains before admission.</small></article>
            <i aria-hidden="true">→</i>
            <article class="capacity-increment"><span>02 · A RESERVES ATOMICALLY</span><strong><code>active = max</code></strong><small>A receives the final permit as one check-and-reserve operation.</small></article>
            <i aria-hidden="true">→</i>
            <article class="capacity-check"><span>03 · B SEES FULL</span><strong>wait · reject · retry</strong><small>B cannot pass the same permit after A reserves it.</small></article>
          </div>
        </div>
        <p class="capacity-race-boundary"><b>BOUNDARY</b> These separate operations permit a source-level interleaving; no runtime over-capacity event was reproduced. This is a race possibility, not an observed limit violation.</p>
        <p class="capacity-race-proof"><a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/agent/control/execution.rs" target="_blank" rel="noreferrer">Shared execution limiter</a> · <a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/agent/api.rs" target="_blank" rel="noreferrer">Advisory admission contract</a> · <a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/tools/parallel.rs" target="_blank" rel="noreferrer">Per-runtime tool lock</a></p>
      </section>
      <section class="suspension-map" aria-labelledby="suspension-map-title">
        <div class="suspension-map-heading"><span>SHUTDOWN TRACE · STATIC SOURCE</span><h5 id="suspension-map-title">Root handoff and descendant cleanup are separate milestones</h5></div>
        <div class="suspension-map-grid">
          <article class="suspension-lane prior"><div class="suspension-lane-label"><b>OLDER SNAPSHOT</b><small>97ebf2d</small></div><ol><li><i>1</i><span>List loaded descendants</span></li><li><i>2</i><span>If any exist, return <code>HasLiveDescendants</code></span></li><li class="muted-step"><i>↳</i><span>Point-in-time check; not an atomic spawn fence</span></li></ol></article>
          <article class="suspension-lane intermediate"><div class="suspension-lane-label"><b>INTERMEDIATE MAIN</b><small>9c84e89</small></div><ol><li><i>1</i><span>Flush history, cancel root turn</span></li><li><i>2</i><span>Fence starts; request shutdown for shared runtime</span></li><li><i>3</i><span>Stop root runtime, flush and close root writer</span></li><li><i>4</i><span>Emit root <code>ShutdownComplete</code></span></li></ol><div class="suspension-boundary"><span>SEPARATE TREE WAIT</span><strong>Not awaited by this handler</strong><small>Descendant cleanup completion is not established by the root event.</small></div></article>
            <article class="suspension-lane latest"><div class="suspension-lane-label"><b>LATEST CHECKED MAIN</b><small>4eb4a65</small></div><ol><li><i>1</i><span>Stop root turn; no loaded-descendant refusal</span></li><li><i>2</i><span>Fence new starts; request shutdown for all sessions sharing the runtime</span></li><li><i>3</i><span>Stop root producers, flush and close root writer</span></li><li><i>4</i><span>Emit root <code>ShutdownComplete</code></span></li><li><i>5</i><span>Core assigns tree-cleanup wait and persistence-writer fencing to the host; production caller not found in this source tree</span></li></ol><div class="suspension-boundary"><span>RECOVERY BOUNDARY</span><strong>Child is not auto-restarted</strong><small>Upstream integration coverage verifies termination and the separate cleanup handle.</small></div></article>
        </div>
        <p class="suspension-map-proof"><a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/session/turn_suspension.rs#L83-L110" target="_blank" rel="noreferrer">Latest suspension handler</a> · <a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/thread_manager/shutdown.rs#L106-L168" target="_blank" rel="noreferrer">Host tree-wait contract</a> · <a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/tests/suite/abort_tasks.rs#L170-L184" target="_blank" rel="noreferrer">Integration test setup</a></p>
        <div class="host-handoff-map" aria-label="Evidence map for the unresolved host-side tree cleanup wait">
          <div class="host-handoff-heading"><span>HOST HANDOFF · CURRENT MAIN CALLSITE SEARCH</span><b>4EB4A65</b></div>
          <div class="host-callsite-census" aria-label="Callsite search results">
            <span><b>0</b> production callers in tracked <code>codex-rs</code></span>
            <span><b>5</b> integration-test callers: 1 in <code>abort_tasks</code>, 4 in <code>agent_execution</code></span>
            <span>Root suspension directly requests <code>LocalAgentRuntime::request_shutdown()</code></span>
          </div>
        <div class="host-handoff-controls" role="group" aria-label="Inspect root suspension and tree cleanup milestones">
            <button type="button" data-tree-handoff-stage="root-return" aria-pressed="${treeHandoffStage === 'root-return'}">Root returns</button>
            <button type="button" data-tree-handoff-stage="tree-success" aria-pressed="${treeHandoffStage === 'tree-success'}">Tree wait succeeds</button>
            <button type="button" data-tree-handoff-stage="tree-failure" aria-pressed="${treeHandoffStage === 'tree-failure'}">Tree wait fails</button>
            <button type="button" data-tree-handoff-stage="host-unknown" aria-pressed="${treeHandoffStage === 'host-unknown'}">Host callsite unknown</button>
          </div>
          <p class="host-handoff-detail" data-handoff-detail aria-live="polite">${treeHandoffStage === 'root-return' ? 'Root ShutdownComplete confirms root shutdown and writer closure. Descendant cleanup may still be running; this event alone is not the tree completion receipt.' : treeHandoffStage === 'tree-success' ? 'A successful tree wait means admitted operations and sessions finished, including persistence-writer termination. Registry removal and the caller-owned persistence handoff still remain.' : treeHandoffStage === 'tree-failure' ? 'A failed detailed wait reports cleanup or writer-termination failures. The caller must retain ownership and handle those failures before transferring persistence ownership.' : 'The checked codex-rs tree has no production callsite joining these steps. This leaves the packaged Desktop host path unknown; absence in this source scan is not proof of absence outside the tree.'}</p>
          <div class="host-handoff-steps" data-stage="${treeHandoffStage}">
            <article class="handoff-node signal ${treeHandoffStage === 'root-return' ? 'is-active' : ''}" data-tree-handoff-node="signal"><span>01 · CORE EVENT</span><strong>Root emits <code>ShutdownComplete</code></strong><small>Root runtime stopped; root writer closed.</small><a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/session/turn_suspension.rs#L83-L110" target="_blank" rel="noreferrer">Current source ↗</a></article>
            <i aria-hidden="true">→</i>
            <article class="handoff-node api ${treeHandoffStage === 'tree-success' || treeHandoffStage === 'tree-failure' ? 'is-active' : ''}" data-tree-handoff-node="api"><span>02 · EXPORTED API</span><strong><code>wait_detailed()</code></strong><small>Waits for admitted tree work and reports cleanup failures.</small><a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/thread_manager/shutdown.rs#L106-L168" target="_blank" rel="noreferrer">Handle contract ↗</a></article>
            <i class="handoff-gap" aria-label="No production caller found in this repository snapshot">?</i>
            <article class="handoff-node boundary ${treeHandoffStage === 'host-unknown' ? 'is-active' : ''}" data-tree-handoff-node="boundary"><span>03 · CALLER</span><strong>No tracked production caller found</strong><small>At 4eb4a65, core assigns the tree wait and writer fence to the host; the exported request API still has test callers only. Packaged Desktop behavior remains unknown.</small><a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/core/src/thread_manager/shutdown.rs#L150-L168" target="_blank" rel="noreferrer">API definition ↗</a></article>
          </div>
          <p class="host-handoff-footnote"><b>Separate mechanism:</b> app-server's <code>shutdown_drain_waiter</code> synchronizes listener replacement after <code>ShutdownComplete</code>; it is not the tree-wait handle. <a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L389-L396" target="_blank" rel="noreferrer">Listener event path ↗</a> · <a href="https://github.com/openai/codex/blob/4eb4a65407d98cebc4c83bf13be440b9fbc78a7c/codex-rs/app-server/src/thread_state.rs#L109-L111" target="_blank" rel="noreferrer">Waiter ownership ↗</a></p>
        </div>
        ${shutdownPathCompareMarkup()}
        ${desktopCoverageMarkup()}
        ${shutdownScopeMarkup()}
        ${stopAllDispatchMarkup()}
${desktopExitFlushMarkup()}
        ${stopCleanupMarkup()}
      </section>
    </section>
    ${desktopSubagentsMarkup()}
    <section class="detail-section metadata-grid" aria-label="Agent metadata">
      <div class="meta-cell"><span>CREATED</span><strong>${escapeHtml(when(task.createdAt))}</strong></div><div class="meta-cell"><span>STARTED</span><strong>${escapeHtml(when(task.startedAt))}</strong></div><div class="meta-cell"><span>ELAPSED</span><strong data-duration-for="${escapeHtml(task.id)}">${task.startedAt ? durationLabel(elapsedMs(task)) : '—'}</strong></div><div class="meta-cell"><span>LAST ACTIVITY</span><strong>${escapeHtml(when(task.lastActivityAt ?? task.events?.at(-1)?.at))}</strong></div><div class="meta-cell"><span>RUNTIME LIMIT</span><strong>${task.timeoutSeconds ? durationLabel(task.timeoutSeconds * 1000) : 'None'}</strong></div><div class="meta-cell"><span>PROCESS</span><strong>${task.pid ? `PID ${escapeHtml(task.pid)}` : task.exitCode !== null ? `Exit ${escapeHtml(task.exitCode)}` : '—'}</strong></div>
    </section>
    <section id="context" class="detail-section context-section" aria-label="Task input context">
      <div class="section-title"><h4><span class="section-icon">⌁</span>Input context</h4><span>${parent ? 'CHILD TASK' : 'ROOT TASK'}</span></div>
      <div class="context-flow"><div class="context-step prompt-step"><span class="context-mark">01</span><span><strong>Task prompt</strong><small>Instructions submitted for this agent</small></span><b>INCLUDED</b></div>${parent ? `<div class="context-step ${task.contextIncluded ? 'snapshot-included' : 'snapshot-omitted'}"><span class="context-mark">02</span><span><strong>Parent context snapshot</strong><small>${task.contextIncluded ? 'Parent prompt and latest output captured once at task creation' : 'No parent prompt or output snapshot was included'}</small></span><b>${task.contextIncluded ? 'INCLUDED' : 'OMITTED'}</b></div>` : '<div class="context-step root-step"><span class="context-mark">02</span><span><strong>No parent context</strong><small>This root agent starts from its submitted prompt</small></span><b>ROOT</b></div>'}</div>
      <p class="context-note">A parent snapshot is fixed when the child starts. Later parent output and inbox messages are not inserted into it automatically.</p>
    </section>
    ${spawnConfigMarkup()}
    ${spawnProtocolMarkup()}
    ${terminalLifecycleMarkup()}
    ${interruptCloseMarkup()}
    ${isSample ? '<div class="sample-note">Illustrative data only. No Codex process was started.</div>' : ''}${task.timeoutReason ? `<section class="error-panel timeout-panel"><span class="error-icon">⌛</span><div><strong>Task timed out</strong><p>${escapeHtml(task.timeoutReason)}. The task is marked timed out after its process exits.</p></div></section>` : ''}${task.error ? `<section class="error-panel"><span class="error-icon">!</span><div><strong>Agent error</strong><p>${escapeHtml(task.error)}</p></div></section>` : ''}
    <section id="links" class="detail-section"><div class="section-title"><h4>Task links</h4><span>${children.length} child${children.length === 1 ? '' : 'ren'}</span></div>${activeChildren.length && ['completed','failed','cancelled','timed_out'].includes(task.status) ? `<div class="lifecycle-note"><span>↗</span><p>This task has ended. ${activeChildren.length} direct child agent${activeChildren.length === 1 ? '' : 's'} ${activeChildren.length === 1 ? 'is' : 'are'} still active and will continue independently.</p></div>` : ''}<div class="task-relation-map" role="group" aria-label="Task parent and child relationships">${parent ? `<button class="relation-node parent-node" type="button" data-jump="${escapeHtml(parent.id)}"><span class="relation-role">PARENT · ${escapeHtml(parent.status.replaceAll('_',' ').toUpperCase())}</span><strong>${escapeHtml(parent.prompt)}</strong></button><div class="relation-edge"><span aria-hidden="true">↓</span><small>spawned by</small></div>` : ''}<div class="relation-node current-node" aria-current="true"><span class="relation-role">${parent ? 'SELECTED CHILD' : 'ROOT TASK'} · ${escapeHtml(task.status.replaceAll('_',' ').toUpperCase())}</span><strong>${escapeHtml(task.prompt)}</strong></div>${children.length ? `<div class="relation-branch"><div class="relation-edge"><span aria-hidden="true">↓</span><small>spawns ${children.length} child${children.length === 1 ? '' : 'ren'}</small></div><div class="relation-children">${children.map(child => `<button class="relation-node child-node" type="button" data-jump="${escapeHtml(child.id)}"><span class="relation-role">CHILD · ${escapeHtml(child.status.replaceAll('_',' ').toUpperCase())}</span><strong>${escapeHtml(child.prompt)}</strong><span class="relation-open" aria-hidden="true">↗</span></button>`).join('')}</div></div>` : '<div class="relation-empty">No child agents yet</div>'}</div><p class="relation-note">This map shows task ancestry. Messages and child results appear in the mailbox.</p>${renderConcurrencyTimeline(task, parent, children)}${renderInteractionSequence(task, parent, children, interactionItems)}${renderDesktopGate()}${desktopRuntimeMarkup()}${desktopTopologyMarkup()}${fullFidelityMarkup()}${rendererDeltaMarkup()}${completionPayloadMarkup()}${parentResultStateMarkup()}${requestWireMarkup()}${historyProjectionMarkup()}<div class="interaction-trace"><div class="section-title"><h4>Direct interaction trace</h4><span>${interactionItems.length} item${interactionItems.length === 1 ? '' : 's'}</span></div>${interactionItems.length ? `<div class="interaction-list">${interactionItems.map(({ recipient, message }) => { const sender = taskById(message.from); const isResult = message.kind === 'task_result'; const isReturned = message.deliveryState === 'read'; return `<article class="interaction-item ${isResult ? 'result' : ''} ${isReturned ? 'returned' : 'pending'}"><div class="interaction-meta"><span class="interaction-kind">${isResult ? 'CHILD RESULT' : 'MESSAGE'}</span><span class="interaction-state ${isReturned ? 'returned' : 'pending'}">${isReturned ? 'SUPPLIED TO TASK TOOL' : 'PENDING IN INBOX'}</span><time>${escapeHtml(when(message.at))}</time></div><div class="interaction-pipeline" role="img" aria-label="${escapeHtml(relationRole(sender?.id))} sends to coordinator inbox, then ${isReturned ? 'the coordinator supplies it to' : 'it waits for'} the ${escapeHtml(relationRole(recipient.id))} task tool"><span class="pipeline-stage sent"><small>FROM · ${relationRole(sender?.id)}</small><strong>${escapeHtml(sender?.prompt ?? message.from)}</strong><b>SENT</b></span><i class="pipeline-link complete" aria-hidden="true">→</i><span class="pipeline-stage queued"><small>COORDINATOR INBOX</small><strong>${escapeHtml(relationRole(recipient.id))} mailbox</strong><b>QUEUED</b></span><i class="pipeline-link ${isReturned ? 'complete' : ''}" aria-hidden="true">→</i><span class="pipeline-stage ${isReturned ? 'supplied' : 'waiting'}"><small>TASK TOOL · ${relationRole(recipient.id)}</small><strong>${escapeHtml(recipient.prompt)}</strong><b>${isReturned ? 'SUPPLIED' : 'WAITING'}</b></span></div><p>${escapeHtml(message.text)}</p></article>`; }).join('')}</div><p class="interaction-proof">“Supplied” means the coordinator included the message in that task tool call. It does not prove the model interpreted it.</p>` : '<div class="interaction-empty">No direct parent/child messages or results in the available snapshot.</div>'}</div></section>
    <section id="agent-mailbox" class="detail-section mailbox-section"><div class="section-title"><h4><span class="section-icon">↳</span> Mailbox</h4><div class="mailbox-heading-actions"><span class="mail-count">${Number(task.pendingMessageCount) || 0} pending · ${Number(task.pendingTaskResultCount) || 0} child results</span><button class="mailbox-route-link" type="button" data-inspector-target="topology-row-eligibility"><span aria-hidden="true">▤</span> Explain parent list rows</button><button class="mailbox-route-link" type="button" data-inspector-target="completion-route"><span aria-hidden="true">↳</span> Trace result path</button></div></div><p class="mailbox-proof">Returned means the coordinator supplied this message to the task tool; it does not prove the model interpreted it.</p><details class="delivery-model" ${deliveryModelOpen ? 'open' : ''}><summary><span>How Codex V2 chooses whether to wake a child</span><small>source model · 0.162.0-alpha.17.2</small></summary>${deliveryFlowMarkup()}<div class="delivery-mode-grid"><article class="delivery-mode queue-only"><div class="delivery-mode-title"><span class="mode-icon" aria-hidden="true">Ⅱ</span><div><h5>send_message</h5><span>QueueOnly</span></div><b>QUEUE</b></div><div class="mode-flow"><span>Caller</span><i aria-hidden="true">→</i><span>Child mailbox</span><i aria-hidden="true">→</i><span class="mode-outcome">Waits for an eligible turn</span></div><p>The target is ensured loaded before delivery. QueueOnly skips the ordinary turn-start request; durable sleep has a separate wake path, and a child waiting in <code>wait_agent</code> can return on mailbox activity.</p></article><article class="delivery-mode trigger-turn"><div class="delivery-mode-title"><span class="mode-icon" aria-hidden="true">▶</span><div><h5>followup_task</h5><span>TriggerTurn</span></div><b>WAKE</b></div><div class="mode-flow"><span>Caller</span><i aria-hidden="true">→</i><span>Load child + mailbox</span><i aria-hidden="true">→</i><span class="mode-outcome">Start a turn if idle</span></div><p>The target is ensured loaded, then turn capacity is checked and pending-work scheduling is requested. It targets an existing V2 child; triggering the root is rejected.</p></article></div><p class="delivery-model-proof">Accepted delivery and an “Interacted” activity do not prove the child model has read the message. <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs" target="_blank" rel="noreferrer">Message handler</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/control/delivery.rs" target="_blank" rel="noreferrer">Delivery policy</a></p></details>${inboxItems.length ? `<div class="inbox-list">${inboxItems.map(message => `<article class="inbox-item ${message.deliveryState === 'read' ? 'read' : 'pending'}"><div class="inbox-meta"><span class="mail-kind ${message.kind === 'task_result' ? 'result' : ''}">${message.kind === 'task_result' ? 'CHILD RESULT' : 'MESSAGE'}</span><span class="delivery-state ${message.deliveryState === 'read' ? 'read' : 'pending'}">${message.deliveryState === 'read' ? 'RETURNED' : 'PENDING'}</span><span>from ${escapeHtml(message.from)}</span><time>${escapeHtml(when(message.deliveryState === 'read' ? message.readAt : message.at))}</time></div><p>${escapeHtml(message.text)}</p></article>`).join('')}</div>` : `<div class="mailbox-empty"><span>✉</span><div><strong>Inbox is clear</strong><small>Messages and child results will show up here.</small></div></div>`}${canMessage ? `<button class="inbox-compose" type="button" data-message="${escapeHtml(task.id)}">＋ Send this agent a message</button>` : ''}</section>
    <section id="output" class="detail-section output-section"><div class="section-title"><h4>Latest output</h4><span>${task.output ? `${String(task.output).length.toLocaleString()} chars` : 'Awaiting output'}</span></div>${task.output ? `<pre class="output-text">${escapeHtml(task.output)}</pre>` : `<div class="output-empty"><span class="output-spinner ${task.status === 'running' ? 'active' : ''}">${task.status === 'running' ? '◌' : '·'}</span><span>${task.status === 'running' ? 'Agent is working. Output will stream in here.' : task.status === 'queued' ? 'Output will appear when this agent starts.' : 'This agent did not produce captured text output.'}</span></div>`}</section>
    <section id="activity" class="detail-section activity-section"><div class="section-title"><h4>Recent activity</h4><span>${(task.events ?? []).length} events</span></div>${events.length ? `<div class="activity-list">${events.map(event => `<div class="activity-item"><time>${escapeHtml(when(event.at))}</time><span class="activity-dot ${escapeHtml(event.kind)}"></span><span class="activity-copy"><strong>${escapeHtml(event.kind.replaceAll('_',' '))}</strong><small>${escapeHtml(String(event.detail ?? '').replace(/\s+/g,' ').slice(0,220))}</small></span></div>`).join('')}</div>` : '<div class="subtle-empty">No activity recorded yet.</div>'}</section>`;
    const deliveryModel = $('#agent-mailbox .delivery-model');
    if (deliveryModel) deliveryModel.insertAdjacentHTML('beforeend', `${mailboxTimingMarkup()}${waitScopeMarkup()}${waitContractMarkup()}${residencyMarkup()}${completionRouteMarkup()}${admissionMarkup()}${topologyMarkup()}${boardWriteMarkup()}${toolExposureMarkup()}`);
}
const mechanismExplorerSteps = [
  { label: 'Prepare', title: 'Resolve the child request', text: 'Codex builds the spawn tool from the active agent configuration. Context, model choices and tool availability depend on the selected multi-agent version and runtime settings.', source: 'multi_agents_spec.rs', href: 'https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/tools/handlers/multi_agents_spec.rs' },
  { label: 'Spawn', title: 'Create a child thread', text: 'spawn_agent dispatches a child task and returns its result handle. The parent can continue; that receipt does not mean the child has finished.', source: 'spawn.rs · V1 / V2', href: 'https://github.com/openai/codex/tree/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/tools/handlers/multi_agents_v2' },
  { label: 'Coordinate', title: 'Run and exchange messages', text: 'Parent and child turns have separate control paths. Messaging, waiting, and starting a follow-up turn are distinct operations; queueing a message alone does not prove the child read it.', source: 'send_message.rs · wait.rs', href: 'https://github.com/openai/codex/tree/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/tools/handlers/multi_agents_v2' },
  { label: 'Return', title: 'Route status and result separately', text: 'Completion status, activity notifications, and the result delivered to the parent are different signals. A queued result becomes usable only through the parent’s input and history path.', source: 'completion.rs · V2', href: 'https://github.com/openai/codex/tree/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/agent/control' },
  { label: 'Shutdown', title: 'Three operations, three scope rules', text: 'The phrase “agent tree shutdown” does not identify a single boundary. Compare a shared-runtime fence, an explicit spawn-subtree close, and unloading one idle thread on the same example tree.', source: 'rust-v0.162.1 · shutdown paths', href: 'https://github.com/openai/codex/tree/092d3acd6bec3e3a14bdc7e7a2810ab628ab759d/codex-rs/core/src/thread_manager' },
  { label: 'Inspect', title: 'Opening a child is not spawning one', text: 'The Desktop panel first exposes known thread summaries. Selecting a child can hydrate its conversation through thread/read and load history pages; that navigation path does not create a new child thread.', source: 'installed app bundle · evidence', href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-desktop-child-selection-hydrates-thread-state-on-demand-2026-10-16' }
];
let mechanismExplorerStep = 0;
let mechanismExplorerShowAll = false;
let desktopHydrationState = 'summary';
function desktopHydrationMarkup() {
  const states = {
    summary: { label: '仅有摘要', result: '尚未满足详情条件', detail: 'ensureConversationFirstPage 先检查 archive suppression 与缓存；需要时才 hydrate 背景线程。摘要激活本身不保证发出 thread/read。', stage: 2 },
    archived: { label: '归档抑制', result: 'suppressed · 提前返回', detail: 'ensureConversationFirstPage 在检查本地会话或调用 hydrateBackgroundThreads 之前命中 archive suppression；后续历史页读取不会由这次调用触发。', stage: 3, skipped: true },
    complete: { label: '历史已完整', result: 'complete · 无需取页', detail: 'loadBackgroundThreadHistoryPage 先检查非 evicted 历史是否已完整；满足时直接返回 complete。', stage: 3 },
    more: { label: '仍有下一页', result: 'more · continuation remains', detail: '一次取页后若状态前进且仍有 cursor 或未加载 item page，返回 more。调用方是否继续取完所有页，静态证据不能证明。', stage: 3 },
    stalled: { label: '取页无进展', result: 'error · state did not advance', detail: '若取页后没有状态进展，或历史仍不完整却没有 cursor，加载器会报错；这不是“已完整”的同义状态。', stage: 3 }
  }[desktopHydrationState] ?? null;
  const buttons = [['summary', '仅有摘要'], ['archived', '归档抑制'], ['complete', '已有完整历史'], ['more', '还有下一页'], ['stalled', '无进展 / 错误']];
  const lastNodeState = states.skipped ? 'skipped' : states.stage > 2 ? 'done' : 'active';
  return `<section class="desktop-hydration" aria-labelledby="desktop-hydration-title"><div class="desktop-hydration-heading"><div><span class="desktop-hydration-kicker">INSTALLED DESKTOP · STATIC TRACE</span><h5 id="desktop-hydration-title">子线程详情是有边界的分页状态</h5></div><span class="desktop-hydration-version">26.1007.71326</span></div><div class="desktop-hydration-controls" role="group" aria-label="选择静态源码中的历史加载分支">${buttons.map(([id, label]) => `<button type="button" data-desktop-hydration="${id}" aria-pressed="${desktopHydrationState === id}">${label}</button>`).join('')}</div><div class="desktop-hydration-map" data-state="${desktopHydrationState}" aria-label="子线程路由、摘要激活与详情历史分页"><article class="desktop-hydration-node ${states.stage > 0 ? 'done' : 'active'}"><small>01 · PANEL ROUTE</small><strong>选中已有 child thread ID</strong><span>写入 parent-keyed route；检查 ancestry 与当前选择</span></article><i aria-hidden="true">→</i><article class="desktop-hydration-node ${states.stage > 1 ? 'done' : 'active'}"><small>02 · LOCAL SUMMARY</small><strong>activateThreadSummary</strong><span>投影已知摘要；按需确保首个 conversation page</span></article><i aria-hidden="true">→</i><article class="desktop-hydration-node ${lastNodeState}"><small>03 · HISTORY PAGE</small><strong>${states.result}</strong><span>${states.label}：${states.detail}</span></article></div><p class="desktop-hydration-proof">${states.detail} 读取参数会随调用路径变化：thread/read 的 includeTurns 可为 false；首次本地历史初始化则会包含 turns，并在分页历史下限制初始窗口。</p><p class="desktop-hydration-caveat">Source inspection only · branch selector is illustrative · no live RPC or UI paint observed</p></section>`;
}
function appServerProjectionMarkup() {
  const tools = [
    { id:'spawnAgent', label:'spawnAgent', receiver:'new child thread', fields:'receiverThreadIds · prompt · model' },
    { id:'sendInput', label:'sendInput', receiver:'existing child thread', fields:'receiverThreadIds · status · agentsStates' },
    { id:'wait', label:'wait', receiver:'selected agent set', fields:'receiverThreadIds · status · agentsStates' },
  ];
  const selected = tools.find(tool => tool.id === appServerProjectionTool) ?? tools[0];
  return `<section class="app-server-projection" aria-labelledby="app-server-projection-title">
    <header><div><span>APP-SERVER SCHEMA · THREAD ITEM PROJECTION</span><h4 id="app-server-projection-title">A tool call becomes a timeline record</h4></div><a href="https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L372-L399" target="_blank" rel="noreferrer">pinned item.rs</a></header>
    <div class="app-server-projection-controls" role="group" aria-label="Choose a collaboration operation to project"><span>Example operation</span>${tools.map(tool => `<button type="button" data-app-server-projection="${tool.id}" aria-pressed="${selected.id === tool.id}">${tool.label}</button>`).join('')}</div>
    <div class="app-server-projection-flow" aria-live="polite">
      <article class="projection-execution"><span>01 · MODEL TOOL / HANDLER</span><strong><code>${selected.label}</code></strong><small>Tool registration and handler execute the operation.</small></article><i aria-hidden="true">→</i>
      <article class="projection-core"><span>02 · CORE TURN ITEM</span><strong><code>CollabAgentToolCall</code></strong><small>Call identity, status and participants are carried as event data.</small></article><i aria-hidden="true">→</i>
      <article class="projection-schema"><span>03 · APP-SERVER TIMELINE</span><strong><code>ThreadItem</code></strong><small><code>type: collabAgentToolCall</code><br><code>tool: ${selected.id}</code><br>${selected.fields}</small></article>
    </div>
    <div class="app-server-projection-payload"><span>PROJECTED RECEIVER</span><strong>${selected.receiver}</strong><span>STATUS ENUM</span><strong>inProgress → completed · failed · interrupted</strong><span>OTHER OPTIONAL FIELDS</span><strong>id · senderThreadId · prompt · model · reasoningEffort · agentsStates</strong></div>
    <p class="app-server-projection-boundary"><b>Read this boundary:</b> this proves a serialized history/event shape, not a standalone JSON-RPC method for <code>${selected.id}</code>. The tool’s execution contract and the app-server’s timeline projection are separate layers.</p>
    <p class="app-server-projection-source">Generated from the installed CLI <code>0.163.0-alpha.10.2</code>; source comparison pinned to Codex commit <code>4ebc485</code>. Static schema/source analysis, not a live notification capture.</p>
  </section>`;
}

function appServerHydrationMarkup() {
  const views = [
    { id:'turn-link', label:'Turn linkage', eyebrow:'START A RELATED TURN', method:'turn/start', title:'Attribute a new turn to its parent', params:[['threadId', 'Thread receiving the turn'], ['parentTurnId', 'Turn that caused this work'], ['rootTurnId', 'Root turn for the work chain']], response:'A turn-start result; the schema defines linkage fields, not a child-spawn event.', color:'violet' },
    { id:'history-pages', label:'Page history', eyebrow:'READ THREAD HISTORY', method:'thread/read → thread/turns/list → thread/items/list', title:'Hydrate history in bounded pages', params:[['threadId', 'Thread to inspect'], ['includeTurns: false', 'Metadata-only initial read'], ['cursor + limit', 'Continue turns and item pages']], response:'Page data plus continuation cursors; full-history hydration is deprecated for paginated threads.', color:'cyan' },
    { id:'selected-items', label:'Read selected items', eyebrow:'TARGETED PERSISTED READ', method:'thread/items/read', title:'Fetch only known item IDs', params:[['threadId + turnId', 'Scope the persisted items'], ['itemIds: 1–100', 'Request a bounded set']], response:'Selected persisted items for one turn. This method is marked experimental.', color:'amber' },
  ];
  const view = views.find(item => item.id === appServerHydrationView) ?? views[0];
  return `<section class="app-server-hydration" data-tone="${view.color}" aria-labelledby="app-server-hydration-title">
    <header class="app-server-hydration-heading"><div><span>INSTALLED APP-SERVER · SCHEMA SNAPSHOT</span><h4 id="app-server-hydration-title">Two different questions: who started this turn, and what history can be read?</h4></div><span class="schema-version">CLI 0.163.0-alpha.10.2</span></header>
    <div class="hydration-tabs" role="tablist" aria-label="Choose an app-server observability path">${views.map((item,index) => `<button type="button" role="tab" id="hydration-tab-${item.id}" aria-selected="${item.id === view.id}" aria-controls="hydration-panel" tabindex="${item.id === view.id ? '0' : '-1'}" data-app-server-hydration-view="${item.id}"><span>0${index+1}</span>${item.label}</button>`).join('')}</div>
    <div class="hydration-map" role="tabpanel" id="hydration-panel" aria-labelledby="hydration-tab-${view.id}" aria-live="polite">
      <div class="hydration-step hydration-call"><span>CLIENT REQUEST</span><strong><code>${view.method}</code></strong><small>${view.eyebrow}</small></div><i aria-hidden="true">→</i>
      <div class="hydration-step hydration-fields"><span>SCHEMA FIELDS</span><strong>${view.title}</strong><ul>${view.params.map(([name,description]) => `<li><code>${name}</code><small>${description}</small></li>`).join('')}</ul></div><i aria-hidden="true">→</i>
      <div class="hydration-step hydration-result"><span>WHAT THE CONTRACT DESCRIBES</span><strong>${view.response}</strong><small>See protocol schema definitions ↗</small></div>
    </div>
    <div class="hydration-distinction"><div><span>TURN ATTRIBUTION</span><b>parentTurnId · rootTurnId</b><small>Where work is linked when starting a turn</small></div><div class="distinction-divider" aria-hidden="true">≠</div><div><span>HISTORY OBSERVABILITY</span><b>thread/read · paged items</b><small>What a client can request from stored thread history</small></div></div>
    <p class="hydration-boundary"><b>Evidence boundary</b> This schema was generated from the exact installed Desktop CLI and establishes request/response shapes only. It does not show which calls Desktop makes during a live subagent spawn, nor prove that every child is started through <code>turn/start</code>.</p>
    <p class="hydration-source">Schema bundle SHA-256 <code>a000c50ceb59e6a9b668f9b638bfce1df6fcd59a383aaa38291ed72c96fa92e0</code> · Full definitions and reproduction in the <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-desktop-app-server-schema-distinguishes-turn-attribution-from-history-reads-2026-10-17" target="_blank" rel="noreferrer">evidence ledger ↗</a></p>
  </section>`;
}

function rendererReadPathMarkup() {
  const overview = [
    {
      id: 'selected-thread', label: 'Open selected child', owner: 'app-initial · selected-thread hydrator',
      nodes: ['Selected child ID', 'thread/turns/list', 'thread/items/list', 'Transcript view'],
      note: 'itemsView: notLoaded → cursor-paged items',
    },
    {
      id: 'spawn-history', label: 'Discover child from history', owner: 'app-initial · spawn-history lookup',
      nodes: ['Existing history', 'thread/items/list', 'Match child reference', 'Parent context'],
      note: 'History association; no child lifecycle proof',
    },
    {
      id: 'metadata', label: 'Read shared metadata', owner: 'app-shared · history manager',
      nodes: ['Thread ID', 'thread/read', 'turns / items', 'Shared consumers'],
      note: 'Separate metadata and paged-history requests',
    },
  ];
  const routes = {
    'selected-thread': {
      label: 'Open selected child',
      eyebrow: 'SELECTED THREAD · TRANSCRIPT HYDRATION',
      steps: [
        ['01 · TARGET', 'Selected child thread', 'The panel already has a child thread identity to open.'],
        ['02 · TURN INDEX', 'thread/turns/list', 'Request turn metadata with itemsView: "notLoaded".'],
        ['03 · ITEM PAGES', 'thread/items/list', 'Load each turn’s item pages and follow advancing cursors.'],
        ['04 · PROJECTION', 'Transcript blocks', 'Project the loaded typed items into the local conversation view.'],
      ],
      proof: 'Direct renderer callsites connect selected-thread hydration to turns and paged item reads.',
    },
    'spawn-history': {
      label: 'Inspect spawn history',
      eyebrow: 'CHILD DISCOVERY · HISTORY SCAN',
      steps: [
        ['01 · SOURCE THREAD', 'Existing conversation history', 'A separate renderer path examines persisted items for child/spawn context.'],
        ['02 · ITEM READ', 'thread/items/list', 'The callsite reads item pages from the relevant thread history.'],
        ['03 · MATCH', 'Spawn / child references', 'Loaded history can be used to associate a child with its parent context.'],
        ['04 · LIMIT', 'No lifecycle proof', 'This lookup path does not show when or how the child process was started.'],
      ],
      proof: 'A distinct static callsite uses item pages for child/spawn history; it is not the selected transcript path.',
    },
    metadata: {
      label: 'Read thread metadata',
      eyebrow: 'SHARED HISTORY CONSUMER · METADATA',
      steps: [
        ['01 · LOOKUP', 'thread/read', 'A shared renderer helper issues a metadata-only thread read.'],
        ['02 · TURNS', 'thread/turns/list', 'History consumers can page turn metadata separately.'],
        ['03 · ITEMS', 'thread/items/list', 'Item content is loaded through paged reads when needed.'],
        ['04 · SEPARATE OWNER', 'Shared history helper', 'These callsites explain data access, not the spawn handler.'],
      ],
      proof: 'Static shared-renderer callsites show metadata and history reads are separate requests.',
    },
  };
  const route = routes[rendererReadRoute] ?? routes['selected-thread'];
  return `<section class="renderer-read-path" aria-labelledby="renderer-read-path-title">
    <header class="renderer-read-path-head"><div><span>INSTALLED RENDERER · STATIC CALLSITE TRACE</span><h4 id="renderer-read-path-title">How the UI reads child-thread history</h4></div><span class="renderer-read-path-build">BUILD 20586</span></header>
    <div class="renderer-read-path-overview" role="img" aria-label="Three separate renderer history-read paths, all downstream of an existing thread identity">
      <div class="renderer-read-path-overview-head"><span>THREE DISTINCT READ PATHS</span><span>THREAD ID / HISTORY ALREADY EXISTS</span><span>NO SPAWN CALL SHOWN</span></div>
      ${overview.map((item,index) => `<div class="renderer-read-path-lane" data-active="${item.id === rendererReadRoute}" data-route-lane="${item.id}"><div class="renderer-read-path-lane-name"><span>0${index+1}</span><strong>${item.label}</strong><small>${item.owner}</small></div><div class="renderer-read-path-lane-flow">${item.nodes.map((node,nodeIndex) => `${nodeIndex ? '<i aria-hidden="true">→</i>' : ''}<b>${node}</b>`).join('')}</div><small class="renderer-read-path-lane-note">${item.note}</small></div>`).join('')}
      <div class="renderer-read-path-overview-foot"><span>History hydration and discovery explain what the renderer reads after it has a thread to inspect.</span><b>STATIC SOURCE EVIDENCE · NOT A LIVE REQUEST TRACE</b></div>
    </div>
    <div class="renderer-read-path-tabs" role="group" aria-label="Choose a renderer history-read path">${Object.entries(routes).map(([id,item],index) => `<button type="button" aria-pressed="${id === rendererReadRoute}" data-renderer-read-route="${id}"><span>0${index+1}</span>${item.label}</button>`).join('')}</div>
    <div class="renderer-read-path-map" aria-live="polite">
      <div class="renderer-read-path-kicker">${route.eyebrow}</div><ol>${route.steps.map(([label,title,detail]) => `<li><span>${label}</span><strong>${title}</strong><small>${detail}</small></li>`).join('')}</ol>
      <p class="renderer-read-path-proof"><b>CALLSITE EVIDENCE</b>${route.proof}</p>
    </div>
    <p class="renderer-read-path-boundary">Static inspection of packaged JavaScript only. These paths show how the renderer can read and project persisted history; no live request was captured, and they do not establish the subagent spawn mechanism. The experimental <code>thread/items/read</code> schema had no request callsite in the inspected renderer resources.</p>
    <p class="renderer-read-path-source">Renderer resources are SHA-256 pinned in the <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-installed-renderer-history-read-callsites-2026-10-17" target="_blank" rel="noreferrer">evidence ledger ↗</a></p>
  </section>`;
}

function selectRendererReadRoute(routeId) {
  rendererReadRoute = ['selected-thread','spawn-history','metadata'].includes(routeId) ? routeId : 'selected-thread';
  const section = $('.renderer-read-path');
  if (!section) return;
  section.outerHTML = rendererReadPathMarkup();
  document.querySelector(`[data-renderer-read-route="${rendererReadRoute}"]`)?.focus();
}

function rendererUpdatePipelineMarkup() {
  const stages = [
    {
      title: 'App-server notification',
      owner: 'main process → shared manager',
      detail: 'Recognized item events pass host filtering and dispatch into the conversation reducer.',
      evidence: 'Notification ingress',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#app-server-notifications-enter-the-shared-conversation-reducer',
      kind: 'static',
    },
    {
      title: 'Conversation state + delta',
      owner: 'item reducer → thread store',
      detail: 'A mutation may update the thread store and produce a transcript delta; filtering, no-op updates, or a null delta can stop this path.',
      evidence: 'Reducer to transcript publisher',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#item-notification-updates-feed-the-conversation-transcript-subscription',
      kind: 'conditional',
    },
    {
      title: 'Conversation subscription',
      owner: 'host RPC ↔ MessagePort ↔ renderer',
      detail: 'The callback transport can carry transcript snapshots and deltas across the bridge. The static trace does not capture a live frame.',
      evidence: 'Callback transport',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#conversation-subscription-callbacks-cross-the-messageport-rpc-bridge',
      kind: 'static',
    },
    {
      title: 'Local transcript projection',
      owner: 'renderer listener → selectors → list props',
      detail: 'Accepted reset/change data updates local reactive stores and derived transcript projections; the selected-child path supplies entries to a virtualized list.',
      evidence: 'Renderer projection',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#renderer-conversation-deltas-update-the-local-transcript-projection',
      kind: 'static',
    },
    {
      title: 'React commit / visible paint',
      owner: 'runtime observation required',
      detail: 'No component commit, DOM change, or paint acknowledgement was captured. The current evidence stops at static state/list wiring.',
      evidence: 'Current boundary',
      href: 'https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/desktop-child-runtime-2026-10-17.json',
      kind: 'unknown',
    },
  ];
  const selected = stages[rendererUpdateStage] ?? stages[0];
  return `<section class="renderer-update-pipeline" aria-labelledby="renderer-update-pipeline-title">
    <header class="renderer-update-head"><div><span>INSTALLED DESKTOP · EVIDENCE PATH</span><h4 id="renderer-update-pipeline-title">How a child update could reach the screen</h4></div><span class="renderer-update-build">STATIC · BUILD-SCOPED</span></header>
    <div class="renderer-update-legend" aria-label="Evidence legend"><span><i data-kind="static"></i> traced in source</span><span><i data-kind="conditional"></i> conditional path</span><span><i data-kind="unknown"></i> not observed</span></div>
    <ol class="renderer-update-steps" aria-label="Select a stage in the renderer update path">${stages.map((stage,index) => `<li><button type="button" data-renderer-update-stage="${index}" data-kind="${stage.kind}" aria-pressed="${index === rendererUpdateStage}" aria-label="Stage ${index + 1}: ${stage.title}"><span class="renderer-update-index">0${index+1}</span><strong>${stage.title}</strong><small>${stage.owner}</small></button>${index < stages.length - 1 ? `<i aria-hidden="true" class="renderer-update-arrow" data-to-kind="${stages[index+1].kind}">→</i>` : ''}</li>`).join('')}</ol>
    <article class="renderer-update-detail" data-kind="${selected.kind}" aria-live="polite"><div><span>${selected.kind === 'unknown' ? 'OPEN RUNTIME QUESTION' : `STAGE 0${rendererUpdateStage+1} · ${selected.kind.toUpperCase()}`}</span><a href="${selected.href}" target="_blank" rel="noreferrer">${selected.evidence} ↗</a></div><h5>${selected.title}</h5><p>${selected.detail}</p></article>
    <p class="renderer-update-boundary"><b>Evidence boundary</b> These source links span pinned installed-bundle records; they are not a single-build runtime trace. The separate build 20586 runtime summary confirms linked child reads, but no live delta-to-render sequence, React commit, or visible paint.</p>
  </section>`;
}

function selectRendererUpdateStage(stage) {
  rendererUpdateStage = Math.max(0, Math.min(4, Number(stage) || 0));
  const section = $('.renderer-update-pipeline');
  if (!section) return;
  section.outerHTML = rendererUpdatePipelineMarkup();
  document.querySelector(`[data-renderer-update-stage="${rendererUpdateStage}"]`)?.focus();
}

function agentControlExplorerMarkup() {
  const entries = [
    ['new-root', 'New root', 'InitialHistory::New'],
    ['cold-resume', 'Cold resume', 'Resumed history · not loaded'],
    ['fork-root', 'Forked root', 'InitialHistory::Forked'],
    ['internal-child', 'Internal child', 'captured parent control'],
    ['live-resume', 'Already-running resume', 'loaded thread · early return'],
  ];
  const currentMain = agentControlSource === 'current-main';
  const entry = entries.find(([id]) => id === agentControlEntry) ?? entries[0];
  const localInit = ['new-root', 'cold-resume', 'fork-root'].includes(agentControlEntry);
  const selection = currentMain && localInit && agentControlFactoryEnabled && agentControlVersion === 'v1'
    ? { title: 'V1 requires local control', detail: 'The current-main API documents host backends for MultiAgentV2; a V1 session must stay on LocalAgentControl.', badge: 'LOCAL CONTROL REQUIRED' }
    : agentControlEntry === 'live-resume'
    ? { title: 'Reuse the already-running thread', detail: 'ThreadManager returns the resident thread before controller-factory selection. Its existing controller stays attached.', badge: 'NO NEW CONTROLLER' }
    : localInit && agentControlFactoryEnabled
      ? { title: 'Host factory supplies the controller', detail: 'Registration calls the host factory with the selected thread ID. The local runtime is still carried alongside it; a factory error fails startup.', badge: 'HOST CONTROL · LOCAL RUNTIME' }
      : localInit
        ? { title: 'Keep LocalAgentControl', detail: 'No host factory is installed, so the locally constructed controller passes through registration unchanged.', badge: 'LOCAL CONTROL' }
        : { title: 'Inherit the parent controller', detail: 'The internal child arrives as AgentControlInit::Provided. The Local-only factory match does not replace this captured controller or runtime.', badge: 'PARENT CONTROL' };
  return `<section class="agent-control-construction" aria-labelledby="agent-control-construction-title">
    <div class="agent-control-construction-heading"><div><span>CONTROLLER WIRING · SOURCE REVISION COMPARISON</span><h5 id="agent-control-construction-title">Which AgentControl reaches this thread?</h5></div><small>Source rule ≠ runtime capture</small></div>
    <div class="controller-source-switch" role="group" aria-label="Source revision"><button type="button" data-controller-source="installed" aria-pressed="${!currentMain}"><b>Installed match</b><small>Desktop CLI 0.163.0 · 4ebc485</small></button><button type="button" data-controller-source="current-main" aria-pressed="${currentMain}"><b>Current main</b><small>Codex · b5115cd · 2026-10-17</small></button></div>
    <div class="controller-scenario-controls"><div class="controller-entry-picker" role="group" aria-label="Thread entry path">${entries.map(([id, title, note]) => `<button type="button" data-controller-entry="${id}" aria-pressed="${agentControlEntry === id}"><b>${title}</b><small>${note}</small></button>`).join('')}</div><button class="controller-factory-toggle" type="button" data-controller-factory aria-pressed="${agentControlFactoryEnabled}"><span class="controller-toggle-dot" aria-hidden="true"></span><span>${currentMain ? 'Host factory · what-if' : 'Host factory'}</span><b>${currentMain ? (agentControlFactoryEnabled ? 'SIMULATED' : 'DEFAULT · NONE') : (agentControlFactoryEnabled ? 'INSTALLED' : 'NOT INSTALLED')}</b></button></div>
    ${currentMain ? `<div class="controller-version-switch" role="group" aria-label="Multi-agent version"><span>API mode</span><button type="button" data-controller-version="v1" aria-pressed="${agentControlVersion === 'v1'}">V1</button><button type="button" data-controller-version="v2" aria-pressed="${agentControlVersion === 'v2'}">V2</button><small>Current API: host backends support V2; V1 requires Local control.</small></div>` : ''}
    ${currentMain ? `<section class="controller-wiring-census" aria-label="Current-main production factory callsite census"><div class="controller-wiring-census-heading"><b>IN-TREE WIRING CENSUS · b5115cdd</b><span>0 production factory calls</span></div><div class="controller-wiring-census-flow"><article><small>APP-SERVER</small><strong>MessageProcessor</strong><span>constructs ThreadManager</span></article><i aria-hidden="true">→</i><article><small>DEFAULT FIELD</small><strong>factory = None</strong><span>no production builder call found</span></article><i aria-hidden="true">→</i><article><small>SESSION DEFAULT</small><strong>LocalAgentControl</strong><span>local backend for this composition</span></article></div><p>Two builder invocations are in integration tests. External/private embedders are outside this tracked <code>codex-rs</code> census; this source check does not capture a packaged Desktop spawn.</p><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-current-main-agent-control-factory-census-2026-10-17" target="_blank" rel="noreferrer">full search scope and evidence ↗</a></section>` : ''}
    <div class="controller-route" data-entry="${agentControlEntry}" data-factory="${agentControlFactoryEnabled}" aria-live="polite"><div class="controller-route-input"><span>ENTRY</span><strong>${entry[1]}</strong><small>${entry[2]}</small></div><i aria-hidden="true">→</i><div class="controller-route-init"><span>INITIAL CONTROLLER</span><strong>${localInit ? 'LocalAgentControl' : agentControlEntry === 'internal-child' ? 'Parent-provided' : 'Existing resident'}</strong><small>${localInit ? 'ThreadManager state + ID generator + rollout budget' : agentControlEntry === 'internal-child' ? 'captured AgentControlInit + local runtime' : 'returned before registration factory'}</small></div><i aria-hidden="true">→</i><div class="controller-route-result"><span>${selection.badge}</span><strong>${selection.title}</strong><small>${selection.detail}</small></div></div>
    ${currentMain ? '<p class="controller-identity-check"><b>Provided controller guard</b> The session startup path compares <code>control.identity()</code> with the derived session identity. A mismatch fails startup; a matching provided controller keeps its associated runtime.</p>' : ''}
    <p class="agent-control-construction-boundary"><b>Evidence boundary</b> ${currentMain ? 'Current-main source contract plus a complete tracked codex-rs callsite census; the what-if toggle illustrates the public extension point, not a production installation.' : 'Version-matched installed-source decision rule. Its app-server composition calls ThreadManager::new with the factory left at default None; source-path evidence, not runtime capture.'} Static method tables contain LocalAgentControl implementations, but no runtime capture identifies the concrete table used by a specific installed Desktop spawn.</p>
    <div class="agent-control-construction-links">${currentMain ? '<a href="https://github.com/openai/codex/blob/b5115cdd669d37a8635a9742851e97ba4fb1d42c/codex-rs/core/src/thread_manager.rs#L3331-L3368" target="_blank" rel="noreferrer">factory contract</a><a href="https://github.com/openai/codex/blob/b5115cdd669d37a8635a9742851e97ba4fb1d42c/codex-rs/core/src/agent/control/runtime.rs#L1293-L1343" target="_blank" rel="noreferrer">Local / Provided</a><a href="https://github.com/openai/codex/blob/b5115cdd669d37a8635a9742851e97ba4fb1d42c/codex-rs/core/src/session/session.rs#L3910-L4008" target="_blank" rel="noreferrer">identity validation</a><a href="https://github.com/openai/codex/blob/b5115cdd669d37a8635a9742851e97ba4fb1d42c/codex-rs/core/src/codex_delegate.rs#L1288-L1300" target="_blank" rel="noreferrer">child inheritance</a>' : '<a href="https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/app-server/src/message_processor.rs#L329-L380" target="_blank" rel="noreferrer">app-server composition</a><a href="https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/core/src/thread_manager.rs#L536-L650" target="_blank" rel="noreferrer">default factory is None</a><a href="https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/core/src/thread_manager.rs#L1136-L1155" target="_blank" rel="noreferrer">entry selection</a><a href="https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/core/src/thread_manager.rs#L2072-L2123" target="_blank" rel="noreferrer">registration and factory</a>'}</div>
  </section>`;
}

function currentMainDeltaMarkup() {
  return `<section class="main-delta" aria-labelledby="main-delta-title">
    <div class="main-delta-heading"><div><span>UPSTREAM SOURCE · BOUNDED DIFF</span><h4 id="main-delta-title">What changed after the last subagent census?</h4></div><a href="https://github.com/openai/codex/commit/3076caafdf674e0237866a22b647cd9c6931891c" target="_blank" rel="noreferrer">main · 3076caa ↗</a></div>
    <ol class="main-delta-rail" aria-label="Codex source revisions checked after the subagent census">
      <li><article class="main-delta-node"><span>LAST CENSUS</span><strong>b5115cdd</strong><small>AgentControl factory callsite map</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>EXEC-SERVER</span><strong>34420d4</strong><small>Noise handshake disconnect reason</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>THREAD STORE</span><strong>4491caf</strong><small>Bounded thread-history projection</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>MCP / CODE MODE</span><strong>0df4aa6</strong><small>Dynamic tool updates and parallel calls</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>PERSISTENCE</span><strong>96eb400</strong><small>Retryable vs unknown write outcome</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>MULTI-ENV EXTENSION</span><strong>e7de1f4</strong><small>Opt-in file-copy tool; child-turn availability unknown</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>MCP APPROVAL</span><strong>a083a1e</strong><small>Distinguish user, interrupted, and non-interactive cancellation</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>TUI BACKEND OWNERSHIP</span><strong>440312f</strong><small>Keep session selection bound to its backend</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>MCP STATUS METADATA</span><strong>0e675021</strong><small>Preserve tool-list metadata in server status</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node"><span>WINDOWS UNINSTALL</span><strong>b9775a0</strong><small>Honor home deletion preferences</small></article><i aria-hidden="true">→</i></li>
      <li><article class="main-delta-node latest"><span>V8 / ICU BUILD</span><strong>3076caa</strong><small>Move Bazel rules into the workspace</small></article></li>
    </ol>
    <div class="main-delta-scope"><span class="main-delta-check" aria-hidden="true">✓</span><p><b>Inspected subagent paths unchanged through 3076caa</b><span>The latest commit only moves V8/ICU Bazel rules. The bounded review found no change in the inspected AgentControl, multi-agent handlers, collaboration protocol, app-server, or TUI paths. This is a path-scoped result, not proof that indirect effects elsewhere are impossible.</span></p><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-upstream-main-recheck-through-3076caa-2026-10-17" target="_blank" rel="noreferrer">Evidence ledger ↗</a></div>
    <p class="main-delta-boundary">This bounded public-source diff does not capture the packaged Desktop runtime or prove which turn receives an optional extension tool.</p>
  </section>`;
}

function packagedCliFeatureRegistryMarkup() {
  const scenarios = {
    'feature-fallback': { title: 'Feature fallback → V1', override: 'None', metadata: 'None', flags: 'multi_agent=true · multi_agent_v2=false', result: 'V1', detail: 'With no config override or model version, enabled legacy multi_agent selects V1.' },
    'model-v2': { title: 'Model metadata → V2', override: 'None', metadata: 'Some(V2)', flags: 'multi_agent=true · multi_agent_v2=false', result: 'V2', detail: 'Model metadata can select V2 even when this CLI feature snapshot reports multi_agent_v2 disabled.' },
    'config-v2': { title: 'Config override → V2', override: 'V2', metadata: 'Some(V1) or None', flags: 'multi_agent=true · multi_agent_v2=true', result: 'V2', detail: 'An explicit V2 configuration override takes precedence over model metadata.' },
    disabled: { title: 'Agents disabled → Disabled', override: 'Disabled', metadata: 'Some(V2)', flags: 'agents disabled', result: 'Disabled', detail: 'An explicit disabled- agents configuration wins before model metadata and feature fallback.' }
  };
  const scenario = scenarios[versionResolutionScenario] ?? scenarios['feature-fallback'];
  return `<section class="cli-feature-map" aria-labelledby="cli-feature-map-title">
    <div class="cli-feature-map-head"><div><span>PACKAGED CLI · FEATURE REGISTRY</span><h4 id="cli-feature-map-title">本机 CLI 暴露了哪些 agent 开关？</h4></div><span class="cli-feature-map-build">Desktop 20586 · CLI 0.163.0-alpha.10.2</span></div>
    <div class="cli-feature-map-tracks" role="list" aria-label="Packaged CLI feature states">
      <article class="cli-feature-map-item enabled" role="listitem"><span class="cli-feature-map-state">STABLE · ENABLED</span><strong><code>multi_agent</code></strong><small>旧版 multi-agent 开关</small></article>
      <article class="cli-feature-map-item disabled" role="listitem"><span class="cli-feature-map-state">STABLE · DISABLED</span><strong><code>multi_agent_v2</code></strong><small>V2 协议开关</small></article>
      <article class="cli-feature-map-item experimental" role="listitem"><span class="cli-feature-map-state">UNDER DEVELOPMENT · DISABLED</span><strong><code>agent_message_board</code></strong><small>消息板</small></article>
      <article class="cli-feature-map-item experimental" role="listitem"><span class="cli-feature-map-state">UNDER DEVELOPMENT · DISABLED</span><strong><code>multi_agent_v2_dynamic_tools</code></strong><small>V2 动态工具</small></article>
      <article class="cli-feature-map-item experimental" role="listitem"><span class="cli-feature-map-state">UNDER DEVELOPMENT · DISABLED</span><strong><code>defer_mailbox_preemption</code></strong><small>延后 mailbox 抢占</small></article>
      <article class="cli-feature-map-item experimental" role="listitem"><span class="cli-feature-map-state">UNDER DEVELOPMENT · DISABLED</span><strong><code>subagent_default_context_limits</code></strong><small>子 agent 默认上下文限制</small></article>
    </div>
    <p class="cli-feature-map-boundary">这是在已授权工作区内运行打包 CLI 得到的有效 feature registry；用户配置和匹配环境变量未见覆盖。它不能证明 Desktop 宿主继承了同一组解析值，也不能证明某个任务选用了哪条协议或实际启动了子 agent。</p>
    <div class="version-resolution" aria-labelledby="version-resolution-title">
      <div class="version-resolution-head"><b>版本解析 · 固定源码规则</b><span>Codex tag · 4ebc485</span></div>
      <div class="version-resolution-cases" role="group" aria-label="选择 multi-agent 版本解析场景">
        <button type="button" data-version-resolution="feature-fallback" aria-pressed="${versionResolutionScenario === 'feature-fallback'}">走 feature 回退</button><button type="button" data-version-resolution="model-v2" aria-pressed="${versionResolutionScenario === 'model-v2'}">模型标记 V2</button><button type="button" data-version-resolution="config-v2" aria-pressed="${versionResolutionScenario === 'config-v2'}">显式配置 V2</button><button type="button" data-version-resolution="disabled" aria-pressed="${versionResolutionScenario === 'disabled'}">显式禁用 agents</button>
      </div>
      <div class="version-resolution-flow" aria-live="polite"><article><span>CONFIG</span><strong>${scenario.override}</strong></article><i aria-hidden="true">→</i><article><span>MODEL METADATA</span><strong>${scenario.metadata}</strong></article><i aria-hidden="true">→</i><article><span>FEATURE SNAPSHOT</span><strong>${scenario.flags}</strong></article><i aria-hidden="true">→</i><article class="version-resolution-result"><span>RESOLVED VERSION</span><strong>${scenario.result}</strong></article></div>
      <p id="version-resolution-title">${scenario.detail} Controller selection is a separate decision; the diagram is a source-backed rule, not a capture of a Desktop task.</p>
      <div class="version-resolution-links"><a href="https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/core/src/config/mod.rs#L1637-L1664" target="_blank" rel="noreferrer">config override + fallback</a><a href="https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/core/src/session/mod.rs#L4376-L4388" target="_blank" rel="noreferrer">model metadata resolution</a></div>
    </div>
    <a class="cli-feature-map-source" href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-packaged-cli-feature-registry-snapshot-2026-10-17" target="_blank" rel="noreferrer">查看版本、哈希与复核步骤 ↗</a>
  </section>`;
}

function selectionBoundariesMarkup() {
  const versionCases = {
    'feature-fallback': { result: 'V1', detail: 'No config override or model version; enabled legacy feature fallback selects V1.' },
    'model-v2': { result: 'V2', detail: 'The selected model metadata supplies V2, even with the V2 feature switch disabled.' },
    'config-v2': { result: 'V2', detail: 'An explicit V2 config override takes precedence over model metadata.' },
    disabled: { result: 'Disabled', detail: 'An explicit disabled-agent config wins before model metadata and feature fallback.' },
  };
  const entries = [
    ['new-root', 'New root'],
    ['cold-resume', 'Cold resume'],
    ['fork-root', 'Forked root'],
    ['internal-child', 'Internal child'],
    ['live-resume', 'Resident resume'],
  ];
  const scenario = versionCases[versionResolutionScenario] ?? versionCases['feature-fallback'];
  const entryName = entries.find(([id]) => id === agentControlEntry)?.[1] ?? 'New root';
  const localInit = ['new-root', 'cold-resume', 'fork-root'].includes(agentControlEntry);
  const currentMain = agentControlSource === 'current-main';
  const controller = agentControlEntry === 'live-resume'
    ? { title: 'Existing controller reused', kind: 'resident', detail: 'The resident thread returns before a new controller is selected.' }
    : agentControlEntry === 'internal-child'
      ? { title: 'Parent-provided AgentControl', kind: 'inherited', detail: 'The internal child inherits the captured parent controller.' }
      : localInit && agentControlFactoryEnabled && (!currentMain || agentControlVersion === 'v2')
        ? { title: 'Host factory controller', kind: 'host', detail: 'A V2 host factory may replace LocalAgentControl at thread registration.' }
        : { title: 'LocalAgentControl', kind: 'local', detail: currentMain && localInit && agentControlFactoryEnabled ? 'V1 requires local control in the current-main API.' : 'The regular app-server composition uses the local controller.' };
  const handler = scenario.result === 'Disabled' ? 'No collaboration handler' : `${scenario.result} spawn_agent handler`;
  const protocolHref = 'https://github.com/openai/codex/blob/67a709665ac7b50311b93e32612c9a8281684787/codex-rs/core/src/tools/spec_plan.rs#L1300-L1345';
  const controlHref = 'https://github.com/openai/codex/blob/67a709665ac7b50311b93e32612c9a8281684787/codex-rs/core/src/session/session.rs#L929-L959';
  return `<section class="selection-boundaries" aria-labelledby="selection-boundaries-title">
    <header><div><span>THREE INDEPENDENT SELECTION BOUNDARIES</span><h4 id="selection-boundaries-title">一条 spawn 路径里的三项选择</h4></div><span class="selection-boundaries-badge">4ebc485 + 67a7096 · SOURCE MODEL</span></header>
    <p class="selection-boundaries-intro">先解析 turn 协议版本，再据此注册工具 handler；handler 共用 AgentControl 接口。线程入口另行决定 controller 如何获得。</p>
    <div class="selection-boundaries-protocol" role="group" aria-label="选择 turn 协议版本解析情景">${[['feature-fallback','Feature 回退'],['model-v2','模型元数据 V2'],['config-v2','配置覆盖 V2'],['disabled','显式禁用']].map(([id,label]) => `<button type="button" data-boundary-version="${id}" aria-pressed="${id === versionResolutionScenario}">${label}</button>`).join('')}</div>
    <div class="selection-boundaries-entry" role="group" aria-label="选择 controller 的线程入口">${entries.map(([id,label]) => `<button type="button" data-boundary-entry="${id}" aria-pressed="${id === agentControlEntry}">${label}</button>`).join('')}</div>
    <div class="selection-boundaries-map" aria-live="polite">
      <article class="selection-boundary-node version"><span>01 · TURN VERSION</span><strong>${scenario.result}</strong><small>${scenario.detail}</small></article><i aria-hidden="true">→</i>
      <article class="selection-boundary-node handler"><span>02 · TOOL PLAN</span><strong>${handler}</strong><small>${scenario.result === 'Disabled' ? 'Collaboration tools are not registered for this resolved version.' : 'The resolved version selects the handler implementation.'}</small></article><i aria-hidden="true">→</i>
      <article class="selection-boundary-node shared"><span>SHARED API</span><strong>AgentControl::spawn</strong><small>${scenario.result === 'Disabled' ? 'Not reached in this scenario.' : 'V1 and V2 handlers call the shared controller interface.'}</small></article><i aria-hidden="true">⇢</i>
      <article class="selection-boundary-node controller" data-controller-kind="${controller.kind}"><span>03 · ${entryName.toUpperCase()} CONTROLLER</span><strong>${controller.title}</strong><small>${controller.detail}</small></article>
    </div>
    <p class="selection-boundaries-note"><b>Read the arrows carefully:</b> protocol version determines the tool handler; thread entry determines controller ownership. The shared API connects them, but selecting V1 or V2 alone does not identify a task's concrete runtime controller.</p>
    <div class="selection-boundaries-sources"><a href="${protocolHref}" target="_blank" rel="noreferrer">version-specific tool registration ↗</a><a href="${controlHref}" target="_blank" rel="noreferrer">LocalAgentControl binding ↗</a><a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-version-resolution-is-turn-scoped-not-necessarily-fixed-at-thread-start-2026-10-17" target="_blank" rel="noreferrer">evidence ledger and limits ↗</a></div>
  </section>`;
}

function refreshSelectionBoundaries() {
  const section = $('.selection-boundaries');
  if (section) section.outerHTML = selectionBoundariesMarkup();
}

function refreshAgentControlViews() {
  document.querySelectorAll('.agent-control-construction').forEach(section => {
    section.outerHTML = agentControlExplorerMarkup();
  });
}

function interactionCompareMarkup() {
  const phases = [
    ['spawn', '01', '创建'], ['execute', '02', '子线程执行'], ['control', '03', '父线程控制'], ['return', '04', '状态与结果'], ['surface', '05', '桌面投影'],
  ];
  const scenarios = {
    'v1-capture': {
      label: 'V1 · 捕获运行', badge: 'DIRECT CLI OBSERVATION · ONE RUN',
      note: '这是一条独立 CLI 的 V1 实际捕获。运行中可见 spawn、wait 和父级结果；它不证明 Desktop 使用同一控制器，也没有 Desktop UI 轨迹。',
      cells: {
        parent: [
          ['spawn_agent 返回 child ID', 'observed', '运行记录包含 spawn_agent 调用及返回的 child thread ID。', 'native-cli-trace-title'],
          ['等待 child', 'observed', '同一父级记录随后调用 wait，并收到该 child 的终态和消息。', 'native-cli-trace-title'],
          ['wait 返回后继续', 'observed', 'wait 已完成后，父级继续执行并报告结果。', 'native-cli-trace-title'],
          ['父级报告结果', 'observed', '捕获到父级最终输出的指定 marker；这是该次 CLI 探针的结果。', 'native-cli-trace-title'],
          ['未采集 Desktop UI', 'unknown', '该探针运行在独立 CLI 中，不包含 Desktop 面板或屏幕绘制。', 'desktop-runtime-proof-title'],
        ],
        child: [
          ['创建独立 thread', 'observed', '父级收到 child thread ID，child rollout 与 parent 关联。', 'native-cli-trace-title'],
          ['执行并完成', 'observed', 'child 返回指定 marker，父级 wait 收到完成状态。', 'native-cli-trace-title'],
          ['独立于 parent turn', 'observed', '捕获顺序显示父级等待 child；它不表示两个模型请求的精确重叠时长。', 'native-cli-trace-title'],
          ['状态与消息由 wait 返回', 'observed', '该运行记录了 wait 的状态和 child 消息。', 'native-cli-trace-title'],
          ['不适用 · CLI 探针', 'unknown', '这份运行没有 Desktop renderer 或 React 绘制证据。', 'desktop-runtime-proof-title'],
        ],
        coordinator: [
          ['V1 spawn handler', 'source', '源代码解释工具处理路径；实际 child ID 和调用来自上方单次 CLI 捕获。', 'spawn-protocol-title'],
          ['控制器创建 child', 'source', '本格只引用对应机制的源码解释，不补充未记录的运行时内部事件。', 'spawn-protocol-title'],
          ['wait 汇总已选 agent', 'observed', '父级工具调用记录能证明该次 wait 返回；不能推广到其他运行。', 'native-cli-trace-title'],
          ['终态与结果同次捕获', 'observed', '显示的是该探针观测到的响应，不把它当作通用时序保证。', 'native-cli-trace-title'],
          ['没有 UI 协调记录', 'unknown', 'CLI 捕获不能证明 Desktop 对 child 行的筛选或绘制。', 'desktop-runtime-proof-title'],
        ],
        desktop: [
          ['未覆盖', 'unknown', 'V1 CLI 探针不观察 Desktop。', 'desktop-runtime-proof-title'],
          ['未覆盖', 'unknown', '未运行 Desktop child 生命周期捕获。', 'desktop-runtime-proof-title'],
          ['未覆盖', 'unknown', '未记录 Desktop panel selection 或历史 hydration。', 'desktop-runtime-proof-title'],
          ['未覆盖', 'unknown', '没有关联 Desktop app-server 通知的证据。', 'desktop-runtime-proof-title'],
          ['未知 · 无 Desktop capture', 'unknown', '不能从 CLI 运行推断 Desktop 的 renderer、React commit 或 visible paint。', 'desktop-runtime-proof-title'],
        ],
      },
    },
    'v2-source': {
      label: 'V2 · 固定源码', badge: 'PINNED PUBLIC SOURCE · STATIC PATHS',
      note: '此视图汇总固定 Codex 源码中 V2 的路径。节点是代码所描述的控制流，不是一次运行捕获；源码顺序不代表耗时或保证每个分支都会执行。',
      cells: {
        parent: [
          ['spawn_agent 发起创建', 'source', 'V2 handler 将任务交给共享 AgentControl 接口。', 'spawn-protocol-title'],
          ['可继续或调用 wait', 'source', 'spawn 接受与 child 完成是分离边界；父级可以继续，也可另行等待。', 'spawn-protocol-title'],
          ['QueueOnly / TriggerTurn', 'source', '消息模式决定排队和 turn 唤醒语义；提交成功不等于 child 已读取。', 'delivery-flow-title'],
          ['activity 与 parent result 分路', 'source', '生命周期 activity、wait 结果和消息 mailbox 是不同信号。', 'completion-route-title'],
          ['不描述 Desktop renderer', 'unknown', '这些 core 源码不能证明 Desktop 如何呈现具体 child。', 'renderer-update-pipeline-title'],
        ],
        child: [
          ['接受后创建 child', 'source', '共享控制器负责生成 child session；V2 调用路径不等于每次都成功。', 'spawn-protocol-title'],
          ['child turn 运行', 'source', 'child 的 turn 与父级 turn 有独立状态；具体模型行为需运行证据。', 'spawn-protocol-title'],
          ['消息可入队或触发 turn', 'source', 'QueueOnly 不主动启动 turn；TriggerTurn 会走调度路径，但消费仍需单独确认。', 'delivery-flow-title'],
          ['完成状态 / 消息交付', 'source', '代码分别建模终态 activity、wait 返回及 parent mailbox 的消息。', 'completion-route-title'],
          ['不描述 Desktop renderer', 'unknown', 'V2 core 源码没有呈现安装版 Desktop UI 的证据。', 'renderer-update-pipeline-title'],
        ],
        coordinator: [
          ['V2 tool handler → AgentControl', 'source', '协议版本决定工具 handler；controller backend 是独立选择。', 'spawn-protocol-title'],
          ['执行容量与 runtime 管理', 'source', '容量、会话状态和生命周期由共享 agent runtime 管理。', 'spawn-protocol-title'],
          ['Mailbox + turn scheduler', 'source', '入队、activity 通知、turn 调度是不同操作。', 'delivery-flow-title'],
          ['wait / result routes', 'source', '状态聚合与 parent result 路由不应合并理解成一个完成事件。', 'completion-route-title'],
          ['核心协议未给出 UI commit', 'unknown', '应用层 renderer、React commit 和可见绘制需独立证据。', 'renderer-update-pipeline-title'],
        ],
        desktop: [
          ['不在该源码范围', 'unknown', '本场景只展示固定 V2 core 源码。', 'desktop-runtime-proof-title'],
          ['不在该源码范围', 'unknown', 'child turn 源码不能证明 Desktop 是否选中该 child。', 'desktop-runtime-proof-title'],
          ['不在该源码范围', 'unknown', '消息调度源码不能证明 renderer 收到增量。', 'desktop-runtime-proof-title'],
          ['不在该源码范围', 'unknown', '结果路由源码不能证明面板显示了结果。', 'desktop-runtime-proof-title'],
          ['未知 · 需同版本运行捕获', 'unknown', 'UI 投影、组件提交和屏幕绘制没有由这组 core 源码建立。', 'desktop-runtime-proof-title'],
        ],
      },
    },
    desktop20586: {
      label: 'Desktop · build 20586', badge: 'RUNTIME LINKAGE + STATIC RENDERER',
      note: '同一 build 的运行摘要将两个 child ID 与 Desktop app-server 的读取 / 生命周期请求关联起来；其余 UI 路径来自静态资源检查。没有从 spawn 到屏幕绘制的同会话端到端记录。',
      cells: {
        parent: [
          ['parent rollout 记录 child IDs', 'observed', '脱敏运行摘要保留 parent rollout 中的两个 child ID。', 'desktop-runtime-proof-title'],
          ['父级后续行为未完整捕获', 'unknown', '现有摘要聚焦关联 child 和 Desktop 请求，不能补全 parent turn 的控制权时序。', 'desktop-runtime-proof-title'],
          ['turn/start 等请求已关联', 'observed', 'Desktop app-server 关联日志出现对应 child 的 turn/start；不表示由这一步创建 child。', 'desktop-runtime-proof-title'],
          ['thread/name/set 被记录', 'observed', '可证明 app-server 处理了关联线程命名请求，不证明 UI 已显示。', 'desktop-runtime-proof-title'],
          ['未观察父级 UI 更新', 'unknown', '运行摘要没有 capture 对应 parent transcript 的 renderer commit。', 'desktop-runtime-proof-title'],
        ],
        child: [
          ['child IDs 与 parent 关联', 'observed', '两个 child ID 可在 parent rollout 与 Desktop 关联记录间对照。', 'desktop-runtime-proof-title'],
          ['thread/read 已记录', 'observed', '该次会话的 Desktop GUI 关联日志处理了 child thread/read 请求。', 'desktop-runtime-proof-title'],
          ['child turn/start 已记录', 'observed', '生命周期请求有日志证据，但不包含每条消息是否被模型消费。', 'desktop-runtime-proof-title'],
          ['activity / item delta 未捕获', 'unknown', '现有运行记录没有对应 subAgentActivity 或 transcript delta 事件。', 'desktop-runtime-proof-title'],
          ['child panel paint 未观察', 'unknown', '没有 DOM、React commit 或屏幕绘制记录。', 'desktop-runtime-proof-title'],
        ],
        coordinator: [
          ['具体 controller 仍未知', 'unknown', '安装版静态二进制有 controller 构造路径，但该会话选用的动态 receiver 未确定。', 'desktop-runtime-proof-title'],
          ['读取与 turn 请求有日志', 'observed', '可确认 app-server 处理这些请求；不能据此还原全部调度事件。', 'desktop-runtime-proof-title'],
          ['增量转发是静态路径', 'source', '安装版资源显示 forwarding gate 与分队列；本次运行没有对应 delta 捕获。', 'renderer-update-pipeline-title'],
          ['history 与 transcript 路径', 'source', '静态 renderer 代码说明如何 hydrate child 与接收 transcript 更新。', 'renderer-read-path-title'],
          ['React commit / paint 未知', 'unknown', '静态状态投影不证明组件已提交或屏幕已绘制。', 'renderer-update-pipeline-title'],
        ],
        desktop: [
          ['panel row 来自 parent projection', 'source', 'build 20586 静态 selector 从 parent 相关来源投影 rows。', 'topology-map-title'],
          ['child history 按需读取', 'source', '选中 child 后会校验 ancestry，并按状态 hydrate 分页历史。', 'renderer-read-path-title'],
          ['事件有 forwarding gate', 'source', '不同 item family 经过不同队列和目标匹配条件。', 'renderer-delta-title'],
          ['store 更新不等于显示', 'source', 'renderer store/list 连接可静态追踪，仍缺该会话的 commit/paint 证据。', 'renderer-update-pipeline-title'],
          ['未知 · end-to-end paint', 'unknown', '本机证据止于关联 app-server 请求；没有可见 UI 绘制的运行观测。', 'renderer-update-pipeline-title'],
        ],
      },
    },
  };
  const scenario = scenarios[interactionCompareVersion] ?? scenarios['v1-capture'];
  const laneNames = [['parent','PARENT','父线程'],['child','CHILD','子线程'],['coordinator','COORDINATOR','协调器 / app-server'],['desktop','DESKTOP UI','桌面界面']];
  const laneMarkup = laneNames.map(([key, label, title]) => `<div class="interaction-compare-lane" data-lane="${key}"><div class="interaction-compare-actor"><span>${label}</span><strong>${title}</strong></div><div class="interaction-compare-cells">${scenario.cells[key].map((cell,index) => `<a class="interaction-compare-cell evidence-${cell[1]} ${interactionCompareSelection === `${key}-${index}` ? 'is-selected' : ''}" href="#${cell[3]}" data-interaction-cell="${key}-${index}" data-evidence="${cell[1]}" aria-current="${interactionCompareSelection === `${key}-${index}` ? 'true' : 'false'}"><span>${phases[index][0]} · ${cell[1] === 'observed' ? 'OBSERVED' : cell[1] === 'source' ? 'SOURCE' : 'UNKNOWN'}</span><strong>${cell[0]}</strong><i aria-hidden="true">↗</i></a>`).join('')}</div></div>`).join('');
  const [laneKey, cellIndex] = interactionCompareSelection.split('-');
  const selected = scenario.cells[laneKey]?.[Number(cellIndex)] ?? scenario.cells.parent[0];
  const selectedLane = laneNames.find(([key]) => key === laneKey)?.[2] ?? '父线程';
  return `<section class="interaction-compare" aria-labelledby="interaction-compare-title">
    <header class="interaction-compare-head"><div><span>THREE EVIDENCE LENSES · SHARED PHASE AXIS</span><h4 id="interaction-compare-title">创建之后：控制权、结果与 UI 分别走哪条路？</h4><p>按阶段并排读三类材料；每个节点可跳到已有证据图。</p></div><span class="interaction-compare-badge">${scenario.badge}</span></header>
    <div class="interaction-compare-controls" role="group" aria-label="选择证据视图">${Object.entries(scenarios).map(([id,item]) => `<button type="button" data-interaction-version="${id}" aria-pressed="${id === interactionCompareVersion}">${item.label}</button>`).join('')}</div>
    <div class="interaction-compare-legend" aria-label="证据状态图例"><span><i class="observed"></i>运行直接观测</span><span><i class="source"></i>静态源码路径</span><span><i class="unknown"></i>当前未知 / 未覆盖</span></div>
    <div class="interaction-compare-scroll"><div class="interaction-compare-grid" role="table" aria-label="父线程、子线程、协调器和桌面界面的阶段对照"><div class="interaction-compare-axis"><span>ACTOR</span>${phases.map(([key,index,label]) => `<span data-phase="${key}"><i>${index}</i><b>${label}</b></span>`).join('')}</div>${laneMarkup}</div></div>
    <article class="interaction-compare-readout" aria-live="polite"><div><span>SELECTED EVIDENCE</span><b>${selectedLane} · ${selected[1] === 'observed' ? '运行观测' : selected[1] === 'source' ? '源码路径' : '未知 / 未覆盖'}</b></div><strong>${selected[0]}</strong><p>${selected[2]}</p><a href="#${selected[3]}">跳转到相关细节 ↗</a></article>
    <p class="interaction-compare-boundary">${scenario.note} 横向阶段表达语义顺序，不代表耗时比例；不同视图是不同证据来源，不能拼成同一条运行轨迹。</p>
  </section>`;
}

function renderMechanismExplorer() {
  const root = $('#mechanism-explorer');
  if (!root) return;
  const groups = [
    { step: 0, title: '运行前配置', summary: '版本解析、handler 与 controller 选择', content: `${selectionBoundariesMarkup()}${packagedCliFeatureRegistryMarkup()}${currentMainDeltaMarkup()}` },
    { step: 1, title: '创建子线程', summary: '二进制调用与事件投影', content: `${standaloneStaticSpawnTraceMarkup()}${appServerProjectionMarkup()}` },
    { step: 2, title: '并行协调', summary: '线程归属、历史与读取路径', content: `${appServerHydrationMarkup()}${rendererReadPathMarkup()}` },
    { step: 3, title: '回传结果', summary: '状态、结果与界面更新', content: `${interactionCompareMarkup()}${rendererUpdatePipelineMarkup()}` },
    { step: 4, title: '停止与清理', summary: '不同关闭路径的责任边界', content: shutdownScopeMarkup() },
    { step: 5, title: '打开并检查子线程', summary: 'Desktop 选择、恢复与历史加载', content: `${desktopHydrationMarkup()}${desktopBuild20586Markup()}` }
  ];
  const step = mechanismExplorerSteps[mechanismExplorerStep];
  const visibleCount = mechanismExplorerShowAll ? groups.length : 1;
  root.innerHTML = `<div class="mechanism-explorer-steps" role="group" aria-label="Subagent lifecycle stages">${mechanismExplorerSteps.map((item, index) => `<button type="button" data-mechanism-step="${index}" aria-pressed="${index === mechanismExplorerStep}" ${index === mechanismExplorerStep ? 'aria-current="step"' : ''} aria-label="Stage ${index + 1} of ${mechanismExplorerSteps.length}: ${item.label}"><span>0${index + 1}</span><b>${item.label}</b></button>`).join('')}</div><article class="mechanism-explorer-detail" aria-live="polite"><div><span>STEP 0${mechanismExplorerStep + 1} · ${step.label.toUpperCase()}</span><a href="${step.href}" target="_blank" rel="noreferrer">${step.source} ↗</a></div><h4>${step.title}</h4><p>${step.text}</p></article><div class="mechanism-evidence-toolbar"><span aria-live="polite">${mechanismExplorerShowAll ? `ALL 6 STAGES · ${groups.length} evidence groups` : `${step.label.toUpperCase()} · ${groups[mechanismExplorerStep].summary}`}</span><button type="button" data-mechanism-show-all aria-pressed="${mechanismExplorerShowAll}">${mechanismExplorerShowAll ? 'Focus this stage' : 'Show all evidence maps'}</button></div><div class="mechanism-evidence-groups">${groups.map((group, index) => `<section class="mechanism-evidence-group" data-mechanism-evidence-group="${index}" aria-labelledby="mechanism-evidence-title-${index}" ${!mechanismExplorerShowAll && index !== mechanismExplorerStep ? 'hidden' : ''}><header><span>STAGE 0${index + 1} · ${mechanismExplorerSteps[index].label.toUpperCase()}</span><h5 id="mechanism-evidence-title-${index}">${group.title}</h5><p>${group.summary}</p></header>${group.content}</section>`).join('')}</div><p class="mechanism-explorer-version">Each visualization links to its pinned source snapshot. Static source analysis; no live lifecycle action is implied.</p>`;
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
function boardWriteMarkup() {
  const selected = boardWriteScenario;
  const scenarios = {
    'busy-clears': {
      attempt: 'BUSY → wait 100 ms → BUSY → wait 200 ms → admitted',
      outcome: 'Transaction commits; notification fanout starts once',
      note: 'The retry helper retries only SQLite BUSY-family writer admission. Each attempt uses the configured SQLite busy timeout; the 100 ms and 200 ms delays are additional backoff, not a total-time guarantee.'
    },
    'recipient-inactive': {
      attempt: 'Writer admitted → post committed',
      outcome: 'Notice skipped for inactive recipient; post remains stored',
      note: 'The notice uses trigger_turn=false. A missing or inactive runtime does not get started; the committed post remains available through board tools.'
    },
    'writer-busy': {
      attempt: 'BUSY → wait 100 ms → BUSY → wait 200 ms → BUSY',
      outcome: 'Admission fails; no post commit and no notification fanout',
      note: 'There is one initial attempt and at most two retries. Time spent inside SQLite busy_timeout is separate, so this diagram does not claim a fixed end-to-end duration.'
    }
  };
  const scenario = scenarios[selected] ?? scenarios['busy-clears'];
  return `<section class="board-write-trace" data-board-case="${selected}" aria-labelledby="board-write-title">
    <div class="board-write-heading"><div><span class="board-write-eyebrow">V2 AGENT MESSAGE BOARD · SQLITE + NOTICE FANOUT</span><h5 id="board-write-title">先提交帖子，再尽力通知订阅者</h5></div><span>public main · 7ae8319</span></div>
    <p class="board-write-intro">这条路径是 agent message board 的 channel/thread 帖子。它与 mailbox 的 send_message 队列是不同机制。</p>
    <div class="board-write-controls" role="group" aria-label="选择消息板写入场景">
      <button type="button" data-board-write-case="busy-clears" aria-pressed="${selected === 'busy-clears'}">短暂写锁冲突</button>
      <button type="button" data-board-write-case="recipient-inactive" aria-pressed="${selected === 'recipient-inactive'}">接收者未活动</button>
      <button type="button" data-board-write-case="writer-busy" aria-pressed="${selected === 'writer-busy'}">重试耗尽</button>
    </div>
    <div class="board-write-sequence" data-outcome="${selected}" aria-live="polite">
      <article class="board-write-step"><span>01 · REQUEST</span><strong>校验并解析</strong><p>校验帖子/request ID/通知人数；解析作者和显式接收者；提交前后都按 request ID 检查幂等结果。</p></article>
      <i aria-hidden="true">→</i>
      <article class="board-write-step write-admission"><span>02 · SQLITE WRITER ADMISSION</span><strong>BEGIN IMMEDIATE</strong><p data-board-attempt>${scenario.attempt}</p><small>仅在事务开始前重试 BUSY 家族错误；事务一旦开始，不重放帖子操作。</small></article>
      <i aria-hidden="true">→</i>
      <article class="board-write-step write-commit"><span>03 · ATOMIC POST</span><strong data-board-commit>${selected === 'writer-busy' ? '未提交' : '帖子 + 默认订阅提交'}</strong><p>帖子和作者参与订阅在同一事务内写入；成功后才开始通知。</p></article>
      <i aria-hidden="true">→</i>
      <article class="board-write-step write-notice"><span>04 · BEST-EFFORT NOTICE</span><strong data-board-outcome>${scenario.outcome}</strong><p>提交后最多并发通知 16 个接收者；通知错误被记录，不回滚已提交帖子。</p></article>
    </div>
    <p class="board-write-note" data-board-note>${scenario.note}</p>
    <p class="board-write-boundary">边界：post 成功表示帖子持久化，不表示每个接收者都收到通知或采取行动。源码里的通知使用 <code>trigger_turn=false</code>；“Accepted”也不等同于模型已读。</p>
    <p class="board-write-sources"><a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/state/src/sqlite/busy_retry.rs" target="_blank" rel="noreferrer">SQLite retry helper</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/ext/agent-message-board/src/local.rs" target="_blank" rel="noreferrer">local post transaction</a> · <a href="https://github.com/openai/codex/blob/7ae831991792744434027c431dfbc7e81dd5c12c/codex-rs/core/src/agent_message_board.rs" target="_blank" rel="noreferrer">notification delivery</a></p>
  </section>`;
}
function selectBoardWriteScenario(scenario) {
  boardWriteScenario = ['recipient-inactive', 'writer-busy'].includes(scenario) ? scenario : 'busy-clears';
  const panel = $('.board-write-trace');
  if (!panel) return;
  const selected = boardWriteScenario;
  const details = {
    'busy-clears': ['BUSY → wait 100 ms → BUSY → wait 200 ms → admitted', 'Transaction commits; notification fanout starts once', 'The retry helper retries only SQLite BUSY-family writer admission. Each attempt uses the configured SQLite busy timeout; the 100 ms and 200 ms delays are additional backoff, not a total-time guarantee.'],
    'recipient-inactive': ['Writer admitted → post committed', 'Notice skipped for inactive recipient; post remains stored', 'The notice uses trigger_turn=false. A missing or inactive runtime does not get started; the committed post remains available through board tools.'],
    'writer-busy': ['BUSY → wait 100 ms → BUSY → wait 200 ms → BUSY', 'Admission fails; no post commit and no notification fanout', 'There is one initial attempt and at most two retries. Time spent inside SQLite busy_timeout is separate, so this diagram does not claim a fixed end-to-end duration.']
  }[selected];
  panel.dataset.boardCase = selected;
  panel.querySelectorAll('[data-board-write-case]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.boardWriteCase === selected)));
  panel.querySelector('[data-board-attempt]').textContent = details[0];
  panel.querySelector('[data-board-outcome]').textContent = details[1];
  panel.querySelector('[data-board-note]').textContent = details[2];
  panel.querySelector('[data-board-commit]').textContent = selected === 'writer-busy' ? '未提交' : '帖子 + 默认订阅提交';
  panel.querySelector('.write-commit').classList.toggle('blocked', selected === 'writer-busy');
  panel.querySelector('.write-notice').classList.toggle('blocked', selected === 'writer-busy');
}
function toolExposureMarkup() {
  const cases = {
    root: { title: 'Root V2 turn', source: 'Root has no agent path', model: 'metadata: None', allowed: true, picker: null, reason: 'The V2 gate allows the root independently of model multi-agent metadata.' },
    'child-v2': { title: 'Child V2-capable model', source: 'Non-root child', model: 'metadata: Some(V2)', allowed: true, picker: true, reason: 'A non-root V2 turn receives collaboration tools only when its selected model explicitly declares V2 support.' },
    'child-unknown': { title: 'Child without V2 metadata', source: 'Non-root child', model: 'metadata: None', allowed: false, picker: true, reason: 'The session can still be V2, but this child model fails the stricter tool-plan gate because None is not Some(V2).' },
    'child-v1': { title: 'Child marked V1', source: 'Non-root child', model: 'metadata: Some(V1)', allowed: false, picker: true, reason: 'V1 metadata also fails the non-root V2 collaboration-tool gate.' }
  };
  const item = cases[toolExposureScenario] ?? cases['child-unknown'];
  const tools = item.allowed ? ['spawn_agent', ...(toolExposureDisableMessages ? [] : ['send_message', 'followup_task']), ...(toolExposureWaitEnabled ? ['wait_agent'] : []), 'interrupt_agent', 'list_agents'] : [];
  const exposure = 'DirectModelOnly';
  return `<section class="tool-exposure-trace" aria-labelledby="tool-exposure-title" data-exposure-allowed="${item.allowed}">
    <div class="tool-exposure-heading"><div><span class="tool-exposure-eyebrow">V2 TOOL PLAN · MODEL CAPABILITY GATE</span><h5 id="tool-exposure-title">V2 会话不代表每个 child 都能继续派生 agent</h5></div><span>source · 740e5af</span></div>
    <p class="tool-exposure-intro">选择 turn 类型与模型 metadata，查看 add_collaboration_tools 是否注册 V2 工具。这个门控看的是当前 turn 的模型能力，不只是线程上记录的 V2 版本。</p>
    <div class="tool-exposure-cases" role="group" aria-label="选择 V2 工具暴露场景">
      <button type="button" data-tool-exposure-case="root" aria-pressed="${toolExposureScenario === 'root'}">Root · metadata 无关</button>
      <button type="button" data-tool-exposure-case="child-v2" aria-pressed="${toolExposureScenario === 'child-v2'}">Child · Some(V2)</button>
      <button type="button" data-tool-exposure-case="child-unknown" aria-pressed="${toolExposureScenario === 'child-unknown'}">Child · None</button>
      <button type="button" data-tool-exposure-case="child-v1" aria-pressed="${toolExposureScenario === 'child-v1'}">Child · Some(V1)</button>
    </div>
    <div class="tool-exposure-model">
      <article><span>THREAD SOURCE</span><strong>${item.source}</strong><small>multi_agent_version = V2</small></article><i aria-hidden="true">+</i>
      <article><span>MODEL INFO</span><strong>${item.model}</strong><small>model_info.multi_agent_version</small></article><i aria-hidden="true">→</i>
      <article class="tool-exposure-gate"><span>COLLAB TOOLS GATE</span><strong>${item.allowed ? 'PASS · register tools' : 'BLOCK · register none'}</strong><small>${item.allowed ? 'root || Some(V2)' : 'non-root requires Some(V2)'}</small></article>
    </div>
    <div class="tool-exposure-options" aria-label="Independent V2 tool configuration">
      <label><input type="checkbox" data-tool-disable-messages ${toolExposureDisableMessages ? 'checked' : ''}><span><b>disable_direct_message</b><small>removes send_message + followup_task</small></span></label>
      <label><input type="checkbox" data-tool-wait-enabled ${toolExposureWaitEnabled ? 'checked' : ''}><span><b>wait_agent_enabled</b><small>independently controls wait_agent</small></span></label>
    </div>
    <div class="tool-exposure-result"><div><span>MODEL TOOL LIST</span><div>${tools.length ? tools.map(name => `<code>${name}</code>`).join('') : '<b class="tool-exposure-empty">No V2 collaboration tools registered for this turn</b>'}</div></div><div><span>DEFAULT EXPOSURE</span><strong>${item.allowed ? exposure : 'not registered'}</strong><small>non_code_mode_only = true → DirectModelOnly</small></div></div>
    <p class="tool-exposure-explanation" aria-live="polite">${item.reason}</p>
    <div class="tool-exposure-picker" data-picker-eligible="${item.picker}"><div><span>SPAWN MODEL PICKER</span><strong>${item.picker === null ? 'not applicable to a root turn' : item.picker ? 'ELIGIBLE · not explicitly Disabled' : 'HIDDEN · explicitly Disabled'}</strong></div><i aria-hidden="true">≠</i><div><span>CHILD COLLAB TOOLS</span><strong>${item.allowed ? 'available if other gates pass' : 'not registered for this child turn'}</strong></div></div>
    <p class="tool-exposure-boundary">Picker eligibility and child tool-plan eligibility are different checks. The model picker excludes only models explicitly marked Disabled; a non-root V2 turn requires exactly Some(V2) to register recursive collaboration tools.</p>
    <p class="tool-exposure-sources"><a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/tools/spec_plan.rs#L719-L731" target="_blank" rel="noreferrer">collab_tools_enabled</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/tools/spec_plan.rs#L1373-L1465" target="_blank" rel="noreferrer">tool registration</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/child_config.rs#L22-L28" target="_blank" rel="noreferrer">picker model filter</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/config/mod.rs#L1366-L1387" target="_blank" rel="noreferrer">V2 defaults</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/tools/src/tool_executor.rs#L49-L98" target="_blank" rel="noreferrer">tool exposure surfaces</a></p>
  </section>`;
}
function selectToolExposureCase(scenario) {
  toolExposureScenario = ['root', 'child-v2', 'child-unknown', 'child-v1'].includes(scenario) ? scenario : 'child-unknown';
  const panel = $('.tool-exposure-trace');
  if (panel) panel.outerHTML = toolExposureMarkup();
}
function updateToolExposureOption(key, enabled) {
  if (key === 'messages') toolExposureDisableMessages = enabled;
  if (key === 'wait') toolExposureWaitEnabled = enabled;
  const panel = $('.tool-exposure-trace');
  if (panel) panel.outerHTML = toolExposureMarkup();
}
function waitScopeMarkup() {
  const scenarios = {
    'nested-relay': {
      root: { state:'wake', event:'Root mailbox receives child summary', result:'wait_agent wakes on mailbox activity' },
      child: { state:'relay', event:'Child receives grandchild result', result:'Child wait wakes; child reads and relays a summary' },
      grandchild: { state:'sent', event:'Grandchild completes', result:'Final result is addressed to its structural parent' },
      routes: ['Grandchild → direct parent: final result', 'Child → root: explicit summary message'],
      timeline: [
        ['GRANDCHILD', 'Final result goes to its structural parent', 'The spawn-time parent edge routes the grandchild result to the child.'],
        ['CHILD', 'Child wait receives mailbox activity', 'The child reads the grandchild result, then sends an explicit summary to root.'],
        ['ROOT', 'Root inbox receives the child summary', 'The root wait wakes on activity in the root input queue.'],
        ['ROOT', 'Read the message body', 'wait_agent reports activity; read_messages retrieves the queued summary.']
      ],
      outcome: 'Root wakes only after the child sends a message to the root mailbox. The wait returns activity status; read_messages retrieves the body.',
      label: 'CONTROLLED NESTED RUN · BOTH WAITS COMPLETED'
    },
    'cross-ancestor': {
      root: { state:'timeout', event:'Root sees Completed activity', result:'Root mailbox has no grandchild result; wait times out' },
      child: { state:'inbox', event:'Structural parent receives result', result:'Grandchild result follows the spawn-time parent edge' },
      grandchild: { state:'sent', event:'Follow-up turn completes', result:'Completed activity is emitted to initiating thread' },
      routes: ['Grandchild → initiating thread: lifecycle activity', 'Grandchild → structural parent: final result'],
      timeline: [
        ['GRANDCHILD', 'Follow-up turn completes', 'The child result is addressed to the structural parent.'],
        ['ROOT', 'Root observes Completed activity', 'This lifecycle record is visible to root, but it is not a root mailbox message.'],
        ['ROOT', 'Pending wait remains asleep', 'In the controlled probe, the Completed activity did not wake wait_agent.'],
        ['ROOT', 'Wait reaches its timeout', 'The child result remains with the structural parent; no automatic relay reached root.']
      ],
      outcome: 'The root-visible Completed item is not mailbox activity. In the controlled pending-wait probe it arrived during the wait, but did not wake it.',
      label: 'CONTROLLED CLI PROBE · ROOT WAIT TIMED OUT'
    },
    'direct-mail': {
      root: { state:'wake', event:'Root mailbox receives explicit message', result:'wait_agent wakes before Completed activity' },
      child: { state:'idle', event:'Intermediate child', result:'No automatic relay is required for this route' },
      grandchild: { state:'sent', event:'Grandchild sends to /root', result:'Explicit message targets the root inbox' },
      routes: ['Grandchild → root: explicit mailbox message', 'Root wait wakes on its own InputQueue activity'],
      timeline: [
        ['GRANDCHILD', 'Send an explicit message to root', 'The recipient is /root, so the message targets the root input queue.'],
        ['ROOT', 'Root mailbox activity wakes the wait', 'This is a message event on the queue the root is waiting on.'],
        ['ROOT', 'Read the message body', 'The wait returns activity status; read_messages fetches the queued text.'],
        ['GRANDCHILD', 'Completion activity arrives later', 'The controlled run observed the mailbox wake before this later lifecycle event.']
      ],
      outcome: 'The control run returned from root wait before the later Completed activity arrived. This demonstrates mailbox wake behavior for this tested run.',
      label: 'CONTROLLED MAILBOX CONTROL · ROOT WAIT WOKE'
    }
  };
  const scenario = scenarios[waitScopeScenario] ?? scenarios['nested-relay'];
  const activeStep = Math.min(waitScopeStep, scenario.timeline.length - 1);
  const [activeActor, activeTitle, activeDetail] = scenario.timeline[activeStep];
  return `<section class="wait-scope" data-wait-scope="${waitScopeScenario}" aria-labelledby="wait-scope-title">
    <div class="wait-scope-heading"><div><span class="wait-scope-eyebrow">WAIT_AGENT · ROUTING SCOPE</span><h5 id="wait-scope-title">Who can wake this wait?</h5></div><span class="wait-scope-version">CLI 0.162.1 · source 3ee47c1</span></div>
    <p class="wait-scope-intro">A wait subscribes to the caller’s own input queue. Follow the addressed route; lifecycle activity and mailbox messages are separate signals.</p>
    <div class="wait-scope-controls" role="group" aria-label="Choose a nested completion scenario">
      <button type="button" data-wait-scope-case="nested-relay" aria-pressed="${waitScopeScenario === 'nested-relay'}">Nested result + relay</button>
      <button type="button" data-wait-scope-case="cross-ancestor" aria-pressed="${waitScopeScenario === 'cross-ancestor'}">Root follows up grandchild</button>
      <button type="button" data-wait-scope-case="direct-mail" aria-pressed="${waitScopeScenario === 'direct-mail'}">Grandchild messages root</button>
    </div>
    <div class="wait-scope-lanes" data-case="${waitScopeScenario}" aria-live="polite">
      ${[['root','ROOT',scenario.root],['child','CHILD · STRUCTURAL PARENT',scenario.child],['grandchild','GRANDCHILD',scenario.grandchild]].map(([id,label,node]) => `<article class="wait-scope-lane ${id}" data-state="${node.state}"><span class="wait-scope-lane-label">${label}</span><strong>${node.event}</strong><small>${node.result}</small></article>`).join('')}
    </div>
    <section class="wait-scope-timeline" aria-label="Step through the observed event sequence">
      <div class="wait-scope-timeline-heading"><span>EVENT ORDER · SELECT A STEP</span><span>${activeStep + 1} / ${scenario.timeline.length}</span></div>
      <div class="wait-scope-timeline-track" role="group" aria-label="Observed event steps">${scenario.timeline.map(([actor,title],index) => `<button type="button" class="wait-scope-event ${index < activeStep ? 'past' : ''} ${index === activeStep ? 'active' : ''}" data-wait-scope-step="${index}" aria-pressed="${index === activeStep}" aria-label="Step ${index + 1}: ${actor}, ${title}"><i>${String(index + 1).padStart(2,'0')}</i><span>${actor}</span></button>`).join('')}</div>
      <article class="wait-scope-event-detail" aria-live="polite" data-actor="${activeActor.toLowerCase()}"><span>${activeActor}</span><strong>${activeTitle}</strong><small>${activeDetail}</small></article>
    </section>
    <div class="wait-scope-routes" aria-label="Message routing"><span class="wait-scope-route-label">ROUTES IN THIS SCENARIO</span>${scenario.routes.map((route,index) => `<div class="wait-scope-route"><i aria-hidden="true">${index ? '↗' : '↙'}</i><span>${route}</span></div>`).join('')}</div>
    <p class="wait-scope-outcome" aria-live="polite"><b>${scenario.label}</b><span>${scenario.outcome}</span></p>
    <p class="wait-scope-boundary">Observed in four controlled standalone CLI 0.162.1 runs; not a guarantee for all versions/providers and not a Desktop runtime trace. Source snapshot <code>3ee47c1</code> describes the public implementation.</p>
    <p class="wait-scope-sources"><a href="https://github.com/openai/codex/blob/3ee47c10513f1bb57d869ea650aba28638e3d11c/codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs" target="_blank" rel="noreferrer">wait handler</a> · <a href="https://github.com/openai/codex/blob/3ee47c10513f1bb57d869ea650aba28638e3d11c/codex-rs/core/src/agent/control/completion.rs" target="_blank" rel="noreferrer">completion routing</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#controlled-v2-follow-up-while-root-wait-is-pending-future-completed-activity-did-not-wake-it" target="_blank" rel="noreferrer">controlled probe ledger</a></p>
  </section>`;
}
function waitContractMarkup() {
  const cases = {
    'target-complete': {
      label: 'Requested child finishes',
      v1: { state: 'wake', title: 'Returns that child’s final status', detail: 'The wait subscribes to the selected target. A final status ends the wait; the result is keyed by agent ID.' },
      v2: { state: 'wake', title: 'Mailbox activity wakes the wait', detail: 'If the child result is queued to this parent, it can wake the shared input-activity wait. Output stays generic: “Wait completed.”' },
      delivery: 'Child result follows a separate parent-message route. The wait output does not carry its body.'
    },
    'other-mail': {
      label: 'Another child sends a message',
      v1: { state: 'pending', title: 'Selected target is still running', detail: 'Mail from a different child is not the requested target’s final status.' },
      v2: { state: 'wake', title: 'Any parent mailbox activity wakes it', detail: 'The wait does not identify which child sent mail or include its text.' },
      delivery: 'The message payload stays in the parent’s input/history path and is delivered separately from the wait result.'
    },
    steer: {
      label: 'User steers the parent',
      v1: { state: 'pending', title: 'Target status has not changed', detail: 'User input is not a final status for the selected child.' },
      v2: { state: 'interrupt', title: 'Returns “interrupted by new input”', detail: 'Steer activity shares the V2 input-activity watch channel with mailbox activity.' },
      delivery: 'The steer is parent input. It is not a child completion message.'
    },
    timeout: {
      label: 'No matching event before timeout',
      v1: { state: 'timeout', title: 'Returns timed_out with no target result', detail: 'The V1 handler returns statuses observed at the completion boundary; an empty result is timed out.' },
      v2: { state: 'timeout', title: 'Returns timed_out=true', detail: 'The V2 outcome carries no agent ID, status, or message body.' },
      delivery: 'No child result was delivered by this wait. A later mailbox message is a separate event.'
    }
  };
  const selected = cases[waitContractEvent] ?? cases['target-complete'];
  const renderContract = (version, item, scope) => `<article class="wait-contract-card ${scope}" data-state="${item.state}"><div class="wait-contract-card-head"><span>${version}</span><span>${scope === 'v1' ? 'TARGET STATUS' : 'PARENT INPUT QUEUE'}</span></div><strong>${item.title}</strong><p>${item.detail}</p><div class="wait-contract-return"><span>WAIT RESULT</span><b>${scope === 'v1' ? (item.state === 'wake' ? 'agent_id → final status' : item.state === 'timeout' ? 'timed_out · no status' : 'still waiting') : item.state === 'wake' ? 'Wait completed · timed_out=false' : item.state === 'interrupt' ? 'Wait interrupted by new input' : item.state === 'timeout' ? 'timed_out=true' : 'not awakened'}</b></div></article>`;
  return `<section class="wait-contract" aria-labelledby="wait-contract-title">
    <div class="wait-contract-heading"><div><span>同名工具 · 两种等待契约</span><h5 id="wait-contract-title">“等待子任务”还是“等待父线程有新输入”？</h5></div><span>CODEX SOURCE · 740e5af</span></div>
    <p class="wait-contract-intro">选择一个事件，比较 V1 与 V2 的唤醒条件和返回值。版本差异会改变 <code>wait_agent</code> 的含义。</p>
    <div class="wait-contract-controls" role="group" aria-label="选择等待期间发生的事件">
      ${Object.entries(cases).map(([key, item]) => `<button type="button" data-wait-contract="${key}" aria-pressed="${waitContractEvent === key}">${item.label}</button>`).join('')}
    </div>
    <div class="wait-contract-grid" aria-live="polite" aria-atomic="true">${renderContract('V1 · namespaced', selected.v1, 'v1')}${renderContract('V2 · unnamespaced', selected.v2, 'v2')}</div>
    <div class="wait-contract-delivery"><span>独立的结果消息通道</span><strong>${selected.delivery}</strong><div class="wait-contract-lane"><i>子任务结果 / AgentMessage</i><b aria-hidden="true">→</b><i>父线程 mailbox / history</i><b aria-hidden="true">→</b><i>后续模型输入</i></div></div>
    <p class="wait-contract-boundary">这是固定源码版本的契约对照，不是 Desktop 实时事件。V2 文档描述提到 agent 更新摘要，但此快照的实际输出类型没有 agent 字段；图中以 handler 返回结构为准。</p>
    <p class="wait-contract-sources"><a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/tools/handlers/multi_agents/wait.rs#L120-L218" target="_blank" rel="noreferrer">V1 wait handler</a> · <a href="https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs#L148-L220" target="_blank" rel="noreferrer">V2 wait handler</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#follow-up-v1-waits-for-lifecycle-finals-v2-waits-for-parent-input-activity-and-returns-a-generic-outcome" target="_blank" rel="noreferrer">evidence ledger</a></p>
  </section>`;
}
function selectWaitContract(eventName) {
  waitContractEvent = ['target-complete', 'other-mail', 'steer', 'timeout'].includes(eventName) ? eventName : 'target-complete';
  const panel = $('.wait-contract');
  if (panel) panel.outerHTML = waitContractMarkup();
}
function selectWaitScopeScenario(scenarioName) {
  const container = $('.wait-scope');
  if (!container) return;
  waitScopeScenario = ['nested-relay','cross-ancestor','direct-mail'].includes(scenarioName) ? scenarioName : 'nested-relay';
  waitScopeStep = 0;
  container.outerHTML = waitScopeMarkup();
}
function selectWaitScopeStep(step) {
  const scenarioSteps = { 'nested-relay':4, 'cross-ancestor':4, 'direct-mail':4 }[waitScopeScenario] ?? 1;
  waitScopeStep = Math.max(0, Math.min(scenarioSteps - 1, Number(step) || 0));
  const container = $('.wait-scope');
  if (container) container.outerHTML = waitScopeMarkup();
}
function residencyMarkup() {
  const scenarios = {
    'completed-followup': {
      child: ['resident', 'Completed · idle', 'No active turn or TriggerTurn mail'],
      capacity: ['pressure', 'Capacity fills', 'A later spawn may evict an older eligible runtime'],
      identity: ['kept', 'Runtime unloaded', 'Registry identity and stored thread history remain separate from residency'],
      delivery: ['reload', 'followup_task', 'Attempts to reload the existing V2 thread before starting work'],
      routes: ['Capacity pressure → eligible completed child: unload runtime', 'followup_task → existing child identity: conditional reload → TriggerTurn'],
      outcome: 'The child can disappear from the loaded-runtime list and still be recoverable for follow-up. Reload depends on registry metadata, readable V2 history, parent/environment checks, and a free residency slot.',
      label: 'SOURCE PATH · CONDITIONAL RELOAD'
    },
    'queue-only': {
      child: ['unloaded', 'Child is unloaded', 'The child identity is not a loaded session'],
      capacity: ['idle', 'QueueOnly message', 'send_message does not need to reload a locally evicted child'],
      identity: ['mailbox', 'Runtime mailbox', 'Communication can wait in process memory, keyed by child thread'],
      delivery: ['deferred', 'Later session load', 'Queued communication is read when a session loads and drains its mailbox'],
      routes: ['send_message → runtime mailbox: queued without starting an ordinary idle child', 'Later child session → mailbox input: message can enter a future turn'],
      outcome: 'The inspected path retains queued mail in runtime memory. It does not establish persistence across process restart or guarantee that a future model request consumes it.',
      label: 'SOURCE PATH · IN-MEMORY QUEUE'
    },
    'interrupted-eviction': {
      child: ['interrupted', 'Interrupted · idle', 'Interrupted is an unloadable status when other guards allow it'],
      capacity: ['pressure', 'Residency eviction', 'Capacity reservation may select an eligible interrupted child'],
      identity: ['uncertain', 'Reload boundary', 'The inspected source test expects ThreadNotFound after this eviction'],
      delivery: ['blocked', 'Follow-up may fail', 'Do not assume every unloaded child can be reconstructed'],
      routes: ['Interrupted resident → capacity eviction: runtime removed', 'followup_task → attempted reload: source test expects ThreadNotFound'],
      outcome: 'The source has a specific test showing an interrupted V2 child lost after residency eviction. Treat recoverability as status- and path-dependent, not as a universal property of unloaded children.',
      label: 'SOURCE TEST · RESTORE NOT GUARANTEED'
    }
  };
  const scenario = scenarios[residencyScenario] ?? scenarios['completed-followup'];
  return `<section class="residency-map" data-residency-map="${residencyScenario}" aria-labelledby="residency-map-title">
    <div class="residency-heading"><div><span class="residency-eyebrow">V2 · RUNTIME RESIDENCY</span><h5 id="residency-map-title">When a child leaves memory, what remains?</h5></div><span class="residency-version">source snapshot · e89b7c4</span></div>
    <p class="residency-intro">Runtime residency, thread identity, stored history and mailbox contents have different lifetimes. Choose a path to follow their boundaries.</p>
    <div class="residency-controls" role="group" aria-label="Choose a child residency scenario">
      <button type="button" data-residency-case="completed-followup" aria-pressed="${residencyScenario === 'completed-followup'}">Completed → follow up</button>
      <button type="button" data-residency-case="queue-only" aria-pressed="${residencyScenario === 'queue-only'}">Queue while unloaded</button>
      <button type="button" data-residency-case="interrupted-eviction" aria-pressed="${residencyScenario === 'interrupted-eviction'}">Interrupted → eviction</button>
    </div>
    <div class="residency-flow" data-case="${residencyScenario}" aria-live="polite">
      ${[['CHILD SESSION',scenario.child],['CAPACITY / DELIVERY',scenario.capacity],['IDENTITY / MAILBOX',scenario.identity],['NEXT ACTION',scenario.delivery]].map(([label,node],index) => `<article class="residency-node" data-tone="${node[0]}"><span class="residency-node-label">${label}</span><strong>${node[1]}</strong><small>${node[2]}</small></article>${index < 3 ? '<i aria-hidden="true">→</i>' : ''}`).join('')}
    </div>
    <div class="residency-routes" aria-label="State transitions"><span class="residency-route-label">PATH IN THIS SCENARIO</span>${scenario.routes.map((route,index) => `<div class="residency-route"><i aria-hidden="true">${index ? '↗' : '→'}</i><span>${route}</span></div>`).join('')}</div>
    <div class="residency-visibility"><b>LIST_AGENTS</b><span>Loaded-runtime view: an unloaded child can be absent even while its identity/history remains registered.</span></div>
    <p class="residency-outcome" aria-live="polite"><b>${scenario.label}</b><span>${scenario.outcome}</span></p>
    <p class="residency-boundary">Static public-source trace, pinned to <code>e89b7c4</code>; cited tests were inspected, not run. This is not a live Desktop eviction/reload trace. Mailbox retention described here is process-local unless another source proves otherwise.</p>
    <p class="residency-sources"><a href="https://github.com/openai/codex/blob/e89b7c442c0433ad5167e72a5a25bb6d0712766a/codex-rs/core/src/agent/control/residency.rs" target="_blank" rel="noreferrer">residency and eviction</a> · <a href="https://github.com/openai/codex/blob/e89b7c442c0433ad5167e72a5a25bb6d0712766a/codex-rs/core/src/agent/control/spawn.rs" target="_blank" rel="noreferrer">reload existing child</a> · <a href="https://github.com/openai/codex/blob/e89b7c442c0433ad5167e72a5a25bb6d0712766a/codex-rs/core/src/agent/control/mailbox.rs" target="_blank" rel="noreferrer">runtime mailbox</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#current-main-v2-residency-and-follow-up-reload-recheck-2026-10-15" target="_blank" rel="noreferrer">evidence ledger</a></p>
  </section>`;
}
function selectResidencyScenario(scenarioName) {
  const container = $('.residency-map');
  if (!container) return;
  residencyScenario = ['completed-followup','queue-only','interrupted-eviction'].includes(scenarioName) ? scenarioName : 'completed-followup';
  container.outerHTML = residencyMarkup();
}
function interruptCloseMarkup() {
  const scenarios = {
    'root-stop': {
      label: 'STOP THE ROOT · DESKTOP CASCADE',
      activity: 'Root self-interrupt is awaited; child cleanup has no tree-wide completion receipt',
      runtime: 'Known descendants are interrupted, then a fresh snapshot is checked in a best-effort second pass',
      registry: 'Client dispatches turn/interrupt; it does not invoke V2 close_agent',
      edge: 'No explicit spawn-edge close in this renderer cleanup path',
      descendants: 'User Stop schedules descendant cleanup in the background; the request may return first',
      detail: 'This Desktop Stop path is a client-orchestrated sweep. It is separate from V2 interrupt_agent (one selected child) and close_agent (explicit edge closure plus live descendant shutdown).',
      tone: 'root-stop'
    },
    'interrupt-resident': {
      label: 'INTERRUPT A LOADED CHILD',
      activity: 'Interrupted · previous status snapshot',
      runtime: 'Interrupt requested for the current child turn; no explicit session shutdown in this handler',
      registry: 'Identity remains registered',
      edge: 'OPEN · unchanged',
      descendants: 'No recursive descendant shutdown in this handler',
      detail: 'The activity records the interrupt operation and prior status. It does not close the graph edge or remove the agent identity.',
      tone: 'interrupt'
    },
    'interrupt-unloaded': {
      label: 'INTERRUPT AN UNLOADED CHILD',
      activity: 'Interrupted · previous status = NotFound',
      runtime: 'Remains unloaded; this path does not reload it',
      registry: 'Known identity remains registered',
      edge: 'OPEN · unchanged',
      descendants: 'No recursive descendant shutdown in this handler',
      detail: 'The tool can return success and emit Interrupted activity when no runtime is present. The event alone does not prove a turn was running or changed status.',
      tone: 'unloaded'
    },
    'accepted-spawn': {
      label: 'CANCEL THE CALLER AFTER SPAWN ACCEPTANCE',
      activity: 'Spawn already returned its acceptance receipt',
      runtime: 'Accepted child is not retracted by later caller cancellation',
      registry: 'Child identity and runtime ownership remain with the agent control path',
      edge: 'OPEN · no explicit close requested',
      descendants: 'Caller cancellation alone does not invoke recursive tree shutdown',
      detail: 'The spawn API places caller-cancellation ownership through the acceptance receipt. Explicit close_agent is a separate operation that closes the edge and shuts down currently live descendants.',
      tone: 'accepted-spawn'
    },
    close: {
      label: 'EXPLICITLY CLOSE THE CHILD',
      activity: 'Close operation',
      runtime: 'Target and currently live descendants are shut down',
      registry: 'Runtime, registry and mailbox state removed by shutdown',
      edge: 'CLOSED · explicitly persisted first',
      descendants: 'Recursive shutdown of currently live descendants',
      detail: 'Closure changes the persisted spawn edge before shutdown. Ordinary shutdown by itself does not perform that graph update.',
      tone: 'close'
    }
  };
  const scenario = scenarios[interruptCloseScenario] ?? scenarios['interrupt-resident'];
  const stopStages = [
    { title: 'Parent turn is interrupted', lane: 'ROOT · USER STOP', detail: 'The composer Stop path interrupts the selected parent turn. After that succeeds, the manager schedules descendant cleanup for user-stop in the background.', boundary: 'The parent interrupt and descendant sweep have separate completion timing.' },
    { title: 'Sweep the known snapshot', lane: 'PASS 1 · CURRENT DESCENDANTS', detail: 'Read the currently stored descendant snapshot, then try active children concurrently. A child counts as handled only when its local interrupt returns a non-null interrupted turn ID.', boundary: 'The snapshot can be stale; per-child failures are caught and logged.' },
    { title: 'Refresh the subtree', lane: 'DISCOVERY · FRESH SNAPSHOT', detail: 'Discover the descendant tree again after pass 1. If discovery fails, the sweep ends after the first pass.', boundary: 'Discovery completeness is not required by this helper; an incomplete snapshot can leave descendants undiscovered.' },
    { title: 'Handle newly seen active children', lane: 'PASS 2 · UNHANDLED DESCENDANTS', detail: 'Skip children already handled in pass 1. For the rest, try the local manager; otherwise inspect the first returned turn and send turn/interrupt only when it is inProgress.', boundary: 'This is a best-effort per-child sweep, not an atomic tree operation or completion receipt.' },
    { title: 'Stop UI can finish before children', lane: 'UI · DISPATCH ≠ ACKNOWLEDGEMENT', detail: 'The panel invokes child interrupt callbacks in a plain loop without awaiting their promises. Its loading state can clear while manager interrupts and descendant sweeps continue.', boundary: 'No tree-wide acknowledgement proves every child stopped.' }
  ];
  const stopStep = Math.max(0, Math.min(stopStages.length - 1, desktopStopCascadeStep));
  const stopStage = stopStages[stopStep];
  const lifecycleSteps = [
    ['Spawn pending', 'No acceptance receipt has returned yet; this trace does not infer that a child has been accepted.'],
    ['Receipt returned', 'The spawn caller has the acceptance receipt. The control path owns the accepted child independently of later caller cancellation.'],
    ['Caller cancelled', 'Cancellation stops the caller path after acceptance. The accepted child remains, and its spawn edge is still open.'],
    ['Explicit close', 'A separate close_agent request marks the edge closed and recursively shuts down descendants that are live at that time.']
  ];
  const lifecycleStep = lifecycleSteps[interruptCloseLifecycleStep] ?? lifecycleSteps[2];
  const acceptanceLifecycle = scenario.tone === 'accepted-spawn' ? `
    <div class="interrupt-close-step-controls" role="group" aria-label="Inspect spawn and cancellation lifecycle steps">
      ${lifecycleSteps.map(([label],index) => `<button type="button" data-interrupt-close-step="${index}" aria-pressed="${interruptCloseLifecycleStep === index}">${String(index + 1).padStart(2,'0')} · ${label}</button>`).join('')}
    </div>
    <ol class="interrupt-close-lifecycle" aria-label="Spawn acceptance and later cancellation lifecycle">
      ${[['SPAWN','Request in flight','Await the acceptance receipt.'],['ACCEPTED','Receipt returned','Child control is established.'],['CALLER CANCELLED','Child remains active','The spawn edge remains open.'],['OPTIONAL CLOSE','Explicit close_agent','Close the edge and live subtree.']].map(([eyebrow,title,summary],index) => `<li class="${interruptCloseLifecycleStep === index ? 'is-current' : ''} ${index === 3 ? 'is-separate' : ''}" aria-current="${interruptCloseLifecycleStep === index ? 'step' : 'false'}"><span>0${index + 1} · ${eyebrow}</span><strong>${title}</strong><small>${summary}</small></li>`).join('')}
    </ol>
    <p class="interrupt-close-step-detail" aria-live="polite"><b>STEP ${String(interruptCloseLifecycleStep + 1).padStart(2,'0')}</b><span>${lifecycleStep[1]}</span></p>` : '';
  const desktopStopCascade = scenario.tone === 'root-stop' ? `
    <section class="desktop-stop-cascade" aria-labelledby="desktop-stop-cascade-title" data-step="${stopStep}">
      <header><div><span>INSTALLED DESKTOP · BUILD 20586 · STATIC CALL-PATH TRACE</span><h6 id="desktop-stop-cascade-title">“Stop all” is a two-pass best-effort sweep</h6></div><small>SELECT A CHECKPOINT</small></header>
      <div class="desktop-stop-cascade-rail" role="group" aria-label="Inspect the Desktop descendant stop cascade">
        ${stopStages.map((item,index) => `<button type="button" data-desktop-stop-step="${index}" aria-pressed="${index === stopStep}"><span>0${index + 1}</span><small>${item.lane}</small><strong>${item.title}</strong>${index < stopStages.length - 1 ? '<i aria-hidden="true">→</i>' : ''}</button>`).join('')}
      </div>
      <div class="desktop-stop-cascade-detail" aria-live="polite"><div><span>${stopStage.lane}</span><strong>${stopStage.title}</strong><p>${stopStage.detail}</p></div><aside><b>BOUNDARY</b><p>${stopStage.boundary}</p></aside></div>
      <div class="desktop-stop-cascade-tree" aria-label="Two-pass descendant interruption flow">
        <article><span>PASS 1 · STORED SNAPSHOT</span><b>Active descendants</b><small>Concurrent local interrupt attempts</small></article><i aria-hidden="true">→</i>
        <article class="refresh-node"><span>FRESH DISCOVERY</span><b>Reconcile subtree</b><small>Failure ends sweep after pass 1</small></article><i aria-hidden="true">→</i>
        <article><span>PASS 2 · NEW ACTIVE</span><b>Skip handled IDs</b><small>Local manager, or inProgress turn fallback</small></article>
      </div>
      <p class="desktop-stop-cascade-note"><b>Separate lifetimes:</b> panel loading tracks callback dispatch; descendant cleanup can continue after the Stop UI settles.</p>
      <a class="desktop-stop-cascade-source" href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#installed-thread-manager-descendant-interruption" target="_blank" rel="noreferrer">Open the pinned call-path evidence ↗</a>
    </section>` : '';
  return `<section class="interrupt-close-map" aria-labelledby="interrupt-close-title">
    <div class="interrupt-close-heading"><div><span class="interrupt-close-eyebrow">STOP · INTERRUPT · CLOSE</span><h5 id="interrupt-close-title">Which operation stops one turn, or closes a subtree?</h5></div><span>${interruptCloseScenario === 'root-stop' ? 'Desktop · 26.1007.71326' : 'Codex source · 16e578d'}</span></div>
    <p class="interrupt-close-intro">Compare the selected operation across activity, runtime, identity, persisted edge, and descendant scope. These paths have different owners and completion signals.</p>
    <div class="interrupt-close-controls" role="group" aria-label="Choose interrupt or close operation">
      <button type="button" data-interrupt-close-case="root-stop" aria-pressed="${interruptCloseScenario === 'root-stop'}">Stop root · Desktop</button>
      <button type="button" data-interrupt-close-case="interrupt-resident" aria-pressed="${interruptCloseScenario === 'interrupt-resident'}">Interrupt loaded</button>
      <button type="button" data-interrupt-close-case="interrupt-unloaded" aria-pressed="${interruptCloseScenario === 'interrupt-unloaded'}">Interrupt unloaded</button>
      <button type="button" data-interrupt-close-case="accepted-spawn" aria-pressed="${interruptCloseScenario === 'accepted-spawn'}">Cancel after spawn accepted</button>
      <button type="button" data-interrupt-close-case="close" aria-pressed="${interruptCloseScenario === 'close'}">Close recursively</button>
    </div>
    <div class="interrupt-close-grid" data-case="${scenario.tone}" aria-live="polite">
      ${[['ACTIVITY',scenario.activity],['RUNTIME',scenario.runtime],['REGISTRY',scenario.registry],['PERSISTED EDGE',scenario.edge],['LIVE DESCENDANTS',scenario.descendants]].map(([label,value]) => `<article class="interrupt-close-cell"><span>${label}</span><strong>${value}</strong></article>`).join('')}
    </div>
    ${acceptanceLifecycle}
    ${desktopStopCascade}
    <p class="interrupt-close-outcome"><b>${scenario.label}</b><span>${scenario.detail}</span></p>
    <p class="interrupt-close-boundary">Static source analysis pinned to <code>16e578d</code>; this is not a live interruption or shutdown observation. The accepted-spawn case follows the API's documented cancellation boundary; explicit close remains a separate recursive path.</p>
    <p class="interrupt-close-source"><a href="https://github.com/openai/codex/blob/16e578dd1ddaf4f5db9cd1f3dbfea0958fd74339/codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs" target="_blank" rel="noreferrer">V2 interrupt handler</a> · <a href="https://github.com/openai/codex/blob/16e578dd1ddaf4f5db9cd1f3dbfea0958fd74339/codex-rs/core/src/agent/api.rs" target="_blank" rel="noreferrer">spawn acceptance boundary</a> · <a href="https://github.com/openai/codex/blob/16e578dd1ddaf4f5db9cd1f3dbfea0958fd74339/codex-rs/core/src/agent/control/legacy.rs" target="_blank" rel="noreferrer">explicit close and recursive shutdown</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#accepted-spawn-and-explicit-subtree-close" target="_blank" rel="noreferrer">lifecycle evidence ledger</a></p>
  </section>`;
}
function selectInterruptCloseScenario(scenarioName) {
  const container = $('.interrupt-close-map');
  if (!container) return;
  interruptCloseScenario = ['root-stop','interrupt-resident','interrupt-unloaded','accepted-spawn','close'].includes(scenarioName) ? scenarioName : 'interrupt-resident';
  container.outerHTML = interruptCloseMarkup();
}
function selectInterruptCloseLifecycleStep(stepValue) {
  const container = $('.interrupt-close-map');
  if (!container) return;
  const step = Number(stepValue);
  if (!Number.isInteger(step) || step < 0 || step > 3) return;
  interruptCloseLifecycleStep = step;
  container.outerHTML = interruptCloseMarkup();
}
function selectDesktopStopCascadeStep(stepValue) {
  const container = $('.interrupt-close-map');
  if (!container) return;
  const step = Number(stepValue);
  if (!Number.isInteger(step) || step < 0 || step > 4) return;
  desktopStopCascadeStep = step;
  container.outerHTML = interruptCloseMarkup();
}
function admissionMarkup() {
  const overlapped = admissionScenario === 'cross-runtime';
  const sameRuntime = admissionScenario === 'same-runtime';
  const stages = overlapped
    ? [
      ['TREE LIMITER', 'active = 0 / limit 1', 'Different child sessions share this execution counter.'],
      ['SESSION A · CHECK', 'passes at 0', 'Its ToolCallRuntime has its own dispatch lock.'],
      ['SESSION B · CHECK', 'also passes at 0', 'A different runtime can check before either child turn starts.'],
      ['TURN STARTS', 'guards raise count to 2', 'Each task later increments the shared counter; the guard does not re-check.']
    ]
    : sameRuntime
    ? [
      ['ONE RUNTIME', 'write lock available', 'spawn_agent uses the default non-parallel tool-call setting.'],
      ['CALL A · DISPATCH', 'holds write lock', 'Handler dispatch runs while this ToolCallRuntime lock is held.'],
      ['CALL B · DISPATCH', 'waits for lock', 'A second call through the same runtime cannot dispatch alongside A.'],
      ['TREE LIMITER', 'still a separate check', 'The lock serializes dispatch; it does not reserve a global permit.']
    ]
    : [
      ['SHARED COUNTER', 'active = 0 / limit 1', 'One child turn is admitted at a time in this example.'],
      ['CHILD A · CHECK', 'passes at 0', 'The advisory check runs before task start.'],
      ['CHILD A · GUARD', 'active becomes 1', 'Task start tracks the active turn with a guard.'],
      ['CHILD B · CHECK', 'rejected at 1', 'A later check sees the updated count.']
    ];
  const outcome = overlapped
    ? 'Separate ToolCallRuntime locks do not serialize different child sessions. The source permits these checks to overlap; it does not prove a real run exceeded the configured limit.'
    : sameRuntime
    ? 'The write lock serializes handler dispatch only within one ToolCallRuntime. It is not the shared execution permit, and the source does not establish a hard global limit from this lock.'
    : 'When checks happen after prior task-start guards update the counter, the later child is rejected at the limit.';
  return `<section class="admission-map" data-admission-map="${admissionScenario}" aria-labelledby="admission-map-title">
    <div class="admission-heading"><div><span class="admission-eyebrow">V2 · EXECUTION CAPACITY</span><h5 id="admission-map-title">Which lock actually limits child turns?</h5></div><span class="admission-version">public main · 6ae8b8a</span></div>
    <p class="admission-intro">The current source calls the check advisory: it does not reserve a slot. Compare an ordered admission, one runtime's dispatch lock, and separate child sessions sharing the same counter.</p>
    <div class="admission-controls" role="group" aria-label="Choose an execution admission ordering">
      <button type="button" data-admission-case="sequential" aria-pressed="${admissionScenario === 'sequential'}">Sequential checks</button>
      <button type="button" data-admission-case="same-runtime" aria-pressed="${sameRuntime}">Same runtime</button>
      <button type="button" data-admission-case="cross-runtime" aria-pressed="${overlapped}">Separate sessions</button>
    </div>
    <div class="admission-flow" data-case="${admissionScenario}" aria-live="polite">
      ${stages.map(([label,title,detail],index) => `<article class="admission-node" data-stage="${index}"><span>${label}</span><strong>${title}</strong><small>${detail}</small></article>${index < stages.length-1 ? '<i aria-hidden="true">→</i>' : ''}`).join('')}
    </div>
    <p class="admission-counter"><b>${overlapped ? 'POSSIBLE INTERLEAVING' : sameRuntime ? 'LOCK SCOPE' : 'ORDERED EXAMPLE'}</b><span>${overlapped ? 'A check is not a reservation; separate session locks do not serialize access to the shared counter.' : sameRuntime ? 'The dispatch lock is local to this runtime; the execution guard belongs to the shared tree limiter.' : 'The next check observes the guard acquired by the earlier started task.'}</span></p>
    <p class="admission-outcome" aria-live="polite">${outcome}</p>
    <p class="admission-boundary">This is a possible source-level interleaving, not a captured race or proof of an over-cap run. The reviewed limiter test covers sequential admission; there is no stress-test or Desktop runtime evidence here.</p>
    <p class="admission-sources"><a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/agent/api.rs" target="_blank" rel="noreferrer">advisory check / separate admission contract</a> · <a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/agent/control/execution.rs" target="_blank" rel="noreferrer">shared capacity check and guard</a> · <a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/tools/parallel.rs" target="_blank" rel="noreferrer">per-runtime dispatch lock</a> · <a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/tools/src/tool_executor.rs" target="_blank" rel="noreferrer">parallel-call default</a> · <a href="https://github.com/openai/codex/blob/6ae8b8aa7c608730d4315d59c5c081897ae02780/codex-rs/core/src/tasks/mod.rs" target="_blank" rel="noreferrer">turn-start guard</a> · <a href="https://github.com/HeadmasterEggy/codex-subagent-reverse-engineering/blob/codex/local-child-interactivity-evidence/evidence/subagent-flow.md#current-main-follow-up-per-runtime-tool-lock-does-not-reserve-tree-capacity" target="_blank" rel="noreferrer">evidence ledger</a></p>
  </section>`;
}
function selectAdmissionScenario(scenarioName) {
  const container = $('.admission-map');
  if (!container) return;
  admissionScenario = ['sequential','same-runtime','cross-runtime'].includes(scenarioName) ? scenarioName : 'sequential';
  container.outerHTML = admissionMarkup();
}
document.addEventListener('toggle', event => {
  if (event.target.matches('.delivery-model')) deliveryModelOpen = event.target.open;
}, true);
document.addEventListener('input', event => {
  if (event.target.matches('.sequence-scrubber input[type="range"]')) updateSequenceStep(event.target.closest('.interaction-sequence'), event.target.value);
  if (event.target.matches('[data-map-search]')) filterSourceMaps(event.target.value);
});
document.addEventListener('change', event => {
  if (event.target.matches('[data-probe-range]')) {
    selectEmbeddedProbeStep(event.target.value);
    return;
  }
  if (event.target.matches('[data-cli-v1-range]')) {
    selectCliV1ProbeStep(event.target.value);
    return;
  }
  if (!event.target.matches('[data-native-panel-inline]')) return;
  desktopPanelInline = event.target.checked;
  desktopPanelSelected = null;
  const panel = event.target.closest('.desktop-subagents');
  if (panel) panel.outerHTML = desktopSubagentsMarkup();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && event.target.matches?.('[data-map-search]')) {
    event.preventDefault();
    event.target.value = '';
    filterSourceMaps('');
    return;
  }
  const sequenceEvent = event.target.closest?.('.sequence-plot-event, .sequence-event');
  if (!sequenceEvent || !['Enter',' '].includes(event.key)) return;
  event.preventDefault();
  updateSequenceStep(sequenceEvent.closest('.interaction-sequence'), sequenceEvent.dataset.sequenceIndex);
});
function scrollInspectorTo(targetId) {
  const target = document.getElementById(targetId);
  const inspector = $('#inspector');
  if (!target || !inspector) return;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  if (matchMedia('(min-width: 681px)').matches) {
    const pinnedHeight = $('.inspector-nav')?.getBoundingClientRect().height ?? 0;
    const top = target.getBoundingClientRect().top - inspector.getBoundingClientRect().top + inspector.scrollTop - pinnedHeight;
    inspector.scrollTo({ top: Math.max(0, top - 24), behavior });
  } else {
    target.scrollIntoView({ behavior, block: 'start' });
  }
}
function filterSourceMaps(rawQuery) {
  const index = $('.source-map-index');
  if (!index) return;
  const query = rawQuery.trim().toLocaleLowerCase();
  const groups = [...index.querySelectorAll('.source-map-group')];
  const totalCount = groups.reduce((count, group) => count + group.querySelectorAll('[data-inspector-target]').length, 0);
  let visibleCount = 0;
  for (const group of groups) {
    const categoryMatches = Boolean(query && group.querySelector('h5')?.textContent.toLocaleLowerCase().includes(query));
    let groupCount = 0;
    for (const button of group.querySelectorAll('[data-inspector-target]')) {
      const target = document.getElementById(button.dataset.inspectorTarget);
      const mapText = target?.closest('section')?.textContent ?? target?.textContent ?? '';
      const searchableText = `${button.textContent} ${mapText}`.toLocaleLowerCase();
      const matches = !query || categoryMatches || searchableText.includes(query);
      button.hidden = !matches;
      if (matches) groupCount++;
    }
    group.hidden = groupCount === 0;
    visibleCount += groupCount;
  }
  const count = index.querySelector('[data-map-count]');
  if (count) count.textContent = `${visibleCount} / ${totalCount} MAPS`;
  const status = index.querySelector('[data-map-search-status]');
  if (status) status.textContent = query
    ? `${visibleCount} of ${totalCount} source-linked diagrams match “${rawQuery.trim()}”.`
    : `Showing all ${totalCount} source-linked diagrams.`;
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
    ? inspector.getBoundingClientRect().top + ($('.inspector-nav')?.getBoundingClientRect().height ?? 0) + 16
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
    $('#connection').textContent = 'Lab connected';
    $('.pulse').classList.add('online');
    $('.connection').classList.remove('expired');
    $('#reload-session').hidden = true;
  };
  events.onerror = () => {
    if (connectionExpired) return;
    $('#connection').textContent = 'Lab reconnecting';
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
  const rendererUpdateButton = event.target.closest('[data-renderer-update-stage]');
  if (rendererUpdateButton) {
    selectRendererUpdateStage(rendererUpdateButton.dataset.rendererUpdateStage);
    return;
  }
  const rendererReadTab = event.target.closest('[data-renderer-read-route]');
  if (rendererReadTab) {
    selectRendererReadRoute(rendererReadTab.dataset.rendererReadRoute);
    return;
  }
  const hydrationButton = event.target.closest('[data-app-server-hydration-view]');
  if (hydrationButton) {
    appServerHydrationView = ['turn-link','history-pages','selected-items'].includes(hydrationButton.dataset.appServerHydrationView) ? hydrationButton.dataset.appServerHydrationView : 'turn-link';
    hydrationButton.closest('.app-server-hydration').outerHTML = appServerHydrationMarkup();
    document.querySelector(`[data-app-server-hydration-view="${appServerHydrationView}"]`)?.focus();
    return;
  }
  const projectionButton = event.target.closest('[data-app-server-projection]');
  if (projectionButton) {
    appServerProjectionTool = ['spawnAgent','sendInput','wait'].includes(projectionButton.dataset.appServerProjection) ? projectionButton.dataset.appServerProjection : 'spawnAgent';
    projectionButton.closest('.app-server-projection').outerHTML = appServerProjectionMarkup();
    document.querySelector(`[data-app-server-projection="${appServerProjectionTool}"]`)?.focus();
    return;
  }
  const boundaryVersionButton = event.target.closest('[data-boundary-version]');
  if (boundaryVersionButton) {
    versionResolutionScenario = ['feature-fallback','model-v2','config-v2','disabled'].includes(boundaryVersionButton.dataset.boundaryVersion) ? boundaryVersionButton.dataset.boundaryVersion : 'feature-fallback';
    const versionMap = $('.cli-feature-map');
    if (versionMap) versionMap.outerHTML = packagedCliFeatureRegistryMarkup();
    refreshSelectionBoundaries();
    const focusTarget = document.querySelector(`[data-boundary-version="${versionResolutionScenario}"]`);
    if (focusTarget) focusTarget.focus();
    return;
  }
  const boundaryEntryButton = event.target.closest('[data-boundary-entry]');
  if (boundaryEntryButton) {
    agentControlEntry = ['new-root','cold-resume','fork-root','internal-child','live-resume'].includes(boundaryEntryButton.dataset.boundaryEntry) ? boundaryEntryButton.dataset.boundaryEntry : 'new-root';
    refreshAgentControlViews();
    refreshSelectionBoundaries();
    document.querySelector(`[data-boundary-entry="${agentControlEntry}"]`)?.focus();
    return;
  }
  const controllerEntryButton = event.target.closest('[data-controller-entry]');
  if (controllerEntryButton) {
    agentControlEntry = controllerEntryButton.dataset.controllerEntry;
    controllerEntryButton.closest('.agent-control-construction').outerHTML = agentControlExplorerMarkup();
    refreshSelectionBoundaries();
    document.querySelector(`[data-controller-entry="${agentControlEntry}"]`)?.focus();
    return;
  }
  const controllerSourceButton = event.target.closest('[data-controller-source]');
  if (controllerSourceButton) {
    agentControlSource = controllerSourceButton.dataset.controllerSource;
    controllerSourceButton.closest('.agent-control-construction').outerHTML = agentControlExplorerMarkup();
    refreshSelectionBoundaries();
    document.querySelector(`[data-controller-source="${agentControlSource}"]`)?.focus();
    return;
  }
  const controllerVersionButton = event.target.closest('[data-controller-version]');
  if (controllerVersionButton) {
    agentControlVersion = controllerVersionButton.dataset.controllerVersion;
    controllerVersionButton.closest('.agent-control-construction').outerHTML = agentControlExplorerMarkup();
    refreshSelectionBoundaries();
    document.querySelector(`[data-controller-version="${agentControlVersion}"]`)?.focus();
    return;
  }
  const controllerFactoryButton = event.target.closest('[data-controller-factory]');
  if (controllerFactoryButton) {
    agentControlFactoryEnabled = !agentControlFactoryEnabled;
    controllerFactoryButton.closest('.agent-control-construction').outerHTML = agentControlExplorerMarkup();
    refreshSelectionBoundaries();
    document.querySelector('[data-controller-factory]')?.focus();
    return;
  }
  const evidenceLensButton = event.target.closest('[data-standalone-evidence-lens]');
  if (evidenceLensButton) {
    standaloneEvidenceLens = Math.max(0, Math.min(2, Number(evidenceLensButton.dataset.standaloneEvidenceLens) || 0));
    evidenceLensButton.closest('.standalone-static-trace').outerHTML = standaloneStaticSpawnTraceMarkup();
    document.querySelector(`[data-standalone-evidence-lens="${standaloneEvidenceLens}"]`)?.focus();
    return;
  }
  const vtableArtifactButton = event.target.closest('[data-vtable-artifact]');
  if (vtableArtifactButton) {
    standaloneVtableArtifact = vtableArtifactButton.dataset.vtableArtifact === 'standalone' ? 'standalone' : 'desktop';
    vtableArtifactButton.closest('.standalone-static-trace').outerHTML = standaloneStaticSpawnTraceMarkup();
    document.querySelector(`[data-vtable-artifact="${standaloneVtableArtifact}"]`)?.focus();
    return;
  }
  const standaloneStaticButton = event.target.closest('[data-standalone-static-step]');
  if (standaloneStaticButton) {
    standaloneStaticSpawnFocus = Math.max(0, Math.min(3, Number(standaloneStaticButton.dataset.standaloneStaticStep) || 0));
    standaloneStaticButton.closest('.standalone-static-trace').outerHTML = standaloneStaticSpawnTraceMarkup();
    document.querySelector(`[data-standalone-static-step="${standaloneStaticSpawnFocus}"]`)?.focus();
    return;
  }
  const nativeSpawnButton = event.target.closest('[data-native-spawn-step]');
  const nativeEvidenceButton = event.target.closest('[data-native-evidence-view]');
  if (nativeEvidenceButton) {
    nativeEvidenceView = ['source', 'cli', 'v2Attempt', 'v2Run', 'jsonGap', 'wake', 'lifecycle', 'lab'].includes(nativeEvidenceButton.dataset.nativeEvidenceView) ? nativeEvidenceButton.dataset.nativeEvidenceView : 'v2Run';
    nativeEvidenceButton.closest('.native-spawn-trace').outerHTML = nativeSpawnTraceMarkup();
    document.querySelector(`[data-native-evidence-view="${nativeEvidenceView}"]`)?.focus();
    return;
  }
  const nativeLifecycleButton = event.target.closest('[data-native-lifecycle]');
  if (nativeLifecycleButton) {
    nativeLifecycleScenario = ['close','died','closedResume'].includes(nativeLifecycleButton.dataset.nativeLifecycle) ? nativeLifecycleButton.dataset.nativeLifecycle : 'complete';
    nativeLifecycleButton.closest('.native-spawn-trace').outerHTML = nativeSpawnTraceMarkup();
    document.querySelector(`[data-native-lifecycle="${nativeLifecycleScenario}"]`)?.focus();
    return;
  }
  if (nativeSpawnButton) {
    nativeSpawnFocus = Math.max(0, Math.min(6, Number(nativeSpawnButton.dataset.nativeSpawnStep) || 0));
    nativeSpawnButton.closest('.native-spawn-trace').outerHTML = nativeSpawnTraceMarkup();
    document.querySelector(`[data-native-spawn-step="${nativeSpawnFocus}"]`)?.focus();
    return;
  }
  const desktopHydrationButton = event.target.closest('[data-desktop-hydration]');
  if (desktopHydrationButton) {
    desktopHydrationState = ['summary', 'archived', 'complete', 'more', 'stalled'].includes(desktopHydrationButton.dataset.desktopHydration) ? desktopHydrationButton.dataset.desktopHydration : 'summary';
    renderMechanismExplorer();
    document.querySelector(`[data-desktop-hydration="${desktopHydrationState}"]`)?.focus();
    return;
  }
  const interactionVersionButton = event.target.closest('[data-interaction-version]');
  if (interactionVersionButton) {
    interactionCompareVersion = ['v1-capture', 'v2-source', 'desktop20586'].includes(interactionVersionButton.dataset.interactionVersion) ? interactionVersionButton.dataset.interactionVersion : 'v1-capture';
    interactionCompareSelection = 'parent-0';
    interactionVersionButton.closest('.interaction-compare').outerHTML = interactionCompareMarkup();
    document.querySelector(`[data-interaction-version="${interactionCompareVersion}"]`)?.focus();
    return;
  }
  const interactionCell = event.target.closest('[data-interaction-cell]');
  if (interactionCell) {
    event.preventDefault();
    interactionCompareSelection = interactionCell.dataset.interactionCell;
    interactionCell.closest('.interaction-compare').outerHTML = interactionCompareMarkup();
    document.querySelector(`[data-interaction-cell="${interactionCompareSelection}"]`)?.focus();
    return;
  }
  const mechanismStepButton = event.target.closest('[data-mechanism-step]');
  if (mechanismStepButton) {
    mechanismExplorerStep = Math.max(0, Math.min(mechanismExplorerSteps.length - 1, Number(mechanismStepButton.dataset.mechanismStep) || 0));
    mechanismExplorerShowAll = false;
    renderMechanismExplorer();
    document.querySelector(`[data-mechanism-step="${mechanismExplorerStep}"]`)?.focus();
    return;
  }
  const mechanismShowAllButton = event.target.closest('[data-mechanism-show-all]');
  if (mechanismShowAllButton) {
    mechanismExplorerShowAll = !mechanismExplorerShowAll;
    renderMechanismExplorer();
    document.querySelector('[data-mechanism-show-all]')?.focus();
    return;
  }
  const probeStep = event.target.closest('[data-probe-step]');
  if (probeStep) {
    selectEmbeddedProbeStep(probeStep.dataset.probeStep);
    return;
  }
  const cliV1Step = event.target.closest('[data-cli-v1-step]');
  if (cliV1Step) {
    selectCliV1ProbeStep(cliV1Step.dataset.cliV1Step);
    return;
  }
  const deliveryModeButton = event.target.closest('[data-delivery-flow]');
  if (deliveryModeButton) {
    deliveryFlowMode = deliveryModeButton.dataset.deliveryFlow === 'trigger-turn' ? 'trigger-turn' : 'queue-only';
    deliveryFlowStep = -1;
    deliveryModeButton.closest('.delivery-flow').outerHTML = deliveryFlowMarkup();
    return;
  }
  const deliveryResidencyButton = event.target.closest('[data-delivery-residency]');
  if (deliveryResidencyButton) {
    deliveryFlowResidency = deliveryResidencyButton.dataset.deliveryResidency === 'evicted' ? 'evicted' : 'loaded';
    deliveryFlowStep = -1;
    deliveryResidencyButton.closest('.delivery-flow').outerHTML = deliveryFlowMarkup();
    return;
  }
  const deliverySessionButton = event.target.closest('[data-delivery-session]');
  if (deliverySessionButton) {
    const states = ['idle', 'active', 'durable_sleep'];
    deliverySessionState = states.includes(deliverySessionButton.dataset.deliverySession)
      ? deliverySessionButton.dataset.deliverySession
      : 'idle';
    deliveryFlowStep = -1;
    deliverySessionButton.closest('.delivery-flow').outerHTML = deliveryFlowMarkup();
    return;
  }
  const deliveryTraceButton = event.target.closest('[data-delivery-trace]');
  if (deliveryTraceButton) {
    const flow = deliveryTraceButton.closest('.delivery-flow');
    const action = deliveryTraceButton.dataset.deliveryTrace;
    deliveryFlowStep = action === 'reset'
      ? -1
      : deliveryFlowStep < 0 || deliveryFlowStep >= 4
        ? 0
        : deliveryFlowStep + 1;
    flow.outerHTML = deliveryFlowMarkup();
    document.querySelector('.delivery-flow [data-delivery-trace="advance"]')?.focus();
    return;
  }
  const capacityScenarioButton = event.target.closest('[data-capacity-scenario]');
  if (capacityScenarioButton) {
    const map = capacityScenarioButton.closest('.capacity-race-map');
    const scenario = capacityScenarioButton.dataset.capacityScenario === 'atomic' ? 'atomic' : 'interleaved';
    const captions = {
      interleaved: 'Observed source structure · separate check and increment operations',
      atomic: 'Illustrative counterfactual · one atomic permit decides check and reservation together'
    };
    map.dataset.scenario = scenario;
    map.querySelectorAll('[data-capacity-scenario]').forEach(button => button.setAttribute('aria-pressed', String(button === capacityScenarioButton)));
    map.querySelectorAll('[data-capacity-view]').forEach(view => { view.hidden = view.dataset.capacityView !== scenario; });
    map.querySelector('[data-capacity-caption]').textContent = captions[scenario];
    return;
  }
  const treeHandoffButton = event.target.closest('[data-tree-handoff-stage]');
  if (treeHandoffButton) {
    const map = treeHandoffButton.closest('.host-handoff-map');
    const stage = treeHandoffButton.dataset.treeHandoffStage;
    const details = {
      'root-return': 'Root ShutdownComplete confirms root shutdown and writer closure. Descendant cleanup may still be running; this event alone is not the tree completion receipt.',
      'tree-success': 'A successful tree wait means admitted operations and sessions finished, including persistence-writer termination. Registry removal and the caller-owned persistence handoff still remain.',
      'tree-failure': 'A failed detailed wait reports cleanup or writer-termination failures. The caller must retain ownership and handle those failures before transferring persistence ownership.',
      'host-unknown': 'The checked codex-rs tree has no production callsite joining these steps. This leaves the packaged Desktop host path unknown; absence in this source scan is not proof of absence outside the tree.'
    };
    if (!map || !Object.hasOwn(details, stage)) return;
    treeHandoffStage = stage;
    map.dataset.stage = stage;
    map.querySelectorAll('[data-tree-handoff-stage]').forEach(button => button.setAttribute('aria-pressed', String(button === treeHandoffButton)));
    map.querySelector('[data-handoff-detail]').textContent = details[stage];
    map.querySelectorAll('[data-tree-handoff-node]').forEach(node => {
      const active = stage === 'root-return' ? node.dataset.treeHandoffNode === 'signal'
        : stage === 'tree-success' || stage === 'tree-failure' ? node.dataset.treeHandoffNode === 'api'
          : node.dataset.treeHandoffNode === 'boundary';
      node.classList.toggle('is-active', active);
    });
    map.querySelector('.host-handoff-steps').dataset.stage = stage;
    return;
  }
  const stopCleanupModeButton = event.target.closest('[data-stop-cleanup-mode]');
  if (stopCleanupModeButton) {
    stopCleanupMode = stopCleanupModeButton.dataset.stopCleanupMode === 'system' ? 'system' : 'user-stop';
    stopCleanupModeButton.closest('.stop-cleanup').outerHTML = stopCleanupMarkup();
    return;
  }
  const stopAllDiscoveryButton = event.target.closest('[data-stop-all-discovery]');
  if (stopAllDiscoveryButton) {
    stopAllDiscovery = stopAllDiscoveryButton.dataset.stopAllDiscovery === 'failure' ? 'failure' : 'success';
    stopAllDiscoveryButton.closest('.stop-all-dispatch').outerHTML = stopAllDispatchMarkup();
    return;
  }
  const appServerExitButton = event.target.closest('[data-app-server-exit]');
  if (appServerExitButton) {
    appServerExitMode = appServerExitButton.dataset.appServerExit;
    appServerExitButton.closest('.app-server-exit-compare').outerHTML = appServerExitCompareMarkup();
    return;
  }
  const shutdownPathButton = event.target.closest('[data-shutdown-path]');
  if (shutdownPathButton) {
    shutdownPathFocus = ['desktop-stop', 'desktop-exit', 'root-suspension'].includes(shutdownPathButton.dataset.shutdownPath) ? shutdownPathButton.dataset.shutdownPath : 'desktop-stop';
    shutdownPathButton.closest('.shutdown-path-compare').outerHTML = shutdownPathCompareMarkup();
    return;
  }
  const desktopCoverageButton = event.target.closest('[data-desktop-coverage]');
  if (desktopCoverageButton) {
    desktopCoverageFocus = ['asar-js', 'native-strings', 'unknown'].includes(desktopCoverageButton.dataset.desktopCoverage) ? desktopCoverageButton.dataset.desktopCoverage : 'asar-js';
    desktopCoverageButton.closest('.desktop-coverage').outerHTML = desktopCoverageMarkup();
    return;
  }
  const shutdownScopeButton = event.target.closest('[data-shutdown-scope]');
  if (shutdownScopeButton) {
    shutdownScopeMode = ['shared-runtime', 'spawn-subtree', 'single-thread'].includes(shutdownScopeButton.dataset.shutdownScope) ? shutdownScopeButton.dataset.shutdownScope : 'shared-runtime';
    shutdownScopeButton.closest('.shutdown-scope').outerHTML = shutdownScopeMarkup();
    return;
  }
  const nativePanelResume = event.target.closest('[data-native-panel-resume]');
  if (nativePanelResume) {
    desktopPanelShouldResume = nativePanelResume.dataset.nativePanelResume === 'true';
    nativePanelResume.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const desktopResource = event.target.closest('[data-desktop-resource]');
  if (desktopResource) {
    desktopResourceFocus = desktopResource.dataset.desktopResource === 'work' ? 'work' : 'local';
    desktopResource.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const desktop20586Surface = event.target.closest('[data-20586-surface]');
  if (desktop20586Surface) {
    desktopBuild20586Surface = desktop20586Surface.dataset['20586Surface'] === 'local' ? 'local' : 'work';
    desktop20586Surface.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20770SurfaceButton = event.target.closest('[data-20770-surface]');
  if (desktop20770SurfaceButton) {
    desktop20770Surface = desktop20770SurfaceButton.dataset['20770Surface'] === 'local' ? 'local' : 'work';
    desktop20770SurfaceButton.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20586Status = event.target.closest('[data-20586-status]');
  if (desktop20586Status) {
    desktopBuild20586Status = ['waiting', 'working', 'done', 'failed'].includes(desktop20586Status.dataset['20586Status']) ? desktop20586Status.dataset['20586Status'] : 'working';
    desktop20586Status.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20586TurnLive = event.target.closest('[data-20586-turn-live]');
  if (desktop20586TurnLive) {
    desktopBuild20586TurnLive = desktop20586TurnLive.dataset['20586TurnLive'] === 'yes';
    desktop20586TurnLive.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20586Route = event.target.closest('[data-20586-route]');
  if (desktop20586Route) {
    desktopBuild20586Route = ['accepted', 'wrongHost', 'missingAncestor', 'staleSelection'].includes(desktop20586Route.dataset['20586Route'])
      ? desktop20586Route.dataset['20586Route']
      : 'accepted';
    desktop20586Route.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20586Interact = event.target.closest('[data-20586-interact]');
  if (desktop20586Interact) {
    desktopBuild20586CanInteract = desktop20586Interact.dataset['20586Interact'] === 'yes';
    desktop20586Interact.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20586Resume = event.target.closest('[data-20586-resume]');
  if (desktop20586Resume) {
    desktopBuild20586ShouldResume = desktop20586Resume.dataset['20586Resume'] === 'yes';
    desktop20586Resume.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20586Scope = event.target.closest('[data-20586-scope]');
  if (desktop20586Scope) {
    desktopBuild20586ThreadScope = ['local-eligible', 'shared', 'local-ineligible'].includes(desktop20586Scope.dataset['20586Scope'])
      ? desktop20586Scope.dataset['20586Scope']
      : 'local-eligible';
    desktop20586Scope.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const desktop20586Conflict = event.target.closest('[data-20586-conflict]');
  if (desktop20586Conflict) {
    desktopBuild20586WriterConflict = !desktopBuild20586WriterConflict;
    desktop20586Conflict.closest('.desktop-20586').outerHTML = desktopBuild20586Markup();
    return;
  }
  const panelPipelineButton = event.target.closest('[data-panel-pipeline]');
  if (panelPipelineButton) {
    desktopPanelPipelineStage = ['membership', 'reconcile', 'display'].includes(panelPipelineButton.dataset.panelPipeline) ? panelPipelineButton.dataset.panelPipeline : 'membership';
    panelPipelineButton.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    document.querySelector(`[data-panel-pipeline="${desktopPanelPipelineStage}"]`)?.focus();
    return;
  }
  const nativePanelConflict = event.target.closest('[data-native-panel-conflict]');
  if (nativePanelConflict) {
    desktopPanelWriterConflict = nativePanelConflict.dataset.nativePanelConflict === 'true';
    nativePanelConflict.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const nativePanelInteract = event.target.closest('[data-native-panel-interact]');
  if (nativePanelInteract) {
    desktopPanelCanInteract = nativePanelInteract.dataset.nativePanelInteract === 'true';
    nativePanelInteract.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const nativePanelStatus = event.target.closest('[data-native-panel-status]');
  if (nativePanelStatus) {
    desktopPanelStatus = nativePanelStatus.dataset.nativePanelStatus === 'done' ? 'done' : 'active';
    desktopPanelSelected = null;
    nativePanelStatus.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const collapseInline = event.target.closest('[data-collapse-inline]');
  if (collapseInline) {
    desktopCollapseHasInline = collapseInline.dataset.collapseInline === 'true';
    collapseInline.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const collapseDone = event.target.closest('[data-collapse-done]');
  if (collapseDone) {
    desktopCollapseAllDone = collapseDone.dataset.collapseDone === 'true';
    collapseDone.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const nativePanelSelect = event.target.closest('[data-native-panel-select]');
  if (nativePanelSelect) {
    desktopPanelSelected = nativePanelSelect.dataset.nativePanelSelect;
    nativePanelSelect.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const nativePanelSummary = event.target.closest('[data-native-panel-summary]');
  if (nativePanelSummary) {
    desktopPanelSelected = 'summary';
    nativePanelSummary.closest('.desktop-subagents').outerHTML = desktopSubagentsMarkup();
    return;
  }
  const sequenceEvent = event.target.closest('[data-sequence-index]');
  if (sequenceEvent) {
    updateSequenceStep(sequenceEvent.closest('.interaction-sequence'), sequenceEvent.dataset.sequenceIndex);
    return;
  }
  const sequenceMove = event.target.closest('[data-sequence-move]');
  if (sequenceMove) {
    const container = sequenceMove.closest('.interaction-sequence');
    const range = container?.querySelector('input[type="range"]');
    if (range) updateSequenceStep(container, Number(range.value) + Number(sequenceMove.dataset.sequenceMove));
    return;
  }
  const desktopCase = event.target.closest('[data-desktop-case]');
  if (desktopCase) {
    const gate = desktopCase.closest('.desktop-gate');
    const scenarios = {
      'same-turn': { evidence:'collabAgentToolCall · spawnAgent', scope:'matching child reference in this parent turn', value:'true', outcome:'interactive thread route', effect:'composer may be available; resume hook can be eligible', tone:'interactive', boundary:'UI routing hint only. It does not establish server authorization, a live child process, or that a resume actually occurs.' },
      'activity-only': { evidence:'subAgentActivity', scope:'no matching spawn reference in the indexed parent turn', value:'false', outcome:'read-only child row', effect:'composer hidden; resume hook gated off', tone:'read-only', boundary:'The UI keeps the activity visible but does not infer interaction authority from activity alone.' },
      'prior-turn': { evidence:'collabAgentToolCall · spawnAgent', scope:'spawn is on an earlier parentTurnKey; current activity belongs to another turn', value:'false', outcome:'read-only child row', effect:'cross-turn activity does not carry the earlier interactive hint', tone:'read-only', boundary:'The carry-forward check is parentTurnKey-sensitive. This describes the inspected row projection, not server-side authorization.' }
    };
    const scenario = scenarios[desktopCase.dataset.desktopCase];
    if (!gate || !scenario) return;
    gate.querySelector('.desktop-gate-flow').dataset.case = desktopCase.dataset.desktopCase;
    gate.querySelectorAll('[data-desktop-case]').forEach(button => button.setAttribute('aria-pressed', String(button === desktopCase)));
    gate.querySelector('[data-gate-evidence]').textContent = scenario.evidence;
    gate.querySelector('[data-gate-scope]').textContent = scenario.scope;
    gate.querySelector('[data-gate-flag]').textContent = `canInteract = ${scenario.value}`;
    gate.querySelector('[data-gate-outcome]').textContent = scenario.outcome;
    gate.querySelector('[data-gate-effect]').textContent = scenario.effect;
    gate.querySelector('[data-gate-boundary]').textContent = scenario.boundary;
    return;
  }
  const timingScenario = event.target.closest('[data-mailbox-scenario]');
  if (timingScenario) { selectMailboxScenario(timingScenario.dataset.mailboxScenario); return; }
  const boardWriteCase = event.target.closest('[data-board-write-case]');
  if (boardWriteCase) { selectBoardWriteScenario(boardWriteCase.dataset.boardWriteCase); return; }
  const toolExposureCase = event.target.closest('[data-tool-exposure-case]');
  if (toolExposureCase) { selectToolExposureCase(toolExposureCase.dataset.toolExposureCase); return; }
  const versionResolutionCase = event.target.closest('[data-version-resolution]');
  if (versionResolutionCase) {
    versionResolutionScenario = ['feature-fallback','model-v2','config-v2','disabled'].includes(versionResolutionCase.dataset.versionResolution) ? versionResolutionCase.dataset.versionResolution : 'feature-fallback';
    versionResolutionCase.closest('.cli-feature-map').outerHTML = packagedCliFeatureRegistryMarkup();
    refreshSelectionBoundaries();
    document.querySelector(`[data-version-resolution="${versionResolutionScenario}"]`)?.focus();
    return;
  }
  const toolExposureOption = event.target.closest('[data-tool-disable-messages], [data-tool-wait-enabled]');
  if (toolExposureOption) {
    updateToolExposureOption(toolExposureOption.hasAttribute('data-tool-disable-messages') ? 'messages' : 'wait', toolExposureOption.checked);
    return;
  }
  const waitScopeCase = event.target.closest('[data-wait-scope-case]');
  if (waitScopeCase) { selectWaitScopeScenario(waitScopeCase.dataset.waitScopeCase); return; }
  const waitContractCase = event.target.closest('[data-wait-contract]');
  if (waitContractCase) { selectWaitContract(waitContractCase.dataset.waitContract); return; }
  const waitScopeStepButton = event.target.closest('[data-wait-scope-step]');
  if (waitScopeStepButton) { selectWaitScopeStep(waitScopeStepButton.dataset.waitScopeStep); return; }
  const residencyCase = event.target.closest('[data-residency-case]');
  if (residencyCase) { selectResidencyScenario(residencyCase.dataset.residencyCase); return; }
  const interruptCloseCase = event.target.closest('[data-interrupt-close-case]');
  if (interruptCloseCase) { selectInterruptCloseScenario(interruptCloseCase.dataset.interruptCloseCase); return; }
  const interruptCloseStep = event.target.closest('[data-interrupt-close-step]');
  if (interruptCloseStep) { selectInterruptCloseLifecycleStep(interruptCloseStep.dataset.interruptCloseStep); return; }
  const desktopStopStep = event.target.closest('[data-desktop-stop-step]');
  if (desktopStopStep) { selectDesktopStopCascadeStep(desktopStopStep.dataset.desktopStopStep); return; }
  const admissionCase = event.target.closest('[data-admission-case]');
  if (admissionCase) { selectAdmissionScenario(admissionCase.dataset.admissionCase); return; }
  const desktopTopologyButton = event.target.closest('[data-desktop-topology-step]');
  if (desktopTopologyButton) { selectDesktopTopologyStep(desktopTopologyButton.dataset.desktopTopologyStep); return; }
  const desktopRuntimeButton = event.target.closest('[data-desktop-runtime-step]');
  if (desktopRuntimeButton) { selectDesktopRuntimeStep(desktopRuntimeButton.dataset.desktopRuntimeStep); return; }
  const fidelityCase = event.target.closest('[data-fidelity-case]');
  if (fidelityCase) { selectFullFidelityScenario(fidelityCase.dataset.fidelityCase); return; }
  const rendererDeltaType = event.target.closest('[data-renderer-delta-type]');
  if (rendererDeltaType) { selectRendererDeltaType(rendererDeltaType.dataset.rendererDeltaType); return; }
  const rendererDeltaCase = event.target.closest('[data-renderer-delta]');
  if (rendererDeltaCase) { selectRendererDeltaScenario(rendererDeltaCase.dataset.rendererDelta); return; }
  const completionPayloadCase = event.target.closest('[data-completion-payload]');
  if (completionPayloadCase) { selectCompletionPayload(completionPayloadCase.dataset.completionPayload); return; }
  const parentResultStateCase = event.target.closest('[data-parent-result-state]');
  if (parentResultStateCase) { selectParentResultState(parentResultStateCase.dataset.parentResultState); return; }
  const completionRouteCase = event.target.closest('[data-completion-route]');
  if (completionRouteCase) { selectCompletionRoute(completionRouteCase.dataset.completionRoute); return; }
  const completionRouteStep = event.target.closest('[data-completion-route-step]');
  if (completionRouteStep) { advanceCompletionRouteStep(completionRouteStep.dataset.completionRouteStep); return; }
  const requestWireTransportButton = event.target.closest('[data-request-wire-transport]');
  if (requestWireTransportButton) { selectRequestWireOption('transport', requestWireTransportButton.dataset.requestWireTransport); return; }
  const requestWireContentButton = event.target.closest('[data-request-wire-content]');
  if (requestWireContentButton) { selectRequestWireOption('content', requestWireContentButton.dataset.requestWireContent); return; }
  const spawnProtocolVersionButton = event.target.closest('[data-spawn-protocol-version]');
  if (spawnProtocolVersionButton) { selectSpawnProtocol('version', spawnProtocolVersionButton.dataset.spawnProtocolVersion); return; }
  const spawnProtocolOutcomeButton = event.target.closest('[data-spawn-protocol-outcome]');
  if (spawnProtocolOutcomeButton) { selectSpawnProtocol('outcome', spawnProtocolOutcomeButton.dataset.spawnProtocolOutcome); return; }
  const nativeCliStepButton = event.target.closest('[data-native-cli-step]');
  if (nativeCliStepButton) { selectNativeCliStep(nativeCliStepButton.dataset.nativeCliStep); return; }
  const terminalScenarioButton = event.target.closest('[data-terminal-scenario]');
  if (terminalScenarioButton) { selectTerminalScenario(terminalScenarioButton.dataset.terminalScenario); return; }
  const spawnConfigModeButton = event.target.closest('[data-spawn-config-mode]');
  if (spawnConfigModeButton) { selectSpawnConfigOption('mode', spawnConfigModeButton.dataset.spawnConfigMode); return; }
  const spawnModelSourceButton = event.target.closest('[data-spawn-model-source]');
  if (spawnModelSourceButton) { selectSpawnConfigOption('model', spawnModelSourceButton.dataset.spawnModelSource); return; }
  const spawnRoleToggle = event.target.closest('[data-spawn-role]');
  if (spawnRoleToggle) { selectSpawnConfigOption('role', spawnRoleToggle.checked); return; }
  const topologyCase = event.target.closest('[data-topology-case]');
  if (topologyCase) { selectTopologyScenario(topologyCase.dataset.topologyCase); return; }
  const rowEligibilityCase = event.target.closest('[data-row-eligibility]');
  if (rowEligibilityCase) { topologyEligibilityState = rowEligibilityCase.dataset.rowEligibility; selectTopologyScenario('row-eligibility'); return; }
  const historyGate = event.target.closest('[data-history-gate]');
  if (historyGate) { selectHistoryGate(historyGate.dataset.historyGate); return; }
  const panelPersistenceStepButton = event.target.closest('[data-panel-persist-step]');
  if (panelPersistenceStepButton) { selectPanelPersistenceStep(panelPersistenceStepButton.dataset.panelPersistStep); return; }
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
  if (inspectorTarget) {
    const targetId = inspectorTarget.dataset.inspectorTarget;
    if (targetId === 'completion-route') {
      deliveryModelOpen = true;
      const deliveryModel = $('#agent-mailbox .delivery-model');
      if (deliveryModel) deliveryModel.open = true;
      requestAnimationFrame(() => scrollInspectorTo(targetId));
    } else if (targetId === 'topology-row-eligibility') {
      deliveryModelOpen = true;
      const deliveryModel = $('#agent-mailbox .delivery-model');
      if (deliveryModel) deliveryModel.open = true;
      selectTopologyScenario('row-eligibility');
      requestAnimationFrame(() => scrollInspectorTo('topology-map-title'));
    } else scrollInspectorTo(targetId);
    return;
  }
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
