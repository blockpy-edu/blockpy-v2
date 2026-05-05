import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runPython, isPyodideLoaded, resetPyodide, loadPyodide } from '../pyodideRunner';

describe('pyodideRunner', () => {
  beforeEach(() => {
    resetPyodide();
  });

  afterEach(() => {
    resetPyodide();
    vi.restoreAllMocks();
  });

  describe('isPyodideLoaded', () => {
    it('returns false before loading', () => {
      expect(isPyodideLoaded()).toBe(false);
    });
  });

  describe('runPython (without Pyodide)', () => {
    it('returns error when Pyodide is not loaded', async () => {
      const result = await runPython('print("hello")');
      expect(result.stdout).toBe('');
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('RuntimeError');
      expect(result.error!.message).toContain('not loaded');
      expect(result.executionTime).toBe(0);
    });

    it('returns correct shape with stderr and returnValue fields', async () => {
      const result = await runPython('x = 1');
      expect(result).toHaveProperty('stdout');
      expect(result).toHaveProperty('stderr');
      expect(result).toHaveProperty('executionTime');
    });
  });

  describe('loadPyodide (mocked)', () => {
    it('loads Pyodide and sets instance', async () => {
      // Mock window.loadPyodide
      const mockPyodide = {
        runPythonAsync: vi.fn().mockResolvedValue(undefined),
        setStdout: vi.fn(),
        setStderr: vi.fn(),
      };

      const mockLoadPyodide = vi.fn().mockResolvedValue(mockPyodide);
      vi.stubGlobal('loadPyodide', mockLoadPyodide);

      // Mock document.createElement to avoid DOM issues
      const mockScript = {
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockScript as unknown as HTMLElement);
      vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
        // Simulate script load
        const script = el as unknown as typeof mockScript;
        setTimeout(() => script.onload?.(), 0);
        return el;
      });

      await loadPyodide();
      expect(isPyodideLoaded()).toBe(true);
    });

    it('returns early if already loaded', async () => {
      // Set up Pyodide as already loaded
      const mockPyodide = {
        runPythonAsync: vi.fn().mockResolvedValue('result'),
        setStdout: vi.fn(),
        setStderr: vi.fn(),
      };

      const mockLoad = vi.fn().mockResolvedValue(mockPyodide);
      vi.stubGlobal('loadPyodide', mockLoad);
      const mockScript = {
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockScript as unknown as HTMLElement);
      vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
        const script = el as unknown as typeof mockScript;
        setTimeout(() => script.onload?.(), 0);
        return el;
      });

      await loadPyodide();
      await loadPyodide(); // Second call should be a no-op
      expect(mockLoad).toHaveBeenCalledTimes(1);
    });
  });

  describe('runPython with mock pyodide', () => {
    it('runs code and captures stdout', async () => {
      const mockPyodide = {
        runPythonAsync: vi.fn().mockResolvedValue(undefined),
        setStdout: vi.fn().mockImplementation(({ batched }: { batched: (s: string) => void }) => {
          batched('hello world');
        }),
        setStderr: vi.fn(),
      };

      const mockLoad = vi.fn().mockResolvedValue(mockPyodide);
      vi.stubGlobal('loadPyodide', mockLoad);
      const mockScript = {
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockScript as unknown as HTMLElement);
      vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
        const script = el as unknown as typeof mockScript;
        setTimeout(() => script.onload?.(), 0);
        return el;
      });

      await loadPyodide();
      const result = await runPython('print("hello world")');
      expect(result.stdout).toBe('hello world');
      expect(result.error).toBeUndefined();
    });

    it('captures Python errors', async () => {
      const pythonError = new Error('NameError: name x is not defined');
      pythonError.name = 'PythonError';

      const mockPyodide = {
        runPythonAsync: vi.fn().mockRejectedValue(pythonError),
        setStdout: vi.fn(),
        setStderr: vi.fn(),
      };

      const mockLoad = vi.fn().mockResolvedValue(mockPyodide);
      vi.stubGlobal('loadPyodide', mockLoad);
      const mockScript = {
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockScript as unknown as HTMLElement);
      vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
        const script = el as unknown as typeof mockScript;
        setTimeout(() => script.onload?.(), 0);
        return el;
      });

      await loadPyodide();
      const result = await runPython('x');
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('PythonError');
    });
  });

  describe('resetPyodide', () => {
    it('resets state so isPyodideLoaded returns false', () => {
      resetPyodide();
      expect(isPyodideLoaded()).toBe(false);
    });
  });
});
