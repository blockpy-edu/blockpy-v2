// Maps dirty VFS files to save_file payloads (docs/architecture/04 §4).

import { filesToBundle, serializeBundle } from './bundle';
import { MAIN_STUDENT_FILE, STARTING_CODE_FILE } from './vfs';
import type { VfsFile } from './types';
import type { SaveFileParams } from '../api/endpoints/submissions';

export interface SaveIds {
  submissionId: number | null;
  assignmentId: number | null;
}

/** Instructor column file names → wire sigil filenames. */
const INSTRUCTOR_COLUMN_FILENAMES: Record<string, SaveFileParams['filename']> = {
  'on_run.py': '!on_run.py',
  'on_change.py': '!on_change.py',
  'on_eval.py': '!on_eval.py',
  'instructions.md': '!instructions.md',
  'assignment_settings.blockpy': '!assignment_settings.blockpy',
};

/**
 * Builds the save_file payload for one dirty file. Bundle members are
 * re-serialized from the full file list. Returns null for files that are
 * never persisted (generated namespace).
 */
export function planSave(
  file: VfsFile,
  allFiles: readonly VfsFile[],
  ids: SaveIds,
): SaveFileParams | null {
  switch (file.namespace) {
    case 'generated':
      return null;
    case 'student': {
      if (ids.submissionId === null) {
        return null;
      }
      if (file.name === MAIN_STUDENT_FILE) {
        return {
          kind: 'student',
          filename: 'answer.py',
          submissionId: ids.submissionId,
          code: file.content,
        };
      }
      const bundleMembers = allFiles.filter(
        (candidate) => candidate.namespace === 'student' && candidate.name !== MAIN_STUDENT_FILE,
      );
      return {
        kind: 'student',
        filename: '#extra_student_files.blockpy',
        submissionId: ids.submissionId,
        code: serializeBundle(filesToBundle(bundleMembers)),
      };
    }
    case 'instructor': {
      if (ids.assignmentId === null) {
        return null;
      }
      const column = INSTRUCTOR_COLUMN_FILENAMES[file.name];
      if (column && file.origin === 'column') {
        return {
          kind: 'instructor',
          filename: column,
          assignmentId: ids.assignmentId,
          code: file.content,
        };
      }
      return instructorBundleSave(allFiles, ids.assignmentId);
    }
    case 'starting': {
      if (ids.assignmentId === null) {
        return null;
      }
      if (file.name === STARTING_CODE_FILE && file.origin === 'column') {
        return {
          kind: 'instructor',
          filename: '^starting_code.py',
          assignmentId: ids.assignmentId,
          code: file.content,
        };
      }
      const startingMembers = allFiles.filter(
        (candidate) => candidate.origin === 'bundle' && candidate.namespace === 'starting',
      );
      return {
        kind: 'instructor',
        filename: '#extra_starting_files.blockpy',
        assignmentId: ids.assignmentId,
        code: serializeBundle(filesToBundle(startingMembers)),
      };
    }
    case 'hidden':
    case 'readOnly':
    case 'secret':
      return ids.assignmentId === null ? null : instructorBundleSave(allFiles, ids.assignmentId);
  }
}

function instructorBundleSave(allFiles: readonly VfsFile[], assignmentId: number): SaveFileParams {
  const members = allFiles.filter(
    (candidate) =>
      candidate.origin === 'bundle' &&
      (candidate.namespace === 'hidden' ||
        candidate.namespace === 'readOnly' ||
        candidate.namespace === 'secret' ||
        candidate.namespace === 'instructor'),
  );
  return {
    kind: 'instructor',
    filename: '#extra_instructor_files.blockpy',
    assignmentId,
    code: serializeBundle(filesToBundle(members)),
  };
}
