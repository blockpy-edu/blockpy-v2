import { describe, expect, it } from 'vitest';
import { flattenPages, parseTextbook } from '../textbook';

const BOOK = JSON.stringify({
  title: 'Python Basics',
  content: '',
  children: [
    {
      title: 'Chapter 1',
      content: '',
      children: [
        { title: 'Variables', content: '# Variables\n\nNames for values.' },
        { title: 'Loops', reading_id: 42 },
      ],
    },
    { title: 'Chapter 2', assignment_id: 7, content: 'Practice time.' },
  ],
});

describe('parseTextbook', () => {
  it('parses a nested tree with content and assignment references', () => {
    const nodes = parseTextbook(BOOK);
    expect(nodes).toHaveLength(1);
    expect(nodes?.[0].title).toBe('Python Basics');
    expect(nodes?.[0].children[0].children[0]).toMatchObject({
      title: 'Variables',
      assignmentId: null,
    });
    expect(nodes?.[0].children[0].children[1]).toMatchObject({ title: 'Loops', assignmentId: 42 });
    expect(nodes?.[0].children[1]).toMatchObject({ title: 'Chapter 2', assignmentId: 7 });
  });

  it('accepts an array of top-level nodes', () => {
    const nodes = parseTextbook('[{"title": "A", "content": "x"}, {"title": "B", "content": "y"}]');
    expect(nodes?.map((node) => node.title)).toEqual(['A', 'B']);
  });

  it('returns null for malformed JSON', () => {
    expect(parseTextbook('not json')).toBeNull();
    expect(parseTextbook('42')).toBeNull();
  });
});

describe('flattenPages', () => {
  it('lists pages depth-first, skipping empty section nodes', () => {
    const nodes = parseTextbook(BOOK);
    expect(flattenPages(nodes ?? []).map((page) => page.title)).toEqual([
      'Variables',
      'Loops',
      'Chapter 2',
    ]);
  });
});
