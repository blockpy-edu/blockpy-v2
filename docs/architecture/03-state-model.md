# 03 — State Model

## 1. Principles

Per AGENTS.md state preference order (local → hooks → context → global), global
Zustand stores are reserved for state that is genuinely cross-panel. Everything
else stays local (e.g., splitter drag state, quiz question hover, dialog open
flags live in the owning component or a custom hook).

One Zustand store per _domain_, not one mega-store. Stores are created per mount
(factory functions, passed via a context provider) so multiple BlockPy instances
can coexist on one page (Story 1.1) and tests get fresh stores trivially.

## 2. Store inventory

```
src/store/
  createStores.ts        // factory: builds all stores for one mount
  sessionStore.ts        // who/where: user, course, role, displayMode, passcode
  activityStore.ts       // Activity doc, focused task, navigation, progress
  submissionStore.ts     // per-task Submission state, dirty flags, save status
  vfsStore.ts            // doc 04 — file contents, active file, namespaces
  engineStore.ts         // doc 05 — execution status, console lines, traces
  feedbackStore.ts       // current feedback, category, history of interventions
  layoutStore.ts         // doc 02 §3 — sizes, collapsed, fullscreen, preset pin
  settingsStore.ts       // resolved AssignmentSettings for the focused task
```

### 2.1 sessionStore

```ts
interface SessionState {
    user: { id: number; name: string };
    course: { id: number; name: string } | null;
    role: "student" | "instructor" | "grader";
    displayMode: "normal" | "readOnly" | "grading" | "presentation";
    passcode: string | null;
    serverless: boolean;
}
```

Immutable after mount except `passcode` and `displayMode`. Provides the request
envelope fields (doc 01 §2.4).

### 2.2 activityStore

```ts
interface ActivityState {
    activity: Activity | null;
    focusedTaskId: number | null;
    status: "idle" | "loading" | "ready" | "error";
    error: ApiError | null;
    // derived (computed via selectors, not stored):
    //   focusedTask, workContext, taskProgress[], canNavigate(target)
    focusTask(id: number): NavigationVerdict;
    reload(): Promise<void>;
}
```

`focusTask` runs the policy check (doc 02 §2.1), flushes pending saves for the
outgoing task, logs a navigation event, then switches.

### 2.3 submissionStore

Keyed by assignment id, since an activity has one submission per task:

```ts
interface SubmissionState {
    byTask: Record<number, TaskSubmission>;
    saveQueue: SaveStatus; // 'idle' | 'saving' | 'offlineDirty' | 'error'
}

interface TaskSubmission {
    submission: Submission; // domain type (score as 0..1 float)
    dirtyFiles: Set<string>;
    lastSavedAt: number | null;
    versionConflict: boolean; // server reported version_change
}
```

Submission mutations route through `api/endpoints/submissions.ts`; optimistic
update + rollback-free error handling (dirty flag stays set; doc 01 §3 rule 4).

### 2.4 engineStore / feedbackStore

Populated exclusively by the execution engine's event stream (doc 05 §4). UI
components subscribe with narrow selectors (`useEngineStore(s => s.status)`) to
keep re-renders bounded (AGENTS.md performance rule).

## 3. Derived state discipline

- Selectors live next to their store (`activitySelectors.ts`) and are pure.
- Cross-store derivations (e.g., "can the student submit?" = activity policy +
  submission status + engine not running + due date) are custom hooks
  (`useCanSubmit()`) composing selectors — not duplicated state.
- No store writes from render. All writes happen in actions or event handlers.

## 4. AssignmentSettings

`assignment.settings` is a JSON string with historically loose contents. v2
defines a strict parsed type with a tolerant parser (unknown keys preserved for
round-tripping, Story 19.5):

```ts
// src/domain/assignmentSettings.ts
export interface AssignmentSettings {
    // editor
    startView: "split" | "text" | "block";
    canChangeView: boolean;
    enableBlocks: boolean;
    // panels
    hideFiles: boolean;
    hideQueuedInputs: boolean;
    hideEditors: boolean;
    hideEvaluate: boolean; // console REPL
    hideImportDatasetsButton: boolean;
    hideImportStatements: boolean;
    hideCoverageButton: boolean;
    hideTraceButton: boolean;
    // behavior
    disableInstructorRun: boolean;
    disableEdit: boolean;
    disableTimeout: boolean;
    onlyInteractive: boolean;
    onlyUploads: boolean;
    // grading
    disableFeedback: boolean;
    forceTextMode: boolean;
    preventPaste: boolean; // logs X-Editor.Paste regardless
    datasets: string[]; // preloaded dataset names
    extra: Record<string, unknown>; // unknown legacy keys, round-tripped
}

export function parseAssignmentSettings(raw: string): AssignmentSettings; // never throws
export function serializeAssignmentSettings(s: AssignmentSettings): string;
```

Exact key names must be verified against legacy `assignment_settings.ts` during
Slice 2 implementation and locked in by fixture tests (doc 07 §2.2). The settings
_editor_ panel (Story 3.2) edits this type with a form generated from a schema
table, and writes via `save_assignment`.

## 5. Persistence map

| State                          | Where                                                   | Why                    |
| ------------------------------ | ------------------------------------------------------- | ---------------------- |
| Submission code/files          | server (`save_file`) or OfflineTransport localStorage   | source of truth        |
| Layout sizes/preset pin        | localStorage per (course, preset)                       | device preference      |
| Editor mode (block/split/text) | submission settings event + localStorage fallback       | continuity             |
| Event log                      | server (`log_event`), buffered                          | analytics              |
| Quiz in-progress answers       | submission.code JSON via `save_file('answer.py', json)` | matches legacy quizzer |
| Everything else                | memory                                                  | recomputable           |
