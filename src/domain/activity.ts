// The Activity document model (docs/architecture/02 §2): the client-side
// projection of one AssignmentGroup, or a single standalone Assignment
// treated as a group of one. Pure types and functions; no I/O.

import { parseAssignmentSettings } from './assignmentSettings';
import type { AssignmentSettings } from './assignmentSettings';
import type { Assignment } from './assignment';
import type { Submission } from './submission';
import type { AssignmentGroupCategory } from '../api/types';

/** Parsed membership.policy JSON; unknown keys preserved for round-trips. */
export interface MembershipPolicy {
  /** All earlier tasks must be complete before this task can be focused. */
  requirePrevious: boolean;
  extra: Record<string, unknown>;
}

export const DEFAULT_POLICY: MembershipPolicy = { requirePrevious: false, extra: {} };

/** Tolerant parser: malformed or empty policy JSON yields the default. */
export function parseMembershipPolicy(raw: string): MembershipPolicy {
  if (!raw.trim()) {
    return DEFAULT_POLICY;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_POLICY;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_POLICY;
  }
  const { require_previous: requirePrevious, ...extra } = parsed as Record<string, unknown>;
  return {
    requirePrevious: requirePrevious === true,
    extra,
  };
}

export type TaskKind =
  | { type: 'code'; settings: AssignmentSettings }
  | { type: 'reading'; content: string }
  | { type: 'quiz'; instructions: string }
  | { type: 'explain' }
  | { type: 'textbookPage'; pageRef: string }
  | { type: 'unsupported'; rawType: string };

export function taskKindFromAssignment(assignment: Assignment): TaskKind {
  switch (assignment.type) {
    case 'blockpy':
      return { type: 'code', settings: parseAssignmentSettings(assignment.settings) };
    case 'reading':
      return { type: 'reading', content: assignment.instructions };
    case 'quiz':
      return { type: 'quiz', instructions: assignment.instructions };
    case 'explain':
      return { type: 'explain' };
    case 'textbook':
      return { type: 'textbookPage', pageRef: assignment.instructions };
    default:
      return { type: 'unsupported', rawType: assignment.type };
  }
}

export interface ActivityTask {
  assignmentId: number;
  kind: TaskKind;
  title: string;
  /** Markdown source; rendered as plain text until the sanitizer lands. */
  instructions: string;
  points: number;
  policy: MembershipPolicy;
  subordinate: boolean;
}

export interface Activity {
  /** null for a standalone assignment. */
  groupId: number | null;
  name: string;
  category: AssignmentGroupCategory;
  /** Ordered by membership position. */
  tasks: ActivityTask[];
}

export interface ActivityMember {
  assignment: Assignment;
  position: number;
  /** Raw membership policy JSON. */
  policy: string;
}

export function buildActivity(
  group: { id: number; name: string; category: AssignmentGroupCategory } | null,
  members: ActivityMember[],
): Activity {
  const ordered = [...members].sort((a, b) => a.position - b.position);
  return {
    groupId: group?.id ?? null,
    name: group?.name ?? ordered[0]?.assignment.name ?? 'Activity',
    category: group?.category ?? 'none',
    tasks: ordered.map(({ assignment, policy }) => ({
      assignmentId: assignment.id,
      kind: taskKindFromAssignment(assignment),
      title: assignment.name,
      instructions: assignment.instructions,
      points: assignment.points,
      policy: parseMembershipPolicy(policy),
      subordinate: assignment.subordinate,
    })),
  };
}

export function activityFromSingleAssignment(assignment: Assignment): Activity {
  return buildActivity(null, [{ assignment, position: 0, policy: '' }]);
}

/** Rail badge states (docs/architecture/02 §2.1). */
export type TaskStatus = 'untouched' | 'inProgress' | 'complete' | 'graded';

export function taskStatusFromSubmission(
  submission: Submission | null,
  startingCode = '',
): TaskStatus {
  if (!submission) {
    return 'untouched';
  }
  if (submission.correct || submission.gradingStatus === 'FullyGraded') {
    return 'graded';
  }
  if (
    submission.submissionStatus === 'Submitted' ||
    submission.submissionStatus === 'Completed'
  ) {
    return 'complete';
  }
  if ((submission.code.trim() && submission.code !== startingCode) || submission.score > 0) {
    return 'inProgress';
  }
  return 'untouched';
}

export type NavigationVerdict = { allowed: true } | { allowed: false; reason: string };

const FINISHED: ReadonlySet<TaskStatus> = new Set(['complete', 'graded']);

/**
 * Pure policy check (docs/architecture/02 §2.1). The server remains the
 * authority — this gating is UX only.
 */
export function canNavigate(
  activity: Activity,
  statuses: Record<number, TaskStatus>,
  targetId: number,
): NavigationVerdict {
  const index = activity.tasks.findIndex((task) => task.assignmentId === targetId);
  if (index === -1) {
    return { allowed: false, reason: 'This task is not part of the current activity.' };
  }
  const target = activity.tasks[index];
  if (target.policy.requirePrevious) {
    const blocking = activity.tasks
      .slice(0, index)
      .find((task) => !FINISHED.has(statuses[task.assignmentId] ?? 'untouched'));
    if (blocking) {
      return {
        allowed: false,
        reason: `Complete “${blocking.title}” first.`,
      };
    }
  }
  return { allowed: true };
}
