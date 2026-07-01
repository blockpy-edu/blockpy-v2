# 01 — Domain Model and Server API

Everything in this document is grounded in source inspection of
`blockpy-edu/blockpy-server` (`models/`, `controllers/endpoints/`, `frontend/models/`).

## 1. Backend models → TypeScript domain types

All wire types live in `src/api/types.ts` and mirror the server's `encode_json()`
output exactly (snake_case). Domain types live in `src/domain/` and are camelCase,
produced by pure mapper functions (`fromAssignmentJson`, `toAssignmentJson`, …).
No class-based models; plain interfaces + functions.

### 1.1 Assignment

Mirrors `models/assignment.py` and `frontend/models/assignment.ts` (`AssignmentJson`):

```ts
// src/api/types.ts (wire format — verified against frontend/models/assignment.ts)
export interface AssignmentJson {
    id: number;
    name: string;
    url: string;
    type: AssignmentType; // see 1.2
    instructions: string; // markdown | quiz-instructions JSON | textbook JSON
    reviewed: boolean;
    hidden: boolean; // hide correctness from students
    public: boolean;
    subordinate: boolean; // meant to be used inside another assignment
    ip_ranges: string;
    points: number;
    settings: string; // JSON-encoded AssignmentSettings (doc 03 §4)
    on_run: string; // grader code (python) | quiz checks JSON
    on_change: string;
    on_eval: string;
    starting_code: string;
    extra_instructor_files: string; // JSON bundle, see doc 04 §5
    extra_starting_files: string; // JSON bundle
    forked_id: number | null;
    forked_version: number | null;
    owner_id: number;
    course_id: number;
    version: number;
    date_created: string;
    date_modified: string;
}
```

The server treats assignment fields as _virtual instructor files_
(`Assignment.INSTRUCTOR_FILENAMES`), which the VFS honors directly (doc 04):

```
!on_run.py  !on_change.py  !on_eval.py  ^starting_code.py
!assignment_settings.blockpy  !instructions.md
#extra_instructor_files.blockpy  #extra_starting_files.blockpy
```

### 1.2 Assignment types

From `models/enums/assignments.py` and observed usage:

```ts
export type AssignmentType =
    | "blockpy" // programming exercise (the default editor)
    | "reading" // markdown/video reading with progress tracking
    | "quiz" // quizzer JSON instructions + checks
    | "maze" // legacy maze game (extension point only in v2)
    | "textbook" // hierarchical container of readings/assignments
    | "explain" // code-explanation activity
    | "kettle"; // TS/JS exercises (extension point only in v2)
```

v2 fully implements `blockpy`, `reading`, `quiz`, `textbook`, `explain`; `maze`
and `kettle` get a typed extension point that renders a graceful fallback
(Story 15.3 "fail gracefully").

### 1.3 AssignmentGroup and membership

```ts
export interface AssignmentGroupJson {
    id: number;
    name: string;
    url: string;
    category: "none" | "exam" | "homework" | "classwork" | "project" | "quiz" | "lab" | "reading";
    position: number;
    forked_id: number | null;
    forked_version: number | null;
    owner_id: number;
    course_id: number;
    version: number;
}

export interface AssignmentGroupMembershipJson {
    id: number;
    assignment_group_id: number;
    assignment_id: number;
    position: number;
    policy: string; // JSON: grading/visibility logic (server: membership.policy)
}
```

**Key design mapping:** an `AssignmentGroup` _is_ an Activity (doc 02). Its ordered
memberships are the activity's task sequence. This is exactly how the legacy
frontend loads multi-assignment pages (`parse_assignment_load` returns
`assignments[]` + `submissions[]` for a group).

### 1.4 Submission

Mirrors `models/submission.py` / `frontend/models/submission.ts`:

```ts
export interface SubmissionJson {
    id: number;
    code: string; // answer.py | quiz submission JSON | explain JSON
    extra_files: string; // JSON bundle ("#extra_student_files.blockpy")
    url: string;
    endpoint: string;
    score: number; // integer 0..100 (server: as_int_score)
    correct: boolean;
    submission_status: SubmissionStatus;
    grading_status: GradingStatus;
    assignment_id: number | null;
    assignment_group_id: number | null;
    assignment_version: number;
    course_id: number | null;
    user_id: number | null;
    version: number;
    date_started: string | null;
    date_submitted?: string | null;
    date_due?: string | null;
    date_locked?: string | null;
    time_limit: string | null;
    feedback: string | null;
}

export type SubmissionStatus = "Started" | "inProgress" | "Submitted" | "Completed" | "incomplete";
export type GradingStatus = "FullyGraded" | "Pending" | "PendingManual" | "Failed" | "NotReady";
```

Score conversion rule (verified): the server stores `int(round(100 * score))` and
exposes `as_float_score = score / 100`. The client's `Submission.score` domain type
is a float in `[0, 1]`; mappers do the conversion in exactly one place.

Student-writable files (`Submission.STUDENT_FILENAMES`):
`answer.py` and `#extra_student_files.blockpy`. The `save_file` endpoint routes by
filename — see §2.2.

`part_id` semantics (Story 1.3): `save_code(filename, code, part_id)` server-side
calls `inject_code_part(self.code, code, part_id)`. The client must replicate the
delimiter format used by `inject_code_part`/part extraction (`##### Part <id>`
block markers — confirm exact regex against `common/` when implementing; covered
by a migration test in doc 07 §2.3).

### 1.5 SubmissionLog (event logging)

Mirrors `models/log_tables/submission_log.py`:

```ts
export interface LogEntry {
    event_type: string; // SubmissionLogEvent or caliper-ish strings ("Run.Program")
    file_path?: string;
    category?: string;
    label?: string;
    message?: string; // JSON when extended=true
    extended?: boolean;
    client_timestamp: string; // Date.now().toString()
    client_timezone: string; // new Date().getTimezoneOffset().toString()
}
```

Well-known event types in live data (used by readings, quizzes, editor):
`Session.Start`, `File.Edit`, `File.Create`, `X-File.Reset`, `X-Editor.Paste`,
`Run.Program`, `Compile.Error`, `Intervention` (feedback), `Resource.View`
(category `reading`, labels `read`/`watch`), `X-Submission.LMS`, `error`.
v2 emits the same strings for analytics continuity (Story 10.5).

### 1.6 Other models

- `SampleSubmission` (`models/sample_submission.py`): `by_assignment(id)`; fields
  name/code/expected metadata → Story 16.4.
- `AssignmentTag`: many-to-many via `assignment_tag_membership` → Story 16.3.
- `User`, `Course`: loaded from the editor payload; only id/name/role(s) needed
  client-side.

## 2. Endpoint catalog

All endpoints accept form-encoded POST (legacy convention) and return
`{success: boolean, ...}` via `ajax_success`/`ajax_failure`. The client keeps that
convention; do **not** invent JSON-body variants.

### 2.1 Loading

| Endpoint                  | Params                                                                       | Returns                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `blockpy/load_assignment` | `assignment_id`, `course_id?`, `student_id?`, `force_quiz?`, `with_history?` | `editor_information`: assignment JSON + submission JSON (+history) via `Assignment.for_editor`; read-only variant when no `course_id` |
| `blockpy/load_submission` | `submission_id`, `read_only?`                                                | grader view of another user's submission                                                                                              |
| `assignments/get_ids`     | `assignment_ids` (csv), `course_id`                                          | `{assignments[], groups[], errors[]}`                                                                                                 |
| `assignments/by_url`      | `url`                                                                        | `{assignment}`                                                                                                                        |
| `blockpy/load_history`    | `submission_id`, …                                                           | history snapshots (Story 13.1)                                                                                                        |
| `blockpy/load_file`       | placement/directory/filename                                                 | single file content                                                                                                                   |
| `blockpy/list_files`      | `submission_id`                                                              | uploaded file metadata (Story 11.1)                                                                                                   |

### 2.2 Saving

| Endpoint                                                | Params                                                                                                         | Notes                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blockpy/save_file`                                     | `filename`, `code`, + (`submission_id`,`part_id?`) for student files or (`assignment_id`) for instructor files | Filename routes: `STUDENT_FILENAMES` → submission, `INSTRUCTOR_FILENAMES` → assignment. Response includes `version_change` when assignment version drifted. |
| `blockpy/save_assignment`                               | `assignment_id` + any of `hidden,reviewed,public,url,ip_ranges,name,settings,points`                           | settings editor save (Story 3.2)                                                                                                                            |
| `blockpy/update_submission`                             | `submission_id`, `score`, `correct`, `status?`, timestamps, `passcode?`                                        | also triggers server-side quiz regrade (`regrade_if_quiz`) and returns `feedbacks` for quizzes                                                              |
| `blockpy/update_submission_status`                      | `submission_id`, `status`                                                                                      | submit / reopen / close (Story 10.4)                                                                                                                        |
| `blockpy/log_event`                                     | LogEntry fields + ids                                                                                          | returns `{log_id}`; server runs `submission.track_event`                                                                                                    |
| `blockpy/save_image`                                    | `submission_id`, `directory`, `image` (b64 PNG)                                                                | turtle/canvas output (Story 11.4)                                                                                                                           |
| `blockpy/upload_file` / `rename_file` / `download_file` | `placement`, `directory`, `filename`, blob                                                                     | user file storage (Story 11.2)                                                                                                                              |

### 2.3 Instructor management

`assignments/new|fork|remove|export|bulk_upload|move_course`,
`assignment_group/add|fork|remove|edit|move_membership|export|edit_security_settings`.
v2 exposes these through the instructor tools panel; they are thin typed wrappers.

### 2.4 Common payload envelope

Every save/log call from the legacy `AssignmentInterface.saveFile` sends:

```ts
interface RequestEnvelope {
    assignment_id: number;
    assignment_group_id: number | null;
    course_id: number | null;
    submission_id: number | null;
    user_id: number;
    version: number; // assignment version
    timestamp: number; // Date.now()
    timezone: number; // getTimezoneOffset()
    passcode?: string; // Story 3.3
}
```

The v2 client injects this envelope automatically from the session store.

## 3. Typed API client design

```
src/api/
  types.ts          // wire types (snake_case), zero logic
  client.ts         // BlockPyApiClient: fetch wrapper, envelope injection, errors
  endpoints/
    assignments.ts  // loadAssignment, saveAssignment, getIds, byUrl, fork, ...
    submissions.ts  // saveFile, updateSubmission, updateStatus, loadHistory
    events.ts       // logEvent (fire-and-forget with queue, see below)
    files.ts        // uploadFile, downloadFile, listFiles, saveImage
  queries.ts        // TanStack Query hooks: useAssignment, useSubmission, ...
  offline.ts        // serverless mode: localStorage-backed fake transport
```

Rules:

1. **One transport.** `BlockPyApiClient.post(route, params)` form-encodes,
   injects the envelope, parses `{success}`, and converts failures into a typed
   `ApiError { kind: 'http' | 'server' | 'network' | 'auth', message }`.
2. **Serverless mode (Story 10.6).** The client takes a `Transport` interface;
   `OfflineTransport` resolves loads from mount-config data and persists saves to
   `localStorage`. UI never branches on "serverless" except to hide
   server-only affordances; it just sees a transport.
3. **Event queue (Story 10.5).** `logEvent` writes into an in-memory ring buffer
   flushed with `navigator.sendBeacon`-style batching; failures never reject into
   UI code paths.
4. **Save discipline (Story 10.2, 18.3).** Saves are debounced (default 1.5s,
   blocking variant for submit), keyed by filename. A failed save keeps the dirty
   flag set and surfaces a non-blocking toast; local content is never reverted.
5. **TanStack Query** owns caching/refetch for _reads_ (assignment, group,
   history, file lists). _Writes_ go through imperative mutations that update the
   Zustand stores optimistically and invalidate the relevant queries.
