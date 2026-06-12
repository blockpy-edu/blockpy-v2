# 04 — Virtual File System

## 1. Purpose

Code tasks operate on a small virtual file system that unifies: student code,
instructor grading scripts, starting code, generated files, datasets, and
uploads — with namespace-based access control. The namespaces are dictated by
the server's filename conventions (doc 01 §1.1/§1.4), so the VFS is a faithful
client-side projection, not a new invention.

## 2. Namespaces

Filename prefix sigils (legacy-compatible, Epic 4):

| Sigil    | Namespace  | Visibility                             | Writable by                   | Backing store                                                      |
| -------- | ---------- | -------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| _(none)_ | student    | student + instructor                   | student                       | `submission.code` (`answer.py`) or `submission.extra_files` bundle |
| `!`      | instructor | instructor only                        | instructor                    | assignment columns (`on_run`, `instructions`, `settings`, …)       |
| `^`      | starting   | both (read-only for student)           | instructor                    | `assignment.starting_code` / starting bundle                       |
| `?`      | hidden     | engine only (never shown to student)   | instructor                    | extra_instructor_files bundle                                      |
| `&`      | read-only  | both, not editable                     | instructor                    | extra bundles                                                      |
| `$`      | secret     | engine only, stripped from logs/errors | instructor                    | extra_instructor_files bundle                                      |
| `*`      | generated  | both, ephemeral                        | engine (program output files) | memory only                                                        |
| `#`      | bundled    | n/a (meta-files)                       | system                        | the `.blockpy` JSON bundle files themselves                        |

Additionally the legacy bundle entries may carry `_instructor/` and `_student/`
path prefixes inside `#extra_*` bundles; the VFS maps those onto the `!`/student
namespaces during deserialization (Story 4.2).

## 3. Model

```ts
// src/vfs/types.ts
export type Namespace =
  | 'student'
  | 'instructor'
  | 'starting'
  | 'hidden'
  | 'readOnly'
  | 'secret'
  | 'generated';

export interface VfsFile {
  name: string; // display name, no sigil ("answer.py")
  namespace: Namespace;
  content: string;
  binary?: Uint8Array; // uploads/images
  origin: 'column' | 'bundle' | 'generated' | 'upload';
}

export interface Vfs {
  list(viewer: Role): VfsFile[]; // visibility-filtered
  read(name: string, ns?: Namespace): VfsFile | null;
  write(name: string, content: string): WriteResult; // enforces writability
  resolveForRuntime(): RuntimeFileMap; // doc 05 §2
}
```

Resolution order for the runtime (a program importing `data.txt`): student →
generated → starting → read-only → hidden/secret (engine contexts only).
Visibility filtering and writability checks happen inside the VFS, so panels
and the engine cannot accidentally leak instructor files (Epic 20).

## 4. Sync mapping

The `vfsStore` tracks dirty files; the save layer maps VFS writes to the right
endpoint payload:

| VFS write                           | save_file call                                                |
| ----------------------------------- | ------------------------------------------------------------- |
| `answer.py` (student)               | `filename=answer.py`, `submission_id`, optional `part_id`     |
| other student file                  | re-serialize bundle → `filename=#extra_student_files.blockpy` |
| `!on_run.py` etc. (instructor mode) | `filename=!on_run.py`, `assignment_id`                        |
| `^starting_code.py`                 | `filename=^starting_code.py`, `assignment_id`                 |
| instructor bundle members           | `filename=#extra_instructor_files.blockpy`                    |

`X-File.Reset` (Story 4.4 "reset to starting code") replaces student files from
the `starting` namespace, logs the legacy `X-File.Reset` event, and saves.

## 5. Bundle format

`#extra_*.blockpy` files are JSON arrays of `{filename, contents}` records
(verify exact legacy shape against a live payload in Slice 3; locked by fixture
tests, doc 07 §2.2). The serializer must round-trip unknown fields.

## 6. Files panel

The file tree (Resource panel) renders namespaces as sections with icons and
lock badges; students see student/starting/read-only/generated only. Create /
rename / delete operate via VFS methods; instructor mode unlocks instructor
namespaces and shows the sigil-name mapping in tooltips for legacy familiarity.
`hideFiles` setting removes the panel entirely (Story 3.1).
