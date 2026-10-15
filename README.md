# Codex Subagent Lab

A local prototype for exploring a parent/child agent workflow with a small browser UI. It starts one independent local `codex exec` process per task, displays the task tree and JSONL activity, and supports cancellation, delegation, and inbox messages.

## Run

Requires Node.js and the Codex CLI already installed and authenticated. From a terminal:

```sh
node /Users/joey/codex-subagent-lab/server.mjs /absolute/path/to/workspace
```

Open the printed `http://127.0.0.1:4317/` URL. The workspace is fixed when the server starts. Set `PORT` to use a different local port.

## Current behavior and limits

- Each agent is a separate `codex exec --json --ephemeral` process with `--sandbox read-only` and the same fixed working directory.
- The server binds to loopback, creates a per-run random token, and keeps task state in memory. Stopping the server clears the UI history.
- At most four CLI processes and 100 total tasks run per server session; additional tasks queue until a process slot opens. Any task can have child tasks, up to eight levels deep, and a running task can be interrupted.
- Each process receives a session-scoped `subagent_lab` MCP server. The model can call `spawn_agent`, `list_agents`, `wait_agent`, `send_message`, `read_messages`, and `close_agent`; the UI can also create child tasks and send messages.
- `wait_agent` waits for activity in the caller's inbox; it takes no child ID and does not consume messages. A child completion queues its status and captured final output in its structural parent's inbox. Call `read_messages` to consume that result. Explicit messages are also queued in the recipient's inbox and do not interrupt an active model turn or automatically modify its prompt. Parent context can be included as a one-time snapshot of the parent prompt and up to 8,000 characters of its latest output.
- This is a CLI-backed orchestration prototype, not a reconstruction of Codex Desktop's internal subagent runtime. It does not inspect private APIs or alter REA.
- The UI summarizes JSONL events and agent-message text. Event payloads can vary by CLI version.
- The CLI inherits the server's environment to use the existing local authentication and runs with `--ignore-user-config`, so it does not load the user Codex config. The server does not write that environment or task history to disk. The read-only shell sandbox does not by itself constrain external tools supplied by project-level configuration.

The prototype uses Node built-ins and has no package installation step.
