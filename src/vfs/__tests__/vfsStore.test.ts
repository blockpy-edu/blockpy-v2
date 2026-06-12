import { describe, expect, it } from 'vitest';
import { createVfsStore, dirtyKey } from '../vfsStore';
import type { VfsFile } from '../types';

function seedFiles(): VfsFile[] {
  return [
    { name: 'answer.py', namespace: 'student', content: 'print(1)\n', origin: 'column' },
    { name: 'starting_code.py', namespace: 'starting', content: 'start\n', origin: 'column' },
    { name: 'notes.txt', namespace: 'student', content: 'mine', origin: 'bundle' },
    { name: 'notes.txt', namespace: 'starting', content: 'template', origin: 'bundle' },
    { name: 'data.csv', namespace: 'readOnly', content: 'a,b', origin: 'bundle' },
  ];
}

describe('vfsStore', () => {
  it('marks files dirty on write', () => {
    const store = createVfsStore(seedFiles());
    const result = store.getState().write('answer.py', 'print(2)\n', 'student');
    expect(result.ok).toBe(true);
    expect(store.getState().dirty).toHaveProperty('student:answer.py');
    expect(store.getState().files[0].content).toBe('print(2)\n');
  });

  it('does not mark dirty when content is unchanged', () => {
    const store = createVfsStore(seedFiles());
    store.getState().write('answer.py', 'print(1)\n', 'student');
    expect(store.getState().dirty).toEqual({});
  });

  it('rejects writes to namespaces the role cannot edit', () => {
    const store = createVfsStore(seedFiles());
    const result = store.getState().write('data.csv', 'changed', 'student');
    expect(result).toEqual({ ok: false, reason: 'not-writable' });
    expect(store.getState().files[4].content).toBe('a,b');
  });

  it('reports missing files', () => {
    const store = createVfsStore(seedFiles());
    expect(store.getState().write('nope.py', 'x', 'student')).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it('clears a dirty flag with markSaved', () => {
    const store = createVfsStore(seedFiles());
    store.getState().write('answer.py', 'print(2)\n', 'student');
    store.getState().markSaved(dirtyKey({ name: 'answer.py', namespace: 'student' }));
    expect(store.getState().dirty).toEqual({});
  });

  it('resets student files from the starting namespace', () => {
    const store = createVfsStore(seedFiles());
    store.getState().write('answer.py', 'print(2)\n', 'student');
    store.getState().write('notes.txt', 'edited', 'student');
    const revisionBefore = store.getState().externalRevision;

    store.getState().resetToStarting();

    const { files, dirty, externalRevision } = store.getState();
    expect(files.find((f) => f.namespace === 'student' && f.name === 'answer.py')?.content).toBe(
      'start\n',
    );
    expect(files.find((f) => f.namespace === 'student' && f.name === 'notes.txt')?.content).toBe(
      'template',
    );
    expect(dirty).toHaveProperty('student:answer.py');
    expect(dirty).toHaveProperty('student:notes.txt');
    expect(externalRevision).toBe(revisionBefore + 1);
    // Non-student namespaces are untouched.
    expect(files.find((f) => f.namespace === 'readOnly')?.content).toBe('a,b');
  });

  it('replaces all files and clears dirty state on initialize', () => {
    const store = createVfsStore(seedFiles());
    store.getState().write('answer.py', 'print(2)\n', 'student');
    store.getState().setActiveFile('notes.txt');

    store
      .getState()
      .initialize([{ name: 'answer.py', namespace: 'student', content: 'new', origin: 'column' }]);

    expect(store.getState().files).toHaveLength(1);
    expect(store.getState().dirty).toEqual({});
    expect(store.getState().activeFileName).toBe('answer.py');
  });
});
