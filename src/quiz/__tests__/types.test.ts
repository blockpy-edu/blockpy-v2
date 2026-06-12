import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUIZ_SETTINGS,
  emptyQuizSubmission,
  parseQuizFeedbackMap,
  parseQuizInstructions,
  parseQuizSubmission,
  serializeQuizSubmission,
} from '../types';

describe('parseQuizInstructions', () => {
  it('returns null for malformed or non-quiz JSON', () => {
    expect(parseQuizInstructions('not json')).toBeNull();
    expect(parseQuizInstructions('42')).toBeNull();
    expect(parseQuizInstructions('{"no_questions": true}')).toBeNull();
  });

  it('applies default settings and empty pools', () => {
    const quiz = parseQuizInstructions('{"questions": {}}');
    expect(quiz?.settings).toEqual(DEFAULT_QUIZ_SETTINGS);
    expect(quiz?.pools).toEqual([]);
  });

  it('parses every known question type', () => {
    const quiz = parseQuizInstructions(
      JSON.stringify({
        questions: {
          mcq: { type: 'multiple_choice_question', body: 'pick', points: 2, answers: ['a', 'b'] },
          numeric: { type: 'numerical_question', body: 'count', points: 1, tolerance: 0.5 },
          match: {
            type: 'matching_question',
            body: 'match',
            points: 1,
            statements: ['s1'],
            answers: ['a1', 'a2'],
          },
          drop: {
            type: 'multiple_dropdowns_question',
            body: 'a [color] b',
            points: 1,
            answers: { color: ['red', 'blue'] },
          },
        },
      }),
    );
    expect(quiz?.questions.mcq).toMatchObject({ type: 'multiple_choice_question', points: 2 });
    expect(quiz?.questions.numeric).toMatchObject({ tolerance: 0.5 });
    expect(quiz?.questions.match).toMatchObject({ statements: ['s1'] });
    expect(quiz?.questions.drop).toMatchObject({ answers: { color: ['red', 'blue'] } });
  });

  it('degrades unknown question types to a fallback instead of failing', () => {
    const quiz = parseQuizInstructions(
      JSON.stringify({
        questions: { weird: { type: 'hologram_question', body: 'beam', points: 3 } },
      }),
    );
    expect(quiz?.questions.weird).toMatchObject({
      type: 'unknown_question',
      rawType: 'hologram_question',
      body: 'beam',
    });
  });
});

describe('parseQuizSubmission', () => {
  it('yields a fresh submission for malformed JSON', () => {
    expect(parseQuizSubmission('')).toEqual(emptyQuizSubmission());
    expect(parseQuizSubmission('print(5)')).toEqual(emptyQuizSubmission());
  });

  it('round-trips answers, attempt state, and feedback', () => {
    const submission = {
      studentAnswers: { q1: 'a', q2: ['x', 'y'], q3: { blank: 'z' } },
      attempt: { attempting: true, count: 2, mulligans: 1 },
      feedback: {
        q1: { correct: true, score: 1, message: 'Correct!', status: 'graded' as const },
      },
    };
    expect(parseQuizSubmission(serializeQuizSubmission(submission))).toEqual(submission);
  });

  it('drops answers of unexpected shapes', () => {
    const parsed = parseQuizSubmission(
      JSON.stringify({ studentAnswers: { ok: 'fine', bad: 42 } }),
    );
    expect(parsed.studentAnswers).toEqual({ ok: 'fine' });
  });
});

describe('parseQuizFeedbackMap', () => {
  it('parses the update_submission feedbacks payload', () => {
    expect(
      parseQuizFeedbackMap({
        q1: { correct: true, score: 1, message: 'Correct!', status: 'graded' },
        q2: { correct: false, score: 0, message: 'Pending.', status: 'pending' },
      }),
    ).toEqual({
      q1: { correct: true, score: 1, message: 'Correct!', status: 'graded' },
      q2: { correct: false, score: 0, message: 'Pending.', status: 'pending' },
    });
  });

  it('returns an empty map for non-object payloads', () => {
    expect(parseQuizFeedbackMap(null)).toEqual({});
    expect(parseQuizFeedbackMap('oops')).toEqual({});
  });
});
