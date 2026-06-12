import { describe, expect, it } from 'vitest';
import { subsetRandomly, visibleQuestionIds } from '../pools';
import { parseQuizInstructions } from '../types';
import type { QuizInstructions } from '../types';

function quizWithPool(poolRandomness: string): QuizInstructions {
  const instructions = parseQuizInstructions(
    JSON.stringify({
      questions: {
        intro: { type: 'text_only_question', body: 'welcome', points: 0 },
        p1: { type: 'true_false_question', body: 'a', points: 1 },
        p2: { type: 'true_false_question', body: 'b', points: 1 },
        p3: { type: 'true_false_question', body: 'c', points: 1 },
        closing: { type: 'short_answer_question', body: 'd', points: 1 },
      },
      settings: { poolRandomness },
      pools: [{ name: 'pool', amount: 2, questions: ['p1', 'p2', 'p3'] }],
    }),
  );
  if (!instructions) {
    throw new Error('fixture failed to parse');
  }
  return instructions;
}

describe('subsetRandomly', () => {
  it('is deterministic for the same seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(subsetRandomly(items, 3, 42)).toEqual(subsetRandomly(items, 3, 42));
  });

  it('preserves the original ordering of picked items', () => {
    const picked = subsetRandomly(['a', 'b', 'c', 'd', 'e'], 3, 7);
    const original = ['a', 'b', 'c', 'd', 'e'];
    expect([...picked].sort((x, y) => original.indexOf(x) - original.indexOf(y))).toEqual(picked);
  });

  it('returns everything when amount covers the list', () => {
    expect(subsetRandomly(['a', 'b'], 5, 1)).toEqual(['a', 'b']);
    expect(subsetRandomly(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
  });
});

describe('visibleQuestionIds', () => {
  it('keeps unpooled questions and draws the pool amount', () => {
    const visible = visibleQuestionIds(quizWithPool('SEED'), 11, 1);
    expect(visible).toContain('intro');
    expect(visible).toContain('closing');
    expect(visible.filter((id) => id.startsWith('p'))).toHaveLength(2);
  });

  it('SEED draws are stable across attempts', () => {
    const quiz = quizWithPool('SEED');
    expect(visibleQuestionIds(quiz, 11, 1)).toEqual(visibleQuestionIds(quiz, 11, 5));
  });

  it('ATTEMPT draws change with the attempt count', () => {
    const quiz = quizWithPool('ATTEMPT');
    const draws = new Set(
      [1, 2, 3, 4, 5].map((count) => visibleQuestionIds(quiz, 11, count).join(',')),
    );
    expect(draws.size).toBeGreaterThan(1);
  });

  it('NONE takes the first questions without shuffling', () => {
    const visible = visibleQuestionIds(quizWithPool('NONE'), 11, 1);
    expect(visible).toEqual(['intro', 'p1', 'p2', 'closing']);
  });
});
