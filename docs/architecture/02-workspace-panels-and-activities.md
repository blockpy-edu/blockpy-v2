# 02 — Workspace, Panels, and Activities

## 1. Panel taxonomy

Panels are not interchangeable widgets. They fall into four kinds with different
lifecycle, ordering, and persistence semantics:

| Kind         | Examples                                                        | Ordered?                       | Lifecycle                                                      | Owns server state?                  |
| ------------ | --------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- | ----------------------------------- |
| **Task**     | reading, quiz, code task, reflection/explain, submit checkpoint | **Yes** — pedagogical sequence | Created from the Activity document; one is _focused_ at a time | Yes — each task owns a `Submission` |
| **Resource** | file tree, datasets, instructions/spec, rubric                  | No                             | Persist for the whole workspace session                        | Mostly read-only views              |
| **Tool**     | code editor, console/Python shell, test runner, history         | No                             | Persist; operate on whatever the focused task provides         | No (they delegate)                  |
| **Context**  | feedback, trace, progress, timer                                | No                             | Derived; re-render on engine/activity events                   | No (pure projections)               |

The crucial consequence: **the notebook-like pieces are not merely panels.** Task
panels form a _document_ (ordered, authored, graded). Tool/Resource/Context panels
form the _workspace_ (unordered, infrastructural). Layout code treats them
uniformly for docking/resizing; everything else treats them differently.

## 2. The Activity document model

An Activity is the client-side projection of one `AssignmentGroup` (or a single
standalone `Assignment`, treated as a group of one):

```ts
// src/domain/activity.ts
export interface Activity {
  groupId: number | null; // null for standalone assignment
  name: string;
  category: AssignmentGroupCategory;
  tasks: ActivityTask[]; // ordered by membership.position
}

export interface ActivityTask {
  assignmentId: number;
  kind: TaskKind; // derived from assignment.type
  title: string;
  points: number;
  policy: MembershipPolicy; // parsed membership.policy JSON
  subordinate: boolean;
}

export type TaskKind =
  | { type: 'reading'; content: ReadingContent }
  | { type: 'quiz'; instructions: QuizInstructions }
  | { type: 'code'; settings: AssignmentSettings }
  | { type: 'explain' }
  | { type: 'textbookPage'; pageRef: TextbookPageRef }
  | { type: 'unsupported'; rawType: string }; // maze/kettle fallback
```

A `TaskKind` is a discriminated union (AGENTS.md requirement) so panels switch
exhaustively. Loading an activity means: `assignments/get_ids` or
`blockpy/load_assignment` per member → build tasks → load/create one submission
per task (`load_or_new_submission` happens server-side during load).

### 2.1 Task navigation

- Task order comes from membership positions; the activity rail (left edge strip
  or top stepper, depending on layout preset) renders one entry per task with its
  status badge (untouched / in-progress / complete / graded).
- Navigation is hash-based (`#task=<assignment_id>`), so deep links and browser
  back/forward work inside embeds without a router dependency (mirrors the
  textbook's `?page=` + pushState pattern).
- Membership `policy` can gate navigation (e.g., "must complete previous task",
  exam lockstep). Policy evaluation is a pure function
  `canNavigate(activity, progress, target): NavigationVerdict`.

### 2.2 Focus contract between tasks and tools

Tools never reach into tasks. When a task gains focus it publishes a
**WorkContext**:

```ts
export interface WorkContext {
  taskId: number;
  files: VfsHandle | null; // code tasks expose their VFS (doc 04)
  runnable: boolean; // enables run button / console
  primaryFile: string | null; // "answer.py" etc.
  readOnly: boolean;
}
```

- Code task → editor binds to `answer.py`, console becomes runnable.
- Reading/quiz task → editor/console show an empty-state ("no code in this
  task") or collapse, per layout settings. They do _not_ unmount, preserving
  editor state when the student returns.
- Instructor mode swaps the WorkContext to instructor files (doc 04 §3).

## 3. Layout system

### 3.1 Requirements (Epic 2)

Resizable split regions, collapsible panels, layout presets, persistence per
user, fullscreen for any panel, and a small-screen stacked mode.

### 3.2 Design

No new dependency: the existing pointer-event splitter pattern (already proven in
`BlockPyEditor`, see repo memory) generalizes into a `SplitRegion` component:

```
src/workspace/layout/
  LayoutRoot.tsx        // resolves LayoutPreset -> region tree
  SplitRegion.tsx       // n-way split, pointer-capture drag, 20–80% clamps
  PanelHost.tsx         // chrome: title, kind icon, collapse, fullscreen, a11y
  presets.ts            // named presets (see below)
  layoutStore.ts        // sizes/collapsed/fullscreen state, persisted
```

A `LayoutPreset` is data, not JSX:

```ts
interface LayoutPreset {
  id: 'classic' | 'reading' | 'quiz' | 'sideBySide' | 'instructor' | 'stacked';
  regions: RegionNode; // recursive { dir: 'row'|'col', children, sizes }
}
```

Presets auto-switch with the focused task kind (reading task → `reading` preset,
prose-first) unless the user pinned a layout. Pinning + manual sizes persist to
`localStorage` keyed by `(courseId, layout)` (Story 2.3).

### 3.3 Panel registry

Panels self-describe; the shell composes them:

```ts
interface PanelDescriptor {
  id: string;                       // 'editor', 'console', 'feedback', ...
  kind: 'task' | 'resource' | 'tool' | 'context';
  title: (ctx: WorkContext) => string;
  component: React.LazyExoticComponent<...>;
  visibleWhen?: (ctx: WorkContext, settings: AssignmentSettings) => boolean;
}
```

`visibleWhen` implements assignment-settings-driven hiding (Story 3.1: hide
files, hide console, text-only mode, etc.) in one place instead of scattering
conditionals.

## 4. Application shell (Epic 1)

```
src/
  mount.tsx               // mountBlockPy(el, config) — multiple instances per page
  embed/config.ts         // MountConfig parsing/validation (exists; extend)
  app/
    AppRoot.tsx           // providers: QueryClient, stores, theme, error boundary
    session.ts            // resolved identity: user, course, role, passcode
  workspace/ ...          // §3
  activity/
    ActivityRail.tsx
    tasks/
      ReadingTask.tsx
      QuizTask.tsx
      CodeTask.tsx
      ExplainTask.tsx
      UnsupportedTask.tsx
  panels/
    editor/  console/  feedback/  files/  trace/  history/  datasets/
    instructor/           // settings editor, sample submissions, tags, export
  api/ ...                // doc 01 §3
  domain/ ...             // pure types + mappers + policy functions
  engine/ ...             // doc 05
  vfs/ ...                // doc 04
  quiz/ reading/ textbook/  // doc 06
  store/ ...              // doc 03
```

### 4.1 Mount config

`mountBlockPy(element, config)` stays the single entry point. Config supplies
either server coordinates (`{ serverUrl, courseId, assignmentGroupId | assignmentId, userId, role }`)
or inline content for serverless embeds (`{ assignment: {...}, submission?: {...} }`).
Validation produces typed errors rendered inside the mount element — never thrown
past the mount boundary (Story 1.1).

### 4.2 Roles and modes

`role: 'student' | 'instructor' | 'grader'` plus `displayMode: 'normal' | 'readOnly' | 'grading' | 'presentation'`.
Role gates panel visibility (instructor tools), VFS namespace access (doc 04),
and write endpoints. The server remains the authority — client gating is UX only
(Epic 20).
