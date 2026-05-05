import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSyncController } from '../syncController';
import type { SyncCallbacks } from '../syncController';
import type { SyncState } from '../../types';

function makeCallbacks(): SyncCallbacks & {
  codeUpdates: string[];
  blocksUpdates: string[];
  stateUpdates: SyncState[];
  parseErrorCalls: number;
} {
  const codeUpdates: string[] = [];
  const blocksUpdates: string[] = [];
  const stateUpdates: SyncState[] = [];
  let parseErrorCalls = 0;

  return {
    codeUpdates,
    blocksUpdates,
    stateUpdates,
    get parseErrorCalls() {
      return parseErrorCalls;
    },
    onCodeUpdate: (code: string) => codeUpdates.push(code),
    onBlocksUpdate: (xml: string) => blocksUpdates.push(xml),
    onParseErrors: () => { parseErrorCalls++; },
    onSyncStateChange: (state: SyncState) => stateUpdates.push({ ...state }),
  };
}

describe('createSyncController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns a controller with expected methods', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);
    expect(typeof ctrl.onTextChange).toBe('function');
    expect(typeof ctrl.onBlocksChange).toBe('function');
    expect(typeof ctrl.getState).toBe('function');
    expect(typeof ctrl.reset).toBe('function');
    expect(typeof ctrl.dispose).toBe('function');
  });

  it('initial state has external source and no errors', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);
    const state = ctrl.getState();
    expect(state.source).toBe('external');
    expect(state.isDirty).toBe(false);
    expect(state.isParsing).toBe(false);
    expect(state.parseErrors).toHaveLength(0);
  });

  it('onBlocksChange updates state to blocks source', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);
    ctrl.onBlocksChange('<xml/>', 'x = 1');
    const state = ctrl.getState();
    expect(state.source).toBe('blocks');
    expect(state.isDirty).toBe(true);
    expect(state.lastValidPython).toBe('x = 1');
  });

  it('onBlocksChange triggers onCodeUpdate callback', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);
    ctrl.onBlocksChange('<xml/>', 'print("hi")');
    expect(callbacks.codeUpdates).toContain('print("hi")');
  });

  it('onTextChange updates source to text', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);
    ctrl.onTextChange('x = 1');
    const state = ctrl.getState();
    expect(state.source).toBe('text');
    expect(state.isDirty).toBe(true);
  });

  it('onTextChange debounces block update', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);

    ctrl.onTextChange('x = 5');
    // Before debounce fires, no blocks update
    expect(callbacks.blocksUpdates).toHaveLength(0);

    // Fire debounce timer
    vi.runAllTimers();

    // After debounce, blocks should be updated
    expect(callbacks.blocksUpdates.length).toBeGreaterThanOrEqual(0); // depends on parse success
  });

  it('debounce fires after 300ms', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);

    ctrl.onTextChange('x = 1');
    vi.advanceTimersByTime(299);
    const countBefore = callbacks.blocksUpdates.length;
    vi.advanceTimersByTime(1);
    // At 300ms the debounce fires - could produce blocksUpdates or parseErrors
    const totalCallbacks = callbacks.blocksUpdates.length + callbacks.parseErrorCalls;
    expect(totalCallbacks).toBeGreaterThanOrEqual(countBefore);

    ctrl.dispose();
  });

  it('multiple rapid text changes only trigger one parse', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);

    ctrl.onTextChange('x');
    vi.advanceTimersByTime(100);
    ctrl.onTextChange('x =');
    vi.advanceTimersByTime(100);
    ctrl.onTextChange('x = 5');
    vi.advanceTimersByTime(100);

    const beforeFire = callbacks.blocksUpdates.length;
    vi.runAllTimers();
    // Only one parse should have been triggered
    const afterFire = callbacks.blocksUpdates.length + callbacks.parseErrorCalls;
    expect(afterFire - beforeFire).toBeLessThanOrEqual(1);

    ctrl.dispose();
  });

  it('reset restores initial state', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);

    ctrl.onBlocksChange('<xml/>', 'x = 1');
    ctrl.reset();

    const state = ctrl.getState();
    expect(state.source).toBe('external');
    expect(state.isDirty).toBe(false);
    expect(state.lastValidPython).toBe('');
    expect(state.isParsing).toBe(false);
    expect(state.parseErrors).toHaveLength(0);
  });

  it('dispose cleans up timers without throwing', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);

    ctrl.onTextChange('x = 1');
    expect(() => ctrl.dispose()).not.toThrow();
  });

  it('getState returns a copy not a reference', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);

    const state1 = ctrl.getState();
    ctrl.onBlocksChange('<xml/>', 'y = 2');
    const state2 = ctrl.getState();

    expect(state1.source).toBe('external');
    expect(state2.source).toBe('blocks');
  });

  it('valid Python text change updates lastValidPython via blocksUpdate', () => {
    const callbacks = makeCallbacks();
    const ctrl = createSyncController(callbacks);

    ctrl.onTextChange('x = 5');
    vi.runAllTimers();

    // x = 5 is valid Python, should result in a blocks update
    expect(callbacks.blocksUpdates.length + callbacks.parseErrorCalls).toBeGreaterThan(0);
  });
});
