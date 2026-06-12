import { describe, expect, it } from 'vitest';
import {
  blockpyAssignmentJson,
  quizAssignmentJson,
  readingAssignmentJson,
  submissionJson,
} from '../../api/__fixtures__/wirePayloads';
import { fromAssignmentJson, toAssignmentJson } from '../assignment';
import { fromAssignmentGroupJson } from '../assignmentGroup';
import { assignmentGroupJson } from '../../api/__fixtures__/wirePayloads';
import {
  floatScoreToWire,
  fromSubmissionJson,
  toSubmissionJson,
  wireScoreToFloat,
} from '../submission';

describe('assignment mappers', () => {
  it.each([
    ['blockpy', blockpyAssignmentJson],
    ['quiz', quizAssignmentJson],
    ['reading', readingAssignmentJson],
  ])('round-trips the %s fixture without loss', (_label, fixture) => {
    expect(toAssignmentJson(fromAssignmentJson(fixture))).toEqual(fixture);
  });

  it('maps snake_case wire fields to camelCase', () => {
    const assignment = fromAssignmentJson(blockpyAssignmentJson);
    expect(assignment.ipRanges).toBe(blockpyAssignmentJson.ip_ranges);
    expect(assignment.onRun).toBe(blockpyAssignmentJson.on_run);
    expect(assignment.startingCode).toBe(blockpyAssignmentJson.starting_code);
    expect(assignment.extraInstructorFiles).toBe(blockpyAssignmentJson.extra_instructor_files);
  });
});

describe('submission mappers', () => {
  it('round-trips the submission fixture without loss', () => {
    expect(toSubmissionJson(fromSubmissionJson(submissionJson))).toEqual(submissionJson);
  });

  it('converts the wire 0..100 integer score to a 0..1 float', () => {
    const submission = fromSubmissionJson({ ...submissionJson, score: 85 });
    expect(submission.score).toBe(0.85);
  });

  it('score conversions are inverse for whole percentages', () => {
    for (let wire = 0; wire <= 100; wire += 1) {
      expect(floatScoreToWire(wireScoreToFloat(wire))).toBe(wire);
    }
  });

  it('defaults optional wire dates to null', () => {
    const withoutOptional = { ...submissionJson };
    delete withoutOptional.date_submitted;
    const submission = fromSubmissionJson(withoutOptional);
    expect(submission.dateSubmitted).toBeNull();
  });
});

describe('assignment group mapper', () => {
  it('maps the group fixture', () => {
    const group = fromAssignmentGroupJson(assignmentGroupJson);
    expect(group.category).toBe('homework');
    expect(group.courseId).toBe(assignmentGroupJson.course_id);
    expect(group.forkedId).toBeNull();
  });
});
