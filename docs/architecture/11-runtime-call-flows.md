# 11 — Runtime Call Flows

This document explains the main runtime paths through BlockPy v2. It is written
for contributors who need to answer: what happens when the app mounts, when the
user changes tasks, when they run code, and when files save?

## 1. Mount and initial hydration

### 1.1 Flow summary

```mermaid
sequenceDiagram
    participant Host as Host page
    participant Main as src/main.tsx
    participant Mount as src/mount.tsx
    participant Config as src/embed/config.ts
    participant App as src/App.tsx
    participant Provider as src/workspace/WorkspaceProvider.tsx
    participant Stores as Layout/Activity/Run/VFS stores
    participant API as src/api/client.ts

    Host->>Main: load bundle
    Main->>Mount: expose window.BlockPy.mount()
    Host->>Mount: mount(node, options)
    Mount->>Config: resolveBlockPyConfig(options)
    Config-->>Mount: BlockPyResolvedConfig
    Mount->>App: render App(config)
    App->>Provider: render WorkspaceProvider(config)
    Provider->>Provider: build activity setup
    Provider->>Stores: create per-mount stores
    Provider->>API: create transport and BlockPyApiClient
    Provider-->>App: context ready
```

### 1.2 What is decided during mount

- Whether the app is online or offline.
- Whether the mount is a single assignment or a multi-task activity.
- Which task is focused first.
- Which VFS and save identifiers belong to that focused task.
- Which layout preset should be active for the focused task kind.

### 1.3 Main ownership points

- `src/main.tsx`: browser entry point and dev demo wiring.
- `src/mount.tsx`: public mount API and rerender/unmount handle.
- `src/embed/config.ts`: config normalization.
- `src/workspace/WorkspaceProvider.tsx`: the real composition root.

## 2. Task focus and layout switching

When the user moves between tasks, the workspace does not rebuild the app. It
switches the focused task runtime and lets tools follow that focus.

```mermaid
sequenceDiagram
    participant Rail as ActivityRail or hashchange
    participant Activity as activityStore
    participant Provider as WorkspaceProvider
    participant VFS as focused task runtime
    participant Layout as layoutStore
    participant Shell as WorkspaceShell
    participant Panels as Editor/Files/Task panels

    Rail->>Activity: focusTask(taskId)
    Activity-->>Provider: focusedTaskId changed
    Provider->>VFS: select runtime for focused task
    Provider-->>Shell: new context value
    Provider->>Layout: auto-switch preset by task kind if not pinned
    Shell->>Panels: re-render with focused task context
```

Key consequences:

- Each task keeps its own VFS/runtime identity.
- The shell stays mounted while the focused task changes.
- The editor and file views follow the new focused task automatically through
  context.
- Layout can adapt to task kind without destroying the app state.

## 3. Run flow: mount to engine to feedback

This is the core code-execution path.

```mermaid
sequenceDiagram
    participant User as User
    participant Shell as WorkspaceShell
    participant Save as useAutoSave
    participant RunCoord as RunCoordinator
    participant VFS as src/vfs
    participant Engine as EngineHost
    participant Worker as engine.worker.ts
    participant Feedback as feedbackEngine
    participant API as BlockPyApiClient
    participant Panels as ConsolePanel + FeedbackPanel

    User->>Shell: click Run
    Shell->>Save: flushNow()
    Save->>API: save dirty files if needed
    Shell->>RunCoord: run()
    RunCoord->>VFS: resolve runnable files + main file
    RunCoord->>Engine: run(student phase)
    Engine->>Worker: postMessage(run)
    Worker-->>Engine: stdout/stderr/result/feedback-raw
    Engine-->>RunCoord: outcome + instructor feedback
    RunCoord->>Feedback: buildFeedback(...)
    RunCoord->>Panels: update run store and console entries
    RunCoord->>API: update submission score/status when applicable
```

Important details:

- The shell flushes pending saves before running.
- The worker protocol is discriminated by message kind and run id.
- Instructor `on_run` grading is a second phase layered onto the student run.
- Console output and feedback are projections of run state, not direct worker
  ownership inside the panels.

## 4. Input replay during a run

`input()` is handled by replaying the run with the accumulated answers.

```mermaid
sequenceDiagram
    participant Worker as engine.worker.ts
    participant Engine as EngineHost
    participant RunCoord as RunCoordinator
    participant Console as ConsolePanel
    participant User as User

    Worker-->>Engine: result(status=awaiting-input, prompt)
    Engine-->>RunCoord: awaiting input outcome
    RunCoord-->>Console: render prompt form
    User->>Console: submit input text
    Console->>RunCoord: provideInput(value)
    RunCoord->>RunCoord: append input, clear console epoch as needed
    RunCoord->>Engine: rerun with extended inputs[]
```

This keeps runtime behavior deterministic and avoids trying to mutate a paused
Python interpreter in place.

## 5. Save flow

Saving is VFS-driven rather than editor-driven.

```mermaid
sequenceDiagram
    participant Editor as EditorPanel or task UI
    participant VFSStore as vfsStore
    participant AutoSave as useAutoSave
    participant SavePlan as src/vfs/savePlan.ts
    participant API as BlockPyApiClient or OfflineTransport
    participant Events as EventLog

    Editor->>VFSStore: write(fileName, contents)
    VFSStore-->>AutoSave: dirty state changes
    AutoSave->>SavePlan: planSave(files, dirty, ids)
    SavePlan-->>AutoSave: save requests by wire filename
    AutoSave->>API: save_file(...)
    AutoSave->>VFSStore: markSaved(...) on success
    AutoSave->>Events: log File.Edit event
```

Important details:

- Dirty tracking is per VFS file, not per editor widget.
- Bundled extra files are reserialized as whole payloads when needed.
- Generated files are excluded from save requests.
- Offline mode follows the same client path, but the transport mutates local
  persisted state instead of hitting the network.

## 6. End-to-end mental model

If you need a compressed version of the whole app, it is this:

1. Mount config creates a workspace instance.
2. The workspace instance exposes one focused task at a time.
3. Tools operate on the focused task through the VFS and run coordinator.
4. API and offline transport share the same typed client surface.
5. The worker executes code; feedback and console are derived state rendered by
   panels.
6. Saving and grading are side effects coordinated by the workspace layer, not
   by the editor widgets themselves.

That is the shortest reliable path from mount to run to save when debugging or
adding features.
