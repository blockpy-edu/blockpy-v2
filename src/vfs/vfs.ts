// VFS construction and pure queries over file lists (docs/architecture/04 §3).

import { bundleToFiles, parseBundle } from './bundle';
import { RUNTIME_RESOLUTION_ORDER, visibleNamespaces, writableNamespaces } from './types';
import type { Namespace, RuntimeFileMap, VfsFile, VfsRole } from './types';
import type { Assignment } from '../domain/assignment';
import type { Submission } from '../domain/submission';

/** The student's main file; resets copy `starting_code.py` over it. */
export const MAIN_STUDENT_FILE = 'answer.py';
/** Display name of the `^starting_code.py` column inside the VFS. */
export const STARTING_CODE_FILE = 'starting_code.py';

/** Instructor column files: VFS name → assignment column content. */
const INSTRUCTOR_COLUMNS = [
  { name: 'on_run.py', pick: (a: Assignment) => a.onRun },
  { name: 'on_change.py', pick: (a: Assignment) => a.onChange },
  { name: 'on_eval.py', pick: (a: Assignment) => a.onEval },
  { name: 'instructions.md', pick: (a: Assignment) => a.instructions },
  { name: 'assignment_settings.blockpy', pick: (a: Assignment) => a.settings },
] as const;

/**
 * Projects an assignment + submission into VFS files. Plain (sigil-less)
 * entries in the instructor bundle default to `readOnly` (legacy behavior:
 * only `?`/`$`-marked instructor files are hidden from students).
 */
export function buildVfsFiles(assignment: Assignment, submission: Submission | null): VfsFile[] {
  const files: VfsFile[] = [
    {
      name: MAIN_STUDENT_FILE,
      namespace: 'student',
      content: submission?.code ?? assignment.startingCode,
      origin: 'column',
    },
    ...INSTRUCTOR_COLUMNS.map((column) => ({
      name: column.name,
      namespace: 'instructor' as const,
      content: column.pick(assignment),
      origin: 'column' as const,
    })),
    {
      name: STARTING_CODE_FILE,
      namespace: 'starting',
      content: assignment.startingCode,
      origin: 'column',
    },
    ...bundleToFiles(parseBundle(submission?.extraFiles ?? ''), 'student'),
    ...bundleToFiles(parseBundle(assignment.extraInstructorFiles), 'readOnly'),
    ...bundleToFiles(parseBundle(assignment.extraStartingFiles), 'starting'),
  ];
  return files;
}

/** Visibility-filtered listing (Epic 20: filtering lives inside the VFS). */
export function listVisible(files: readonly VfsFile[], role: VfsRole): VfsFile[] {
  const visible = visibleNamespaces(role);
  return files.filter((file) => visible.has(file.namespace));
}

export function readFile(
  files: readonly VfsFile[],
  name: string,
  namespace?: Namespace,
): VfsFile | null {
  if (namespace) {
    return files.find((file) => file.name === name && file.namespace === namespace) ?? null;
  }
  for (const ns of RUNTIME_RESOLUTION_ORDER) {
    const match = files.find((file) => file.name === name && file.namespace === ns);
    if (match) {
      return match;
    }
  }
  return files.find((file) => file.name === name) ?? null;
}

export function canWrite(file: VfsFile, role: VfsRole): boolean {
  return writableNamespaces(role).has(file.namespace);
}

/**
 * Flattens the VFS into the name → content map the runtime mounts.
 * Student-phase runs never receive hidden/secret files (doc 05 §2).
 */
export function resolveForRuntime(
  files: readonly VfsFile[],
  context: 'student' | 'instructor',
): RuntimeFileMap {
  const allowed = new Set<Namespace>(
    context === 'instructor'
      ? RUNTIME_RESOLUTION_ORDER
      : RUNTIME_RESOLUTION_ORDER.filter((ns) => ns !== 'hidden' && ns !== 'secret'),
  );
  const map: RuntimeFileMap = {};
  // Iterate in reverse priority so higher-priority namespaces overwrite.
  for (const ns of [...RUNTIME_RESOLUTION_ORDER].reverse()) {
    if (!allowed.has(ns)) {
      continue;
    }
    for (const file of files) {
      if (file.namespace !== ns) {
        continue;
      }
      // starting_code.py is the template for answer.py, not a runtime file.
      if (ns === 'starting' && file.name === STARTING_CODE_FILE) {
        continue;
      }
      map[file.name] = file.content;
    }
  }
  return map;
}
