# 10 — Developer Onboarding By Folder

This guide is for contributors who need to find the right module quickly and
change it without fighting the architecture.

## 1. Start here

If you are new to the repo, read files in this order:

1. `AGENTS.md` for engineering constraints and required quality bar.
2. `docs/architecture/README.md` for the design map.
3. `src/mount.tsx` and `src/App.tsx` for the entry path.
4. `src/workspace/WorkspaceProvider.tsx` for the composition root.
5. `src/workspace/WorkspaceShell.tsx` for the visible shell.

That sequence gives you the public API, the runtime setup, and the user-facing
composition points before you dive into feature folders.

## 2. Folder guide

### `src/`

Top-level app code. The most important idea is that `workspace` composes the
system while neighboring folders provide narrower services or domain logic.

### `src/embed/`

Mount-time configuration parsing and normalization.

- Edit here when adding new host-facing config options.
- Avoid leaking runtime concerns into this layer; it should stay about input
  normalization and defaults.

### `src/types/`

Shared public types used across embedding and app setup.

- Prefer adding mount/public types here before scattering equivalent shapes in
  feature folders.

### `src/workspace/`

The composition root for the actual product.

- `WorkspaceProvider.tsx`: creates per-mount stores, API client, event log,
  run coordinator, offline/online mode, and focused-task runtime selection.
- `WorkspaceShell.tsx`: top toolbar, run/save actions, preset switcher,
  activity rail, and the main layout root.
- `useWorkspace.ts`: React context hooks for all per-mount stores.
- `useAutoSave.ts`: debounced save pipeline tied to VFS dirty state.

Edit here when a change crosses module boundaries or changes overall behavior.

### `src/workspace/layout/`

Panel layout engine.

- Owns split panes, size persistence, collapsible/fullscreen behavior, and
  preset-driven layouts.
- Start in `LayoutRoot.tsx` for rendering decisions and in the store/preset
  files for persistence or structure changes.

Edit here for docking, resizing, responsive layout, or panel placement rules.

### `src/workspace/panels/`

Panel components shown in the shell.

- `registry.tsx` is the authoritative panel map.
- `EditorPanel.tsx`, `FilesPanel.tsx`, `ConsolePanel.tsx`, `FeedbackPanel.tsx`,
  and `TaskPanel.tsx` are the main live surfaces.
- `PlaceholderPanel.tsx` backs panels not implemented yet.

Edit here when adding a new panel, changing shell-visible panel behavior, or
wiring task/editor/console/feedback presentation.

### `src/workspace/activity/`

Activity sequencing and focused-task state.

- Handles which task is active, whether navigation is allowed, and how task
  focus syncs with the URL hash.
- Keeps per-task runtimes separate while exposing only the focused one.

Edit here for multi-step assignment flows, gating, or deep-linking behavior.

### `src/workspace/tasks/`

Task-specific rendering and interactions.

- Reading, quiz, explain, and textbook-specific UI lives here.
- This folder is where pedagogical task behavior becomes concrete UI.

Edit here when a change applies to one task kind rather than the whole shell.

### `src/api/`

Typed client boundary to BlockPy server behavior.

- `client.ts` owns transport and envelope injection.
- `endpoints/` wraps concrete routes.
- `offline.ts` emulates the server for demos and serverless embeds.
- `queries.ts` exposes TanStack Query integration where needed.

Edit here for request shapes, endpoint semantics, offline parity, or event
logging behavior.

### `src/domain/`

Pure frontend domain mapping.

- Converts wire payloads into safer frontend models.
- Holds business rules like activity construction, task-kind derivation,
  assignment settings parsing, explain parsing, and textbook flattening.

Edit here when the meaning of data changes. Keep UI concerns out of this layer.

### `src/vfs/`

Virtual file system and save planning.

- Tracks instructor/student/generated files.
- Resolves which files are runnable.
- Computes what must be saved and how bundle files serialize back to the wire.

Edit here for file visibility, writability, reset-to-start behavior, runtime
file resolution, or save payload generation.

### `src/engine/`

Python execution runtime.

- `protocol.ts` defines the worker contract.
- `EngineHost.ts` owns worker lifecycle, message correlation, timeouts, and
  interrupts.
- `worker/engine.worker.ts` runs Pyodide and execution phases.
- `feedback/` translates raw runtime/instructor results into user-facing
  feedback.

Edit here for execution semantics, worker messaging, timeout handling, input,
or feedback categorization.

### `src/components/code-editor/`

Editor tool surface.

- `BlockPyEditor.tsx` coordinates Blockly and CodeMirror behavior.
- `BlocklyWorkspace.tsx` and `CodeMirrorEditor.tsx` wrap the underlying editors.

Edit here for editor UX, block/text synchronization, and code editing behavior.
If the issue is about files, saving, or task focus, it probably belongs outside
this folder.

### `src/services/mlt/`

Python-to-blocks and blocks-to-Python translation machinery.

- This is legacy-heavy and specialized. Change it when the block/text sync or
  Python subset itself needs to evolve.

### `src/content/`

Markdown rendering and sanitization.

- Used by reading/instructions-style task content.

Edit here for markdown features, allowed embeds, or prose rendering behavior.

### `src/quiz/`

Quiz engine logic.

- Question schemas, parsing, tokenization, attempts, pool selection, and
  grading are separated here from task UI.

Edit here when quiz semantics change independently of quiz rendering.

### `src/store/`

Reserved for broader state work. The current architecture mostly prefers
per-feature vanilla Zustand stores near the owning module.

### `docs/architecture/`

Design intent, implementation slices, and now overview/onboarding/call-flow
docs. Keep these in sync with shipped behavior when major architecture changes
land.

## 3. Common tasks and where to start

| Task                                      | First file to inspect                                            |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Add a new host config option              | `src/embed/config.ts`                                            |
| Change initial workspace setup            | `src/workspace/WorkspaceProvider.tsx`                            |
| Add or remove a panel                     | `src/workspace/panels/registry.tsx`                              |
| Change panel placement or presets         | `src/workspace/layout`                                           |
| Change task gating/navigation             | `src/domain/activity.ts`, `src/workspace/activity`               |
| Change file save behavior                 | `src/vfs/savePlan.ts`, `src/workspace/useAutoSave.ts`            |
| Change runtime file resolution            | `src/vfs/vfs.ts`                                                 |
| Change Python execution behavior          | `src/engine/EngineHost.ts`, `src/engine/worker/engine.worker.ts` |
| Change feedback wording/category rules    | `src/engine/feedback`                                            |
| Change quiz scoring rules                 | `src/quiz/grading.ts`                                            |
| Change reading/textbook markdown behavior | `src/content/renderMarkdown.ts`                                  |
| Change block/text editor behavior         | `src/components/code-editor`, `src/services/mlt`                 |

## 4. Architectural habits that matter here

- Prefer per-mount state and context over module-global state.
- Keep domain parsing and wire-mapping away from React components.
- Treat `workspace` as orchestration and composition, not as the place to hide
  every piece of business logic.
- Keep worker-facing runtime concerns inside `engine` rather than mixing them
  into panels.
- When you change a task-specific flow, first check whether it belongs in
  `workspace/tasks`, `domain`, `quiz`, or `vfs` before touching the shell.

## 5. Safe debugging path

When behavior is unclear, this order usually gives the shortest route to the
owner:

1. Find the visible UI surface in `workspace/panels` or `workspace/tasks`.
2. Step one layer inward to the owning store or coordinator.
3. Step again into `domain`, `api`, `vfs`, `quiz`, or `engine` if the behavior
   is computed there.
4. Only then expand outward to docs or neighboring modules.

That path matches how the app is actually composed and reduces time lost in
cross-cutting searches.
