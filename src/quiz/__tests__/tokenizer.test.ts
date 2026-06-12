import { describe, expect, it } from 'vitest';
import { blankKeys, tokenizeBlanks } from '../tokenizer';

describe('tokenizeBlanks', () => {
  it('returns plain text as a single token', () => {
    expect(tokenizeBlanks('no blanks here')).toEqual([{ kind: 'text', text: 'no blanks here' }]);
  });

  it('splits a single [key] marker', () => {
    expect(tokenizeBlanks('1 + 1 = [sum].')).toEqual([
      { kind: 'text', text: '1 + 1 = ' },
      { kind: 'blank', key: 'sum' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('handles multiple blanks and adjacent markers', () => {
    expect(tokenizeBlanks('[a][b]')).toEqual([
      { kind: 'blank', key: 'a' },
      { kind: 'blank', key: 'b' },
    ]);
  });

  it('treats [[ and ]] as escaped literal brackets', () => {
    expect(tokenizeBlanks('lists use [[ and ]] brackets')).toEqual([
      { kind: 'text', text: 'lists use [ and ] brackets' },
    ]);
  });

  it('keeps an unclosed bracket as literal text', () => {
    expect(tokenizeBlanks('broken [marker')).toEqual([{ kind: 'text', text: 'broken [marker' }]);
  });

  it('keeps empty or whitespace-only brackets as literal text', () => {
    expect(tokenizeBlanks('a [ ] b')).toEqual([{ kind: 'text', text: 'a [ ] b' }]);
  });

  it('handles a blank at the start and end of the body', () => {
    expect(tokenizeBlanks('[first] middle [last]')).toEqual([
      { kind: 'blank', key: 'first' },
      { kind: 'text', text: ' middle ' },
      { kind: 'blank', key: 'last' },
    ]);
  });

  it('returns no tokens for an empty body', () => {
    expect(tokenizeBlanks('')).toEqual([]);
  });
});

describe('blankKeys', () => {
  it('lists keys in order of appearance', () => {
    expect(blankKeys('x [a] y [b] z [a]')).toEqual(['a', 'b', 'a']);
  });
});
