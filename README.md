# Codex Subagent Lab

A local prototype for exploring a parent/child agent workflow with a small browser UI. It starts one independent local `codex exec` process per task, displays the task tree and JSONL activity, and supports cancellation, delegation, and inbox messages.

## Run

Requires Node.js and the Codex CLI already installed and authenticated. From a terminal:

```sh
node /Users/joey/codex-subagent-lab/server.mjs /absolute/path/to/workspace
```

Open the printed `http://127.0.0.1:4317/` URL. The workspace is fixed when the server starts. Set `PORT` to use a different local port.

To preview the populated interface without starting Codex processes, run a separate demo session:

```sh
DEMO_MODE=1 PORT=4327 node /Users/joey/codex-subagent-lab/server.mjs /absolute/path/to/workspace
```

Demo mode loads a fixed four-task hierarchy with completed and failed outcomes, a returned parent-to-child message, and pending child results. The Inspector visualizes task ancestry separately from direct message/result routes, then shows each interaction as sender → coordinator inbox → task-tool handoff (or pending inbox). It plots parent/child process lifetimes on a shared time axis, and an event-order swimlane places lifecycle markers and message/result connectors on parent, selected-task, and child lanes. Swimlane spacing expresses event order, not elapsed duration; both diagrams describe Lab records, not Codex Desktop internals. Its expandable, source-linked Codex V2 model contrasts `send_message` (`QueueOnly`) with `followup_task` (`TriggerTurn`) and explains their different wake behavior. A second timing view, pinned to the displayed Codex `main` snapshot, lets you switch whether a `QueueOnly` message arrives before or after terminal output and shows how that changes the turn phase and eligibility for a later model request. “Supplied” means the coordinator included the message in a task-tool call; it does not establish model interpretation. Demo mode hides task creation and marks sample records so they cannot be mistaken for live Codex tasks. Normal runs remain empty and use the live CLI workflow.

## Current behavior and limits

- Each agent is a separate `codex exec --json` process with `--sandbox read-only` and the same fixed working directory. By default it also uses `--ephemeral`; the optional “Keep Codex session for follow-up” setting disables ephemeral mode for that agent so Codex can resume its native session later.
- A retained session exposes “Continue agent” after the current run ends. This starts `codex exec resume <session-id>` with a new follow-up prompt, keeping the same Codex conversation and task-tree identity. It is separate from “Send message”: ordinary messages remain queue-only inbox entries and do not interrupt a running turn. Child tasks inherit the parent’s retention choice unless explicitly overridden.
- Root tasks can select a model and reasoning effort; each child can inherit its parent setting, explicitly use the Codex default, or choose a custom value. These choices are passed as `codex exec --model` and `model_reasoning_effort` config overrides; blank root settings delegate to the CLI default.
- Root tasks can set a runtime limit from 5 to 60 minutes, or leave it unlimited. The limit begins when the process starts and is inherited by descendants; on expiry the server requests termination, waits for process exit, then records a distinct `timed_out` result. UI elapsed time and last activity are visible per task. `wait_agent.timeout_seconds` only bounds an inbox wait and does not change task runtime or task status.
- The server binds to loopback, creates a per-run random token, and keeps task state in memory. Stopping the server clears the UI history. If session retention is enabled, Codex also writes its normal session transcript to the local Codex history; the Lab does not copy that transcript into its own storage.
- Restarting the server rotates the UI token. An already-open page detects the rejected token and offers a `Reload` action to reconnect to the new server session.
- At most four CLI processes and 100 total tasks run per server session; additional tasks queue until a process slot opens. Any task can have child tasks, up to eight levels deep. The UI stop action terminates only the selected task; its children continue independently.
- The task tree supports per-branch and bulk expand/collapse, plus keyboard navigation with arrow keys and Home/End. Filtering keeps matching descendants visible by expanding their ancestor path, and selecting a task from its details expands the path back into view.
- The Inspector combines a parent/child runtime timeline with a chronological lifecycle and handoff sequence. The sequence includes an event-order swimlane for the parent, selected task, and direct children; numbered markers cross-reference the chronological list, and connectors show message or result routes. Swimlane spacing represents event order, not elapsed time. Entries keep Lab task/mailbox timestamps and captured CLI events in one view; queued messages and child results are distinct from items later supplied to a task-tool call. This records handoff, not model interpretation.
- `DEMO_MODE=1` seeds a read-only sample hierarchy for visual review. Sample records do not launch Codex and cannot be cancelled, messaged, or extended from the UI.
- Pending child results have a separate badge from ordinary inbox messages. Selecting the badge opens that task's inspector at its inbox; it reports a locally pending result, not that a model has read or understood it.
- Each process receives a session-scoped `subagent_lab` MCP server. The model can call `spawn_agent`, `list_agents`, `wait_agent`, `send_message`, `read_messages`, and `close_agent`; the UI can also create child tasks and send messages.
- `wait_agent` waits for inbox activity and returns only the activity flag and pending count; it does not expose or consume message bodies. `read_messages` is the sole MCP retrieval path and drains pending messages into a bounded in-memory history. The UI labels those entries “RETURNED,” meaning the coordinator supplied their contents to the task tool; this does not prove the model interpreted them. A child completion queues its status and captured final output in its structural parent's inbox. Explicit messages are also queued and do not interrupt an active model turn or automatically modify its prompt. Parent context can be included as a one-time snapshot of the parent prompt and up to 8,000 characters of its latest output.
- Child processes have independent lifetimes after spawn acceptance: a parent finishing naturally or being stopped from the UI does not cancel its children. `close_agent` is the explicit recursive cancellation path for a task and its descendants. Child completion is reported to the parent inbox on a best-effort basis.
- This is a CLI-backed orchestration prototype, not a reconstruction of Codex Desktop's internal subagent runtime. It does not inspect private APIs or alter REA. Follow-up turns currently require the retained task to be in a terminal state; the prototype does not inject into an active model turn or automatically resume an idle target on queue-only delivery.
- The UI summarizes JSONL events and agent-message text. Event payloads can vary by CLI version.
- The CLI inherits the server's environment to use the existing local authentication and runs with `--ignore-user-config`, so it does not load the user Codex config. The Lab keeps task state in memory and does not persist the inherited environment. When session retention is enabled, Codex writes its normal transcript to local Codex history. The read-only shell sandbox does not by itself constrain external tools supplied by project-level configuration.

The prototype uses Node built-ins and has no package installation step.
