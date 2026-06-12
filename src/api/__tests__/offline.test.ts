import { beforeEach, describe, expect, it } from 'vitest';
import {
  assignmentGroupJson,
  blockpyAssignmentJson,
  submissionJson,
} from '../__fixtures__/wirePayloads';
import { BlockPyApiClient } from '../client';
import { getAssignmentIds, loadAssignment } from '../endpoints/assignments';
import { saveFile } from '../endpoints/submissions';
import { createOfflineSeed, OfflineTransport } from '../offline';

const STORAGE_KEY = 'blockpy.offline.test';

const ENVELOPE = {
  assignment_id: blockpyAssignmentJson.id,
  assignment_group_id: null,
  course_id: blockpyAssignmentJson.course_id,
  submission_id: submissionJson.id,
  user_id: submissionJson.user_id,
  version: blockpyAssignmentJson.version,
};

function makeClient(): BlockPyApiClient {
  const seed = createOfflineSeed(blockpyAssignmentJson, submissionJson);
  return new BlockPyApiClient(new OfflineTransport(seed, STORAGE_KEY), () => ENVELOPE);
}

describe('OfflineTransport', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serves the seeded assignment and submission', async () => {
    const editorInfo = await loadAssignment(makeClient(), {
      assignmentId: blockpyAssignmentJson.id,
    });
    expect(editorInfo.assignment).toEqual(blockpyAssignmentJson);
    expect(editorInfo.submission).toEqual(submissionJson);
  });

  it('persists student saves across transport instances', async () => {
    await saveFile(makeClient(), {
      kind: 'student',
      filename: 'answer.py',
      submissionId: submissionJson.id,
      code: 'print("saved offline")',
    });

    const editorInfo = await loadAssignment(makeClient(), {
      assignmentId: blockpyAssignmentJson.id,
    });
    expect(editorInfo.submission?.code).toBe('print("saved offline")');
  });

  it('routes instructor saves to the assignment and bumps its version', async () => {
    await saveFile(makeClient(), {
      kind: 'instructor',
      filename: '!on_run.py',
      assignmentId: blockpyAssignmentJson.id,
      code: 'gently("Try again")',
    });

    const editorInfo = await loadAssignment(makeClient(), {
      assignmentId: blockpyAssignmentJson.id,
    });
    expect(editorInfo.assignment.on_run).toBe('gently("Try again")');
    expect(editorInfo.assignment.version).toBe(blockpyAssignmentJson.version + 1);
  });

  it('accepts log_event and returns increasing log ids', async () => {
    const client = makeClient();
    const first = await client.post('blockpy/log_event', { event_type: 'Session.Start' });
    const second = await client.post('blockpy/log_event', { event_type: 'Run.Program' });
    expect(first.log_id).toBe(1);
    expect(second.log_id).toBe(2);
  });

  it('reports unsupported routes as server failures', async () => {
    await expect(makeClient().post('blockpy/load_history')).rejects.toMatchObject({
      kind: 'server',
      message: 'Offline mode does not support blockpy/load_history',
    });
  });

  it('migrates the legacy single-task persisted shape', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        assignment: blockpyAssignmentJson,
        submission: { ...submissionJson, code: 'print("legacy")' },
        logCount: 4,
      }),
    );

    const editorInfo = await loadAssignment(makeClient(), {
      assignmentId: blockpyAssignmentJson.id,
    });
    expect(editorInfo.submission?.code).toBe('print("legacy")');
  });
});

describe('OfflineTransport (multi-task)', () => {
  const seed = {
    group: assignmentGroupJson,
    memberships: [
      { id: 1, assignment_group_id: 88, assignment_id: 478, position: 0, policy: '' },
      { id: 2, assignment_group_id: 88, assignment_id: 479, position: 1, policy: '' },
    ],
    tasks: [
      createOfflineSeed(blockpyAssignmentJson, submissionJson),
      createOfflineSeed(
        { ...blockpyAssignmentJson, id: 479, name: 'Second task' },
        { ...submissionJson, id: 9942, assignment_id: 479, code: 'second = 2\n' },
      ),
    ],
  };

  function makeActivityClient(): BlockPyApiClient {
    return new BlockPyApiClient(new OfflineTransport(seed, STORAGE_KEY), () => ENVELOPE);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('serves the group, ordered assignments, and memberships via get_ids', async () => {
    const ids = await getAssignmentIds(makeActivityClient(), {
      assignmentIds: [478, 479],
      courseId: 12,
    });
    expect(ids.groups).toEqual([assignmentGroupJson]);
    expect(ids.assignments.map((a) => a.id)).toEqual([478, 479]);
    expect(ids.memberships).toHaveLength(2);
  });

  it('routes load_assignment by assignment id', async () => {
    const editorInfo = await loadAssignment(makeActivityClient(), { assignmentId: 479 });
    expect(editorInfo.assignment.name).toBe('Second task');
    expect(editorInfo.submission?.code).toBe('second = 2\n');
  });

  it('routes student saves by submission id without touching other tasks', async () => {
    await saveFile(makeActivityClient(), {
      kind: 'student',
      filename: 'answer.py',
      submissionId: 9942,
      code: 'second = 99\n',
    });

    const second = await loadAssignment(makeActivityClient(), { assignmentId: 479 });
    const first = await loadAssignment(makeActivityClient(), { assignmentId: 478 });
    expect(second.submission?.code).toBe('second = 99\n');
    expect(first.submission?.code).toBe(submissionJson.code);
  });

  it('routes update_submission by submission id', async () => {
    const client = makeActivityClient();
    await client.post('blockpy/update_submission', {
      submission_id: '9942',
      score: '40',
      correct: 'false',
    });

    const second = await loadAssignment(makeActivityClient(), { assignmentId: 479 });
    expect(second.submission?.score).toBe(40);
    expect(second.submission?.correct).toBe(false);
  });
});
